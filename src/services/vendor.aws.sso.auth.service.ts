import { Logger } from '../utils/logger.util.js';
import { config } from '../utils/config.util.js';
import {
	createAuthMissingError,
	createAuthTimeoutError,
	createApiError,
} from '../utils/error.util.js';
import * as ssoCache from '../utils/aws.sso.cache.util.js';
import {
	AwsSsoConfig,
	AwsSsoConfigSchema,
	AwsSsoAuthResult,
	SsoToken,
	SsoTokenSchema,
	DeviceAuthorizationInfo,
	DeviceAuthorizationInfoSchema,
} from './vendor.aws.sso.types.js';
import { getSsoOidcEndpoint } from '../utils/transport.util.js';
import { withRetry } from '../utils/retry.util.js';
import { z } from 'zod';

/**
 * Auth check result
 */
export interface AuthCheckResult {
	/**
	 * Whether the user is authenticated
	 */
	isAuthenticated: boolean;

	/**
	 * Error message if authentication failed
	 */
	errorMessage?: string;
}

const logger = Logger.forContext('services/vendor.aws.sso.auth.service.ts');

/**
 * Make a POST request to a URL with JSON body
 * @param url The URL to post to
 * @param data The data to send in the request body
 * @returns The JSON response
 */
async function post<T>(url: string, data: Record<string, unknown>): Promise<T> {
	// Use the retry mechanism for handling potential 429 errors
	const response = await withRetry(
		async () => {
			const fetchResponse = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!fetchResponse.ok) {
				// Create an error object with status information for our retry logic
				type FetchErrorWithMetadata = Error & {
					$metadata: { httpStatusCode: number };
				};

				const error = new Error(
					`Request failed with status ${fetchResponse.status}: ${await fetchResponse.text()}`,
				) as FetchErrorWithMetadata;

				error.$metadata = { httpStatusCode: fetchResponse.status };
				throw error;
			}

			return fetchResponse;
		},
		{
			// Define custom retry condition for fetch responses
			retryCondition: (error: unknown) => {
				// Default retry on 429 responses
				if (error && typeof error === 'object') {
					if (
						'$metadata' in error &&
						typeof error.$metadata === 'object'
					) {
						const metadata = error.$metadata as {
							httpStatusCode?: number;
						};
						return metadata.httpStatusCode === 429;
					}
				}
				return false;
			},
		},
	);

	return (await response.json()) as T;
}

/**
 * Zod schema for client registration response
 */
const ClientRegistrationResponseSchema = z.object({
	clientId: z.string(),
	clientSecret: z.string(),
	expiresAt: z.string().optional(),
});

/**
 * Zod schema for device authorization response
 */
const DeviceAuthorizationResponseSchema = z.object({
	deviceCode: z.string(),
	userCode: z.string(),
	verificationUri: z.string(),
	verificationUriComplete: z.string(),
	expiresIn: z.number(),
	interval: z.number(),
});

/**
 * Zod schema for token response
 */
const TokenResponseSchema = z.object({
	accessToken: z.string().optional(),
	access_token: z.string().optional(),
	refreshToken: z.string().optional().nullable(),
	refresh_token: z.string().optional().nullable(),
	tokenType: z.string().optional(),
	token_type: z.string().optional(),
	expires_in: z.number().optional(),
	expiresIn: z.number().optional(),
});

/**
 * Get AWS SSO configuration from the environment
 *
 * Retrieves the AWS SSO start URL and region from the environment variables.
 * These are required for SSO authentication.
 *
 * @returns {AwsSsoConfig} AWS SSO configuration
 * @throws {Error} If AWS SSO configuration is missing
 */
