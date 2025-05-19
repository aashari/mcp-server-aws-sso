import { Logger } from '../utils/logger.util.js';
import { config } from '../utils/config.util.js';
import {
	createAuthMissingError,
	createAuthTimeoutError,
	createApiError,
	createAuthSlowDownError,
	createAuthDeniedError,
	createAuthInvalidError,
} from '../utils/error.util.js';
import * as ssoCache from '../utils/aws.sso.cache.util.js';
import {
	AwsSsoConfig,
	AwsSsoConfigSchema,
	AwsSsoAuthResult,
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
	const methodLogger = logger.forMethod('post');
	methodLogger.debug(`Making POST request to ${url}`);

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
				let errorBody: string | Record<string, unknown> =
					await fetchResponse.text();

				// Try to parse the error response as JSON
				try {
					errorBody = JSON.parse(errorBody as string);
					methodLogger.debug('Received error response from API', {
						status: fetchResponse.status,
						errorBody,
					});
				} catch {
					// If parsing fails, keep the text version
					methodLogger.debug('Received non-JSON error response', {
						status: fetchResponse.status,
						errorBody,
					});
				}

				// Create an error object with status and detailed information
				// Include OIDC-specific error fields like 'error' and 'error_description'
				type OidcErrorWithMetadata = Error & {
					$metadata: { httpStatusCode: number };
					error?: string;
					error_description?: string;
					originalResponse?: Record<string, unknown> | string;
				};

				const error = new Error(
					typeof errorBody === 'object' && errorBody.error_description
						? String(errorBody.error_description)
						: `Request failed with status ${fetchResponse.status}`,
				) as OidcErrorWithMetadata;

				error.$metadata = { httpStatusCode: fetchResponse.status };

				// Add OIDC-specific error details if available
				if (typeof errorBody === 'object') {
					if (errorBody.error) {
						error.error = String(errorBody.error);
					}
					if (errorBody.error_description) {
						error.error_description = String(
							errorBody.error_description,
						);
					}
				}

				// Store the original response for more context
				error.originalResponse = errorBody;

				methodLogger.error(
					`API request failed: ${error.message}`,
					error,
				);
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

					// Also retry on slow_down OIDC errors
					if ('error' in error && error.error === 'slow_down') {
						return true;
					}
				}
				return false;
			},
			// Increase backoff for OIDC slow_down errors
			initialDelayMs: 2000,
			maxRetries: 8,
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
 * Continuously polls the SSO token endpoint until authentication is complete or times out.
 * Automatically applies appropriate backoff between retries based on the device authorization interval.
 *
 * @returns {Promise<AwsSsoAuthResult>} AWS SSO auth result with access token
 * @throws {Error} If polling times out or auth is denied
 */
