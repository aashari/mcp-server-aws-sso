/**
 * AWS SSO auth service
 */
import { Logger } from '../utils/logger.util.js';
import { createAuthMissingError } from '../utils/error.util.js';
import * as config from '../utils/config.util.js';
import * as transport from '../utils/transport.util.js';
import * as ssoCache from '../utils/aws.sso.cache.util.js';
import { AwsSsoConfig, AwsSsoAuthResult } from './vendor.aws.sso.types.js';

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

const logger = Logger.forContext('services/aws.sso.auth.service.ts');

const SSO_OIDC_API_PATH = 'https://oidc.%region%.amazonaws.com';

/**
 * Get AWS SSO configuration from environment
 */
export async function getAwsSsoConfig(): Promise<AwsSsoConfig> {
	const methodLogger = logger.forMethod('getAwsSsoConfig');
	methodLogger.debug('Getting AWS SSO configuration');

	const startUrl = config.get('AWS_SSO_START_URL');
	const region = config.get('AWS_REGION') || 'us-east-1';

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
 * Start AWS SSO device authorization flow
 */
export async function startSsoLogin(): Promise<{
	verificationUriComplete: string;
	verificationUri: string;
	userCode: string;
	deviceCode: string;
	expiresIn: number;
	interval: number;
}> {
	const methodLogger = logger.forMethod('startSsoLogin');
	methodLogger.debug('Starting AWS SSO login process');

	// Get SSO configuration
	const { startUrl, region } = await getAwsSsoConfig();

	// Step 1: Register client
	const registerEndpoint = `${SSO_OIDC_API_PATH.replace(
		'%region%',
		region,
	)}/client/register`;
	const registerResponse = await transport.post<{
		clientId: string;
		clientSecret: string;
		expiresAt: string;
	}>(registerEndpoint, {
		clientName: 'aws-cli',
		clientType: 'public',
	});

	methodLogger.debug('Client registered successfully', {
		clientId: registerResponse.clientId,
	});

	// Step 2: Start device authorization
	const authEndpoint = `${SSO_OIDC_API_PATH.replace(
		'%region%',
		region,
	)}/device_authorization`;
	const authResponse = await transport.post<{
		deviceCode: string;
		userCode: string;
		verificationUri: string;
		verificationUriComplete: string;
		expiresIn: number;
		interval: number;
	}>(authEndpoint, {
		clientId: registerResponse.clientId,
		clientSecret: registerResponse.clientSecret,
		startUrl,
	});

	methodLogger.debug('Device authorization started', {
		verificationUri: authResponse.verificationUri,
		expiresIn: authResponse.expiresIn,
	});

	// Store device authorization info in cache for later polling
	await ssoCache.cacheDeviceAuthorizationInfo({
		clientId: registerResponse.clientId,
		clientSecret: registerResponse.clientSecret,
		deviceCode: authResponse.deviceCode,
		expiresIn: authResponse.expiresIn,
		region,
	});

	return authResponse;
}

/**
 * Poll for SSO token completion
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

	// Poll token endpoint
	const tokenEndpoint = `${SSO_OIDC_API_PATH.replace(
		'%region%',
		deviceInfo.region,
	)}/token`;

	try {
		const tokenResponse = await transport.post<{
			access_token: string;
			refresh_token: string;
			token_type: string;
			expires_in: number;
		}>(tokenEndpoint, {
			clientId: deviceInfo.clientId,
			clientSecret: deviceInfo.clientSecret,
			deviceCode: deviceInfo.deviceCode,
			grantType: 'urn:ietf:params:oauth:grant-type:device_code',
		});

		methodLogger.debug('SSO token retrieved successfully');

		// Calculate token expiration time
		const now = Math.floor(Date.now() / 1000);
		const authResult: AwsSsoAuthResult = {
			accessToken: tokenResponse.access_token,
			expiresAt: now + tokenResponse.expires_in,
			region: deviceInfo.region,
		};

		// Save token to cache for future use
		await ssoCache.saveSsoToken({
			accessToken: tokenResponse.access_token,
			expiresIn: tokenResponse.expires_in,
			refreshToken: tokenResponse.refresh_token,
			tokenType: tokenResponse.token_type,
			retrievedAt: now,
			expiresAt: now + tokenResponse.expires_in,
			region: deviceInfo.region,
		});

		return authResult;
	} catch (error) {
		// Check if user hasn't completed login yet
		if (
			error instanceof Error &&
			error.message.includes('authorization_pending')
		) {
			methodLogger.debug(
				'Authorization pending, user has not completed login yet',
			);
			throw new Error(
				'Authorization pending. Please complete the login in your browser.',
			);
		}
		throw error;
	}
}

/**
 * Check if user is authenticated
 */
export async function checkSsoAuthStatus(): Promise<{
	isAuthenticated: boolean;
	errorMessage?: string;
}> {
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