export async function getAwsSsoConfig(): Promise<AwsSsoConfig> {
	const methodLogger = logger.forMethod('getAwsSsoConfig');
	methodLogger.debug('Getting AWS SSO configuration');

	const startUrl = config.get('AWS_SSO_START_URL');
	// Check AWS_SSO_REGION first, then fallback to AWS_REGION, then default to us-east-1
	const region =
		config.get('AWS_SSO_REGION') || config.get('AWS_REGION') || 'us-east-1';

	if (!startUrl) {
		const error = createAuthMissingError(
			'AWS_SSO_START_URL environment variable is required',
		);
		methodLogger.error('Missing AWS SSO configuration', error);
		throw error;
	}

	// Validate config with Zod schema
	try {
		const validatedConfig = AwsSsoConfigSchema.parse({ startUrl, region });

		methodLogger.debug('AWS SSO configuration retrieved', validatedConfig);
		return validatedConfig;
	} catch (error) {
		if (error instanceof z.ZodError) {
			methodLogger.error('Invalid AWS SSO configuration', error);
			throw createApiError(
				`Invalid AWS SSO configuration: ${error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')}`,
				undefined,
				error,
			);
		}
		throw error;
	}
}

/**
 * Start the AWS SSO login process
 *
 * Initiates the SSO login flow by registering a client and starting device authorization.
 * Returns a verification URI and user code that the user must visit to complete authentication.
 *
 * @returns {Promise<DeviceAuthorizationResponseSchema['_output']>} Login information including verification URI and user code
 * @throws {Error} If login initialization fails
 */
export async function startSsoLogin(): Promise<
	z.infer<typeof DeviceAuthorizationResponseSchema>
> {
	const methodLogger = logger.forMethod('startSsoLogin');
	methodLogger.debug('Starting AWS SSO login process');

	try {
		// First, clean up any existing device authorization to ensure we get fresh codes
		await ssoCache.clearDeviceAuthorizationInfo();
	} catch (error) {
		methodLogger.debug('Error clearing existing device auth info', error);
		// Continue even if cleanup fails
	}

	// Get SSO configuration
	const { startUrl, region } = await getAwsSsoConfig();

	// Step 1: Register client
	const registerEndpoint = getSsoOidcEndpoint(region, '/client/register');
	const registerResponseData = await post<Record<string, unknown>>(
		registerEndpoint,
		{
			clientName: 'mcp-aws-sso',
			clientType: 'public',
		},
	);

	// Validate with Zod schema
	try {
		const registerResponse =
			ClientRegistrationResponseSchema.parse(registerResponseData);

		methodLogger.debug('Client registered successfully', {
			clientId: registerResponse.clientId,
		});

		// Step 2: Start device authorization
		const authEndpoint = getSsoOidcEndpoint(
			region,
			'/device_authorization',
		);
		const authResponseData = await post<Record<string, unknown>>(
			authEndpoint,
			{
				clientId: registerResponse.clientId,
				clientSecret: registerResponse.clientSecret,
				startUrl,
			},
		);

		// Validate with Zod schema
		try {
			const authResponse =
				DeviceAuthorizationResponseSchema.parse(authResponseData);

			// Log entire response for debugging
			methodLogger.debug('Device authorization started', {
				verificationUri: authResponse.verificationUri,
				verificationUriComplete: authResponse.verificationUriComplete,
				userCode: authResponse.userCode,
				expiresIn: authResponse.expiresIn,
			});

			// Store device authorization info in cache for later polling
			const deviceAuthInfo: DeviceAuthorizationInfo = {
				clientId: registerResponse.clientId,
				clientSecret: registerResponse.clientSecret,
				deviceCode: authResponse.deviceCode,
				expiresIn: authResponse.expiresIn,
				interval: authResponse.interval,
				verificationUri: authResponse.verificationUri,
				verificationUriComplete: authResponse.verificationUriComplete,
				userCode: authResponse.userCode,
				region,
			};

			// Validate with Zod schema before caching
			DeviceAuthorizationInfoSchema.parse(deviceAuthInfo);

			await ssoCache.cacheDeviceAuthorizationInfo(deviceAuthInfo);

			return authResponse;
		} catch (error) {
			if (error instanceof z.ZodError) {
				methodLogger.error(
					'Invalid device authorization response',
					error,
				);
				throw createApiError(
					`Invalid response from AWS SSO device authorization: ${error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')}`,
					undefined,
					error,
				);
			}
			throw error;
		}
	} catch (error) {
		if (error instanceof z.ZodError) {
			methodLogger.error('Invalid client registration response', error);
			throw createApiError(
				`Invalid response from AWS SSO client registration: ${error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')}`,
				undefined,
				error,
			);
		}
		throw error;
	}
}

