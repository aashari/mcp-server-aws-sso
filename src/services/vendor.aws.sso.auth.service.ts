import { Logger } from '../utils/logger.util.js';
import { config } from '../utils/config.util.js';
import {
	createAuthMissingError,
	createAuthTimeoutError,
} from '../utils/error.util.js';
import * as ssoCache from '../utils/aws.sso.cache.util.js';
import { AwsSsoConfig, AwsSsoAuthResult } from './vendor.aws.sso.types.js';
import { getSsoOidcEndpoint } from '../utils/transport.util.js';

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
	const registerEndpoint = getSsoOidcEndpoint(region, '/client/register');
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
	const authEndpoint = getSsoOidcEndpoint(region, '/device_authorization');
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
			const tokenResponse = await post<TokenResponse>(tokenEndpoint, {
				clientId,
				clientSecret,
				deviceCode,
				grantType: 'urn:ietf:params:oauth:grant-type:device_code',
			});

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
			const ssoToken: AwsSsoAuthResult = {
				accessToken: accessToken as string,
				expiresAt,
				region,
			};

			// Cache the token
			await ssoCache.saveSsoToken({
				accessToken: accessToken as string,
				expiresAt,
				region,
				tokenType: tokenType as string,
				retrievedAt: Math.floor(Date.now() / 1000),
				expiresIn: expiresIn as number,
				refreshToken: (refreshToken as string) || '',
			});

			methodLogger.debug('Successfully obtained SSO token');
			return ssoToken;
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