export async function pollForSsoToken(): Promise<AwsSsoAuthResult> {
	const methodLogger = logger.forMethod('pollForSsoToken');
	methodLogger.debug('Starting polling for SSO token');

	// Get the device authorization info for polling
	const deviceInfo = await getCachedDeviceAuthorizationInfo();
	if (!deviceInfo) {
		const error = createAuthMissingError(
			'No device authorization information found for polling',
		);
		methodLogger.error('Device authorization info missing', error);
		throw error;
	}

	// Create a timestamp for when the auth flow expires
	const startTime = Math.floor(Date.now() / 1000);
	const expiresAt = startTime + deviceInfo.expiresIn;

	// Use the interval from the device auth flow or default to 5 seconds
	// This is the recommended polling interval from AWS SSO
	const pollingIntervalSeconds = deviceInfo.interval || 5;

	methodLogger.debug('Poll settings', {
		clientId: deviceInfo.clientId,
		startTime,
		expiresAt,
		expiresIn: deviceInfo.expiresIn,
		pollingInterval: pollingIntervalSeconds,
	});

	// Prepare the token request parameters
	const ssoConfig = await getAwsSsoConfig();
	const oidcEndpoint = getSsoOidcEndpoint(ssoConfig.region, '/token');

	// Poll until successful or timeout
	let consecutiveSlowDownErrors = 0;
	let consecutiveAuthPendingErrors = 0;
	let currentPollingInterval = pollingIntervalSeconds;
	let lastErrorReceived:
		| Error
		| { error?: string; error_description?: string }
		| Record<string, unknown>
		| undefined = undefined;

	while (true) {
		const now = Math.floor(Date.now() / 1000);

		// Check if we've exceeded the expiration time
		if (now > expiresAt) {
			const error = createAuthTimeoutError(
				'Device authorization timed out. Please try again.',
			);
			methodLogger.error('Device authorization timed out', error);

			// Clear any pending device authorization data
			try {
				await ssoCache.clearDeviceAuthorizationInfo();
				methodLogger.debug(
					'Cleared stale device authorization data due to timeout',
				);
			} catch (clearError) {
				methodLogger.error(
					'Error clearing device auth data on timeout',
					clearError,
				);
			}

			throw error;
		}

		try {
			methodLogger.debug('Polling for token...');

			// Make the token request
			const tokenResponse = await post(`${oidcEndpoint}`, {
				clientId: deviceInfo.clientId,
				clientSecret: deviceInfo.clientSecret,
				deviceCode: deviceInfo.deviceCode,
				grantType: 'urn:ietf:params:oauth:grant-type:device_code',
			});

			// Validate the response
			try {
				const parsed = TokenResponseSchema.parse(tokenResponse);

				// Extract the access token - different APIs use different property names
				const accessToken = parsed.accessToken || parsed.access_token;
				const refreshToken =
					parsed.refreshToken || parsed.refresh_token;
				const tokenType = parsed.tokenType || parsed.token_type;
				const expiresIn = parsed.expiresIn || parsed.expires_in;

				if (!accessToken) {
					throw new Error('Access token is missing from response');
				}

				// Calculate expiration
				const tokenExpiresAt =
					Math.floor(Date.now() / 1000) + (expiresIn ?? 28800); // Default to 8 hours

				// Create the auth result
				const authResult: AwsSsoAuthResult = {
					accessToken,
					expiresAt: tokenExpiresAt,
					region: ssoConfig.region,
				};

				// Save the token to cache
				await ssoCache.saveSsoToken({
					accessToken,
					expiresAt: tokenExpiresAt,
					region: ssoConfig.region,
					refreshToken: (refreshToken as string) || '',
					tokenType: (tokenType as string) || 'Bearer',
					expiresIn: expiresIn as number,
					retrievedAt: Math.floor(Date.now() / 1000),
				});

				methodLogger.debug('Successfully retrieved SSO token', {
					tokenType,
					expiresIn,
					expiresAt: tokenExpiresAt,
				});

				return authResult;
			} catch (validationError) {
				methodLogger.error(
					'Error validating token response',
					validationError,
				);
				throw createApiError(
					'Invalid token response received',
					undefined,
					validationError,
				);
			}
		} catch (error) {
			// Track the error for backoff logic
			lastErrorReceived = error as
				| Error
				| { error?: string; error_description?: string }
				| Record<string, unknown>;

			// Handle specific error types for polling
			if (error && typeof error === 'object') {
				// Handle authorization_pending - this is normal during polling
				if (
					'error' in error &&
					error.error === 'authorization_pending'
				) {
					consecutiveAuthPendingErrors++;
					methodLogger.debug(
						`Authorization is still pending... (${consecutiveAuthPendingErrors})`,
					);

					// If we've been getting authorization_pending for a while (e.g., 30 seconds),
					// the authentication flow might be stale
					if (consecutiveAuthPendingErrors >= 30) {
						methodLogger.warn(
							`Authorization pending for too long (${consecutiveAuthPendingErrors} consecutive errors). Clearing device authorization data.`,
						);

						// Clear any pending device authorization data
						try {
							await ssoCache.clearDeviceAuthorizationInfo();
							methodLogger.debug(
								'Cleared stale device authorization data',
							);

							// Also consider clearing the token
							await ssoCache.clearSsoToken();
							methodLogger.debug('Cleared SSO token cache');

							throw createAuthTimeoutError(
								'Authorization pending for too long. Device authorization data has been cleared. Please try again.',
								error,
							);
						} catch (clearError) {
							methodLogger.error(
								'Error clearing authorization data',
								clearError,
							);
							// Continue polling even if cleanup fails
						}
					}
					// This is expected - continue polling
				}
				// Handle slow_down errors by increasing the interval
				else if ('error' in error && error.error === 'slow_down') {
					consecutiveSlowDownErrors++;
					// Increase polling interval on slow_down responses
					currentPollingInterval = Math.min(
						currentPollingInterval * 2,
						30,
					);
					methodLogger.debug(
						`Received slow_down error (${consecutiveSlowDownErrors}), increasing polling interval`,
						{ newInterval: currentPollingInterval },
					);

					// If we get too many consecutive slow_down errors, throw a typed error
					if (consecutiveSlowDownErrors >= 3) {
						// Clear device authorization data on too many slow_down errors
						try {
							await ssoCache.clearDeviceAuthorizationInfo();
							methodLogger.debug(
								'Cleared device authorization data due to rate limiting',
							);
						} catch (clearError) {
							methodLogger.error(
								'Error clearing device auth data on rate limit',
								clearError,
							);
						}

						throw createAuthSlowDownError(
							'Authentication is being rate limited. The server has requested to slow down polling.',
							error,
						);
					}
				}
				// Handle access_denied - user denied the authorization
				else if ('error' in error && error.error === 'access_denied') {
					// Clean up device authorization data
					try {
						await ssoCache.clearDeviceAuthorizationInfo();
						methodLogger.debug(
							'Cleared device authorization data after access_denied',
						);
					} catch (clearError) {
						methodLogger.error(
							'Error clearing device auth data after access_denied',
							clearError,
						);
					}

					throw createAuthDeniedError(
						'Authentication was denied by the user or system',
						error,
					);
				}
				// Handle expired_token - the device code has expired
				else if ('error' in error && error.error === 'expired_token') {
					// Clean up device authorization data
					try {
						await ssoCache.clearDeviceAuthorizationInfo();
						methodLogger.debug(
							'Cleared device authorization data after token expiration',
						);
					} catch (clearError) {
						methodLogger.error(
							'Error clearing device auth data after token expiration',
							clearError,
						);
					}

					throw createAuthTimeoutError(
						'Authentication session has expired. Please restart the login process.',
						error,
					);
				}
				// Handle other OIDC errors with more context
				else if ('error' in error && 'error_description' in error) {
					methodLogger.error('OIDC error during polling', error);

					// Clean up device authorization data for any OIDC error
					try {
						await ssoCache.clearDeviceAuthorizationInfo();
						methodLogger.debug(
							'Cleared device authorization data due to OIDC error',
						);
					} catch (clearError) {
						methodLogger.error(
							'Error clearing device auth data on OIDC error',
							clearError,
						);
					}

					throw createAuthInvalidError(
						`Authentication error: ${error.error_description || error.error}`,
						error,
					);
				}
				// Handle unexpected errors during polling
				else {
					methodLogger.error(
						'Unexpected error during polling',
						error,
					);
					throw error;
				}
			} else {
				// Handle non-object errors
				methodLogger.error('Unexpected error during polling', error);
				throw error;
			}
		}

		// If we're here, we need to continue polling
		// Reset consecutive slow_down counter if we didn't get that error
		if (
			lastErrorReceived === undefined ||
			lastErrorReceived?.error !== 'slow_down'
		) {
			consecutiveSlowDownErrors = 0;
		}

		// Reset consecutive auth_pending counter if we didn't get that error
		if (
			lastErrorReceived === undefined ||
			lastErrorReceived?.error !== 'authorization_pending'
		) {
			consecutiveAuthPendingErrors = 0;
		}

		// Wait for the polling interval before trying again
		methodLogger.debug(
			`Waiting ${currentPollingInterval}s before next poll...`,
		);
		await new Promise((resolve) =>
			setTimeout(resolve, currentPollingInterval * 1000),
		);
	}
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
