import { Logger } from '../utils/logger.util.js';
import { configLoader } from '../utils/config.util.js';
import {
	createAuthMissingError,
	createAuthTimeoutError,
} from '../utils/error.util.js';
import * as ssoCache from '../utils/aws.sso.cache.util.js';
import { AwsSsoConfig, AwsSsoAuthResult } from './vendor.aws.sso.types.js';

/**
 * Device authorization information
 */
interface DeviceAuthorizationInfo {
	/**
	 * The client ID for SSO
	 */
	clientId: string;

	/**
	 * The client secret for SSO
	 */
	clientSecret: string;

	/**
	 * The device code for SSO
	 */
	deviceCode: string;

	/**
	 * The expiration time in seconds
	 */
	expiresIn: number;

	/**
	 * The AWS region for SSO
	 */
	region: string;
}

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
 * Base API paths for AWS SSO APIs
 * @constant {string}
 */
const SSO_OIDC_API_PATH = 'https://oidc.%region%.amazonaws.com';

/**
 * Make a POST request to a URL with JSON body
 * @param url The URL to post to
 * @param data The data to send in the request body
 * @returns The JSON response
 */
async function post<T>(url: string, data: Record<string, unknown>): Promise<T> {
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		throw new Error(
			`Request failed with status ${response.status}: ${await response.text()}`,
		);
	}

	return (await response.json()) as T;
}

/**
 * Client registration response
 */
interface ClientRegistrationResponse {
	clientId: string;
	clientSecret: string;
	expiresAt: string;
}

/**
 * Device authorization response
 */
interface DeviceAuthorizationResponse {
	deviceCode: string;
	userCode: string;
	verificationUri: string;
	verificationUriComplete: string;
	expiresIn: number;
	interval: number;
}

/**
 * Token response
 */
interface TokenResponse {
	accessToken?: string;
	access_token?: string;
	refreshToken?: string;
	refresh_token?: string;
	tokenType?: string;
	token_type?: string;
	expires_in?: number;
	expiresIn?: number;
}

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

	const startUrl = configLoader.get('AWS_SSO_START_URL');
	// Check AWS_SSO_REGION first, then fallback to AWS_REGION, then default to us-east-1
	const region =
		configLoader.get('AWS_SSO_REGION') ||
		configLoader.get('AWS_REGION') ||
		'us-east-1';

	if (!startUrl) {
		const error = createAuthMissingError(
			'AWS_SSO_START_URL environment variable is required',
		);
		methodLogger.error('Missing AWS SSO configuration', error);
		throw error;
	}

	methodLogger.debug('AWS SSO configuration retrieved', {
		startUrl,
		region,
	});

	return { startUrl, region };
}

/**
 * Start the AWS SSO login process
 *
 * Initiates the SSO login flow by registering a client and starting device authorization.
 * Returns a verification URI and user code that the user must visit to complete authentication.
 *
 * @returns {Promise<DeviceAuthorizationResponse>} Login information including verification URI and user code
 * @throws {Error} If login initialization fails
 */