/**
 * Poll for SSO token completion
 *
 * Polls the AWS SSO token endpoint to check if the user has completed authentication.
 * Returns the SSO token if successful.
 *
 * @returns {Promise<AwsSsoAuthResult>} SSO token data
 * @throws {Error} If polling fails or user hasn't completed authentication yet
 */
export async function pollForSsoToken(): Promise<AwsSsoAuthResult> {
	const methodLogger = logger.forMethod('pollForSsoToken');
	methodLogger.debug('Polling for AWS SSO token');

	// Get device authorization info from cache
	const deviceInfo = await ssoCache.getCachedDeviceAuthorizationInfo();
	if (!deviceInfo) {
		const error = createAuthMissingError(
			'No pending SSO authorization. Please start a new login.',
		);
		methodLogger.error('No device authorization info found', error);
		throw error;
	}

	// Extract required info
	const {
		clientId,
		clientSecret,
		deviceCode,
		interval = 5, // Default to 5 seconds if not specified
		expiresIn,
		region,
	} = deviceInfo;

	// Calculate token expiration time
	const startTime = Date.now();
	const expirationTime = startTime + expiresIn * 1000;

	// Token endpoint
	const tokenEndpoint = getSsoOidcEndpoint(region, '/token');

	// Polling loop
	let lastPollTime = 0;
	while (Date.now() < expirationTime) {
		// Enforce minimum polling interval
		const timeSinceLastPoll = Date.now() - lastPollTime;
		if (timeSinceLastPoll < interval * 1000) {
			// Wait for remainder of interval
			const waitTime = interval * 1000 - timeSinceLastPoll;
			methodLogger.debug(
				`Waiting ${waitTime}ms before next poll attempt`,
			);
			await new Promise((resolve) => setTimeout(resolve, waitTime));
		}

		lastPollTime = Date.now();
		methodLogger.debug('Polling token endpoint');

		try {
			// Try to get the token
			const tokenResponseData = await post<Record<string, unknown>>(
				tokenEndpoint,
				{
					clientId,
					clientSecret,
					deviceCode,
					grantType: 'urn:ietf:params:oauth:grant-type:device_code',
				},
			);

			// Validate with Zod schema
			try {
				const tokenResponse =
					TokenResponseSchema.parse(tokenResponseData);

				// Process token response - handle both camelCase and snake_case responses
				// AWS seems to return a mix of these formats across different services
				const accessToken =
					tokenResponse.accessToken || tokenResponse.access_token;
				const refreshToken =
					tokenResponse.refreshToken || tokenResponse.refresh_token;
				const tokenType =
					tokenResponse.tokenType || tokenResponse.token_type;
				const expiresIn =
					tokenResponse.expiresIn || tokenResponse.expires_in;

				if (!accessToken) {
					throw new Error('No access token in response');
				}

				// Create token expiration time
				const expiresAt =
					Math.floor(Date.now() / 1000) + (expiresIn as number);

				// Create standardized token object
				const ssoToken: SsoToken = {
					accessToken: accessToken as string,
					expiresAt,
					region,
					refreshToken: (refreshToken as string) || '',
					tokenType: (tokenType as string) || 'Bearer',
					expiresIn: expiresIn as number,
					retrievedAt: Math.floor(Date.now() / 1000),
				};

				// Validate with Zod schema
				SsoTokenSchema.parse(ssoToken);

				// Create auth result object
				const authResult: AwsSsoAuthResult = {
					accessToken: accessToken as string,
					expiresAt,
					region,
				};

				// Cache the token
				await ssoCache.saveSsoToken(ssoToken);

				methodLogger.debug('Successfully obtained SSO token');
				return authResult;
			} catch (error) {
				if (error instanceof z.ZodError) {
					methodLogger.error('Invalid token response', error);
					throw createApiError(
						`Invalid response from AWS SSO token endpoint: ${error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')}`,
						undefined,
						error,
					);
				}
				throw error;
			}
		} catch (error: unknown) {
			// Check for "authorization pending" error
			// This is normal and expected until the user completes the flow
			if (
				error instanceof Error &&
				error.message &&
				error.message.includes('authorization_pending')
			) {
				methodLogger.debug(
					'Authorization still pending, will retry after interval',
				);
				continue;
			}

			// For any other error, log and throw
			methodLogger.error('Error polling for token', error);
			throw error;
		}
	}

	// If we reach here, the auth flow timed out
	const timeoutError = createAuthTimeoutError(
		'SSO authentication flow timed out. Please try again.',
	);
	methodLogger.error('Authentication flow timed out', timeoutError);
	throw timeoutError;
}

