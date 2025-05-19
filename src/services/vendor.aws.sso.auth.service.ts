import { Logger } from '../utils/logger.util.js';
import {
	createAuthMissingError,
	createAuthTimeoutError,
} from '../utils/error.util.js';
import * as ssoCache from '../utils/aws.sso.cache.util.js';
import {
	AwsSsoAuthResult,
	DeviceAuthorizationInfo,
	DeviceAuthorizationInfoSchema,
} from './vendor.aws.sso.types.js';
import { z } from 'zod';

// Import the modular services
import { getAwsSsoConfig } from './vendor.aws.sso.auth.core.service.js';
import {
	registerClient,
	startDeviceAuthorization,
	pollForToken,
} from './vendor.aws.sso.auth.oauth.service.js';
import { DeviceAuthorizationResponseSchema } from './vendor.aws.sso.auth.http.js';

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
	const ssoConfig = await getAwsSsoConfig();

	// Step 1: Register client
	const clientInfo = await registerClient(ssoConfig);

	// Step 2: Start device authorization
	const authResponse = await startDeviceAuthorization(ssoConfig, clientInfo);

	// Store device authorization info in cache for later polling
	const deviceAuthInfo: DeviceAuthorizationInfo = {
		clientId: clientInfo.clientId,
		clientSecret: clientInfo.clientSecret,
		deviceCode: authResponse.deviceCode,
		expiresIn: authResponse.expiresIn,
		interval: authResponse.interval,
		verificationUri: authResponse.verificationUri,
		verificationUriComplete: authResponse.verificationUriComplete,
		userCode: authResponse.userCode,
		region: ssoConfig.region,
	};

	// Validate with Zod schema before caching
	DeviceAuthorizationInfoSchema.parse(deviceAuthInfo);

	await ssoCache.cacheDeviceAuthorizationInfo(deviceAuthInfo);

	return authResponse;
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

	// Prepare the client info
	const clientInfo = {
		clientId: deviceInfo.clientId,
		clientSecret: deviceInfo.clientSecret,
	};

	// Get SSO configuration
	const ssoConfig = await getAwsSsoConfig();

	// Poll until successful or timeout
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

		// Attempt to get a token
		const result = await pollForToken(
			ssoConfig,
			clientInfo,
			deviceInfo.deviceCode,
			pollingIntervalSeconds,
		);

		// If we get a result, return it
		if (result) {
			// Add missing properties if needed
			const fullResult: AwsSsoAuthResult = {
				...result,
				// Always set expiresAt if it's not already set
				expiresAt:
					result.expiresAt ||
					Math.floor(Date.now() / 1000) +
						('expiresIn' in result &&
						typeof result.expiresIn === 'number'
							? result.expiresIn
							: 28800),
				region: ssoConfig.region,
			};

			return fullResult;
		}

		// Wait before polling again
		methodLogger.debug(
			`Waiting ${pollingIntervalSeconds} seconds before polling again`,
		);
		await new Promise((resolve) =>
			setTimeout(resolve, pollingIntervalSeconds * 1000),
		);
	}
}

/**
 * Check SSO authentication status
 *
 * Verifies if there is a valid cached token.
 *
 * @returns {Promise<AuthCheckResult>} Authentication status including isAuthenticated flag
 */
export async function checkSsoAuthStatus(): Promise<AuthCheckResult> {
	const methodLogger = logger.forMethod('checkSsoAuthStatus');
	methodLogger.debug('Checking AWS SSO auth status');

	try {
		const cachedToken = await ssoCache.getCachedSsoToken();

		if (!cachedToken || !cachedToken.accessToken) {
			methodLogger.debug('No cached token found');
			return {
				isAuthenticated: false,
				errorMessage: 'No cached AWS SSO token found',
			};
		}

		// Check if token is expired
		if (
			cachedToken.expiresAt &&
			cachedToken.expiresAt <= Math.floor(Date.now() / 1000)
		) {
			methodLogger.debug('Cached token is expired');
			return {
				isAuthenticated: false,
				errorMessage: 'AWS SSO token is expired',
			};
		}

		methodLogger.debug('Valid cached token found');
		return { isAuthenticated: true };
	} catch (error) {
		methodLogger.error('Error checking auth status', error);
		return {
			isAuthenticated: false,
			errorMessage: `Error checking auth status: ${
				error instanceof Error ? error.message : String(error)
			}`,
		};
	}
}

/**
 * Get cached device authorization information
 *
 * @returns {Promise<DeviceAuthorizationInfo | undefined>} The cached device auth info or undefined if not found
 */
export async function getCachedDeviceAuthorizationInfo(): Promise<
	DeviceAuthorizationInfo | undefined
> {
	const methodLogger = logger.forMethod('getCachedDeviceAuthorizationInfo');
	methodLogger.debug('Getting cached device authorization info');

	return ssoCache.getCachedDeviceAuthorizationInfo();
}