export async function startSsoLogin(): Promise<DeviceAuthorizationResponse> {
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
	const registerEndpoint = `${SSO_OIDC_API_PATH.replace(
		'%region%',
		region,
	)}/client/register`;
	const registerResponse = await post<ClientRegistrationResponse>(
		registerEndpoint,
		{
			clientName: 'mcp-aws-sso',
			clientType: 'public',
		},
	);

	methodLogger.debug('Client registered successfully', {
		clientId: registerResponse.clientId,
	});

	// Step 2: Start device authorization
	const authEndpoint = `${SSO_OIDC_API_PATH.replace(
		'%region%',
		region,
	)}/device_authorization`;
	const authResponse = await post<DeviceAuthorizationResponse>(authEndpoint, {
		clientId: registerResponse.clientId,
		clientSecret: registerResponse.clientSecret,
		startUrl,
	});

	// Log entire response for debugging
	methodLogger.debug('Device authorization started', {
		verificationUri: authResponse.verificationUri,
		verificationUriComplete: authResponse.verificationUriComplete,
		userCode: authResponse.userCode,
		expiresIn: authResponse.expiresIn,
	});

	// Store device authorization info in cache for later polling
	await ssoCache.cacheDeviceAuthorizationInfo({
		clientId: registerResponse.clientId,
		clientSecret: registerResponse.clientSecret,
		deviceCode: authResponse.deviceCode,
		expiresIn: authResponse.expiresIn,
		interval: authResponse.interval,
		region,
	});

	return authResponse;
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

	// Setup polling parameters
	const tokenEndpoint = `${SSO_OIDC_API_PATH.replace(
		'%region%',
		deviceInfo.region,
	)}/token`;

	// Setup polling limits
	const startTime = Math.floor(Date.now() / 1000);
	const expiresAt = startTime + deviceInfo.expiresIn;
	const interval = deviceInfo.interval || 1; // Default to 1 second if not specified
	methodLogger.debug(
		`Will poll for up to ${deviceInfo.expiresIn} seconds with ${interval} second intervals`,
	);

	// Poll for token until success or timeout
	while (Math.floor(Date.now() / 1000) < expiresAt) {
		try {
			// Try to request a token
			const tokenResponse = await post<TokenResponse>(tokenEndpoint, {
				clientId: deviceInfo.clientId,
				clientSecret: deviceInfo.clientSecret,
				deviceCode: deviceInfo.deviceCode,
				grantType: 'urn:ietf:params:oauth:grant-type:device_code',
			});

			methodLogger.debug('SSO token retrieved successfully');
			methodLogger.debug('Raw token response received', {
				responseKeys: Object.keys(tokenResponse),
				responseStringified:
					JSON.stringify(tokenResponse).substring(0, 100) + '...',
			});

			// Handle potential variations in response format
			const accessToken =
				tokenResponse.access_token || tokenResponse.accessToken || '';
			const tokenType =
				tokenResponse.token_type || tokenResponse.tokenType || 'Bearer';
			const expiresIn =
				tokenResponse.expires_in || tokenResponse.expiresIn || 3600;

			// Debug log
			methodLogger.debug('Extracted token information', {
				hasAccessToken: !!accessToken,
				accessTokenLength: accessToken?.length || 0,
				tokenType,
				expiresIn,
			});

			// Verify we actually got an access token
			if (!accessToken || accessToken.trim() === '') {
				methodLogger.error(
					'No access token in response: ' +
						JSON.stringify(tokenResponse).substring(0, 300),
				);
				throw new Error('No access token returned from AWS SSO');
			}

			// Calculate token expiration time (convert to seconds if not already)
			const now = Math.floor(Date.now() / 1000); // Current time in seconds
			const expiresAt = now + expiresIn;

			try {
				const expirationDate = new Date(expiresAt * 1000);
				methodLogger.debug('Token expiration calculated', {
					now,
					expiresIn,
					expiresAt,
					expirationDate: expirationDate.toISOString(),
					accessTokenLength: accessToken.length,
					accessTokenStart: accessToken.substring(0, 5),
				});
			} catch (error) {
				// If we can't format the date, just log the numeric values
				methodLogger.debug('Token expiration calculated (raw values)', {
					now,
					expiresIn,
					expiresAt,
					accessTokenLength: accessToken.length,
					error:
						error instanceof Error ? error.message : String(error),
				});
			}

			// Once we successfully get a token, clear the device auth info
			// This is important to prevent reusing old device codes
			try {
				await ssoCache.clearDeviceAuthorizationInfo();
			} catch (error) {
				methodLogger.error('Failed to clear device auth info', error);
				// Continue anyway
			}

			// Create the auth result object with the specific format needed by AWS SDK
			const authResult: AwsSsoAuthResult = {
				accessToken: accessToken,
				expiresAt: expiresAt,
				region: deviceInfo.region,
			};

			// Log auth result (without full token)
			methodLogger.debug('Auth result details:', {
				accessTokenLength: authResult.accessToken.length,
				accessTokenStart: authResult.accessToken.substring(0, 5),
				expiresAt: authResult.expiresAt,
				region: authResult.region,
			});

			// Cache the token, ensuring we include all required fields
			await ssoCache.saveSsoToken({
				accessToken: accessToken,
				expiresAt: expiresAt,
				region: deviceInfo.region,
				tokenType: tokenType,
				retrievedAt: now,
				expiresIn: expiresIn,
				refreshToken:
					tokenResponse.refresh_token ||
					tokenResponse.refreshToken ||
					'',
			});

			return authResult;
		} catch (error) {
			// If it's a 'still waiting' error, that's expected - retry after interval
			if (
				error &&
				typeof error === 'object' &&
				'message' in error &&
				typeof error.message === 'string' &&
				(error.message.includes('authorization_pending') ||
					error.message.includes('slow_down'))
			) {
				methodLogger.debug(
					'Authorization pending, waiting to retry...',
				);
				// Wait for the polling interval before trying again
				await new Promise((resolve) =>
					setTimeout(resolve, interval * 1000),
				);
				continue;
			}

			// Any other error is unexpected and should be thrown
			methodLogger.error('Error polling for SSO token', error);
			throw createAuthTimeoutError(
				`AWS SSO authentication failed: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			);
		}
	}

	// If we get here, it means we've timed out waiting for the authorization
	methodLogger.error('Timed out waiting for AWS SSO authorization');
	throw createAuthTimeoutError(
		'AWS SSO authentication timed out. Please try again.',
	);
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