/**
 * Check if the user is authenticated with AWS SSO
 *
 * Verifies if a valid SSO token exists in the cache.
 *
 * @returns {Promise<AuthCheckResult>} Authentication status result
 */
export async function checkSsoAuthStatus(): Promise<AuthCheckResult> {
	const methodLogger = logger.forMethod('checkSsoAuthStatus');
	methodLogger.debug('Checking AWS SSO authentication status');

	try {
		// Get token from cache
		const token = await ssoCache.getCachedSsoToken();
		if (!token) {
			methodLogger.debug('No token found in cache');
			return {
				isAuthenticated: false,
				errorMessage: 'No SSO token found. Please login first.',
			};
		}

		// Check if token is expired
		const now = Math.floor(Date.now() / 1000);
		if (token.expiresAt <= now) {
			methodLogger.debug('Token is expired');
			return {
				isAuthenticated: false,
				errorMessage: 'SSO token is expired. Please login again.',
			};
		}

		methodLogger.debug('User is authenticated with valid token');
		return { isAuthenticated: true };
	} catch (error) {
		methodLogger.error('Error checking authentication status', error);
		return {
			isAuthenticated: false,
			errorMessage: `Error checking authentication: ${
				error instanceof Error ? error.message : String(error)
			}`,
		};
	}
}

/**
 * Get cached SSO token
 */
export async function getCachedSsoToken(): Promise<
	AwsSsoAuthResult | undefined
> {
	const methodLogger = logger.forMethod('getCachedSsoToken');
	methodLogger.debug('Getting cached SSO token');

	try {
		const token = await ssoCache.getCachedSsoToken();
		if (!token) {
			methodLogger.debug('No token found in cache');
			return undefined;
		}

		// Convert to auth result format
		const authResult: AwsSsoAuthResult = {
			accessToken: token.accessToken,
			expiresAt: token.expiresAt,
			region: token.region,
		};

		return authResult;
	} catch (error) {
		methodLogger.error('Error getting cached token', error);
		return undefined;
	}
}

/**
 * Get cached device authorization info
 * @returns Device authorization info from cache or undefined if not found
 */
export async function getCachedDeviceAuthorizationInfo(): Promise<
	DeviceAuthorizationInfo | undefined
> {
	const methodLogger = logger.forMethod('getCachedDeviceAuthorizationInfo');
	methodLogger.debug('Getting cached device authorization info');

	try {
		const deviceInfo = await ssoCache.getCachedDeviceAuthorizationInfo();
		if (!deviceInfo) {
			methodLogger.debug('No device authorization info found in cache');
			return undefined;
		}

		methodLogger.debug('Retrieved device authorization info from cache');
		return deviceInfo;
	} catch (error) {
		methodLogger.error(
			'Error getting cached device authorization info',
			error,
		);
		return undefined;
	}
}
