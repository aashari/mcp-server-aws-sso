import { Logger } from '../utils/logger.util.js';
import { createApiError } from '../utils/error.util.js';
import * as ssoCache from '../utils/aws.sso.cache.util.js';
import { AwsSsoAuthResult, AwsSsoConfig } from './vendor.aws.sso.types.js';
import {
	post,
	ClientRegistrationResponseSchema,
	DeviceAuthorizationResponseSchema,
	TokenResponseSchema,
} from './vendor.aws.sso.auth.http.js';
import { z } from 'zod';

const logger = Logger.forContext(
	'services/vendor.aws.sso.auth.oauth.service.ts',
);

// Remove unused schemas and types - comment them out for now
// const AuthErrorSchema = z.object({
// 	error: z.string(),
// 	error_description: z.string().optional(),
// });

// type AuthError = z.infer<typeof AuthErrorSchema>;

/**
 * Register an OIDC client with AWS SSO
 * @param ssoConfig The AWS SSO configuration
 * @returns The client registration response
 */
export async function registerClient(ssoConfig: AwsSsoConfig): Promise<{
	clientId: string;
	clientSecret: string;
}> {
	const methodLogger = logger.forMethod('registerClient');
	methodLogger.debug('Registering OIDC client', {
		startUrl: ssoConfig.startUrl,
		region: ssoConfig.region,
	});

	const registerUrl = `https://oidc.${ssoConfig.region}.amazonaws.com/client/register`;

	try {
		const response = await post(registerUrl, {
			clientName: 'MCP AWS SSO CLI',
			clientType: 'public',
			scopes: ['sso:account:access', 'sso-directory:user:read'],
			grantTypes: ['urn:ietf:params:oauth:grant-type:device_code'],
		});

		// Validate the response with Zod schema
		const validatedResponse =
			ClientRegistrationResponseSchema.parse(response);
		methodLogger.debug('Client registered successfully', {
			clientId: validatedResponse.clientId,
		});

		return {
			clientId: validatedResponse.clientId,
			clientSecret: validatedResponse.clientSecret,
		};
	} catch (error) {
		methodLogger.error('Failed to register OIDC client', error);
		throw createApiError(
			'Failed to register AWS SSO client',
			undefined,
			error,
		);
	}
}

/**
 * Start the device authorization flow for AWS SSO
 * @param ssoConfig The AWS SSO configuration
 * @param clientInfo The client information (id and secret) from registration
 * @returns The device authorization response
 */
export async function startDeviceAuthorization(
	ssoConfig: AwsSsoConfig,
	clientInfo: { clientId: string; clientSecret: string },
): Promise<z.infer<typeof DeviceAuthorizationResponseSchema>> {
	const methodLogger = logger.forMethod('startDeviceAuthorization');
	methodLogger.debug('Starting device authorization', {
		startUrl: ssoConfig.startUrl,
	});

	const authUrl = `https://oidc.${ssoConfig.region}.amazonaws.com/device_authorization`;

	try {
		const response = await post(authUrl, {
			clientId: clientInfo.clientId,
			clientSecret: clientInfo.clientSecret,
			startUrl: ssoConfig.startUrl,
		});

		// Validate the response with Zod schema
		const validatedResponse =
			DeviceAuthorizationResponseSchema.parse(response);
		methodLogger.debug('Device authorization started', {
			verificationUri: validatedResponse.verificationUri,
			userCode: validatedResponse.userCode,
		});

		return validatedResponse;
	} catch (error) {
		methodLogger.error('Failed to start device authorization', error);
		throw createApiError(
			'Failed to start AWS SSO device authorization',
			undefined,
			error,
		);
	}
}

/**
 * Poll for an OIDC token using the device code flow
 * @param ssoConfig The AWS SSO configuration
 * @param clientInfo The client information (id and secret) from registration
 * @param deviceCode The device code from the device authorization response
 * @param _interval The polling interval in seconds (unused but kept for API compatibility)
 * @returns The token response or null if authorization is still pending
 */
export async function pollForToken(
	ssoConfig: AwsSsoConfig,
	clientInfo: { clientId: string; clientSecret: string },
	deviceCode: string,
	_interval: number, // Prefix with underscore to indicate unused parameter
): Promise<AwsSsoAuthResult | null> {
	const methodLogger = logger.forMethod('pollForToken');
	methodLogger.debug('Polling for token');

	const tokenUrl = `https://oidc.${ssoConfig.region}.amazonaws.com/token`;

	try {
		const response = await post(tokenUrl, {
			grantType: 'urn:ietf:params:oauth:grant-type:device_code',
			deviceCode,
			clientId: clientInfo.clientId,
			clientSecret: clientInfo.clientSecret,
		});

		// Validate the response with Zod schema
		const validatedResponse = TokenResponseSchema.parse(response);
		methodLogger.debug('Token received');

		// Handle naming inconsistencies in the AWS API
		const tokenResponse: AwsSsoAuthResult = {
			accessToken:
				validatedResponse.accessToken ||
				validatedResponse.access_token ||
				'',
			refreshToken:
				validatedResponse.refreshToken ||
				validatedResponse.refresh_token ||
				null,
			expiresIn:
				validatedResponse.expiresIn ||
				validatedResponse.expires_in ||
				28800, // Default to 8 hours
			expiresAt:
				Math.floor(Date.now() / 1000) +
				(validatedResponse.expiresIn ||
					validatedResponse.expires_in ||
					28800),
		};

		// Cache the token
		await ssoCache.saveSsoToken({
			accessToken: tokenResponse.accessToken,
			expiresAt:
				Math.floor(Date.now() / 1000) +
				(tokenResponse.expiresIn || 28800),
			region: ssoConfig.region,
			refreshToken: tokenResponse.refreshToken || '',
			tokenType: 'Bearer',
			expiresIn: tokenResponse.expiresIn || 28800,
			retrievedAt: Math.floor(Date.now() / 1000),
		});

		return tokenResponse;
	} catch (error) {
		// Check if this is an authorization_pending error which is expected during polling
		if (
			error &&
			typeof error === 'object' &&
			'error' in error &&
			error.error === 'authorization_pending'
		) {
			methodLogger.debug('Authorization pending, will poll again');
			return null; // Signal that we should continue polling
		}

		// Check if this is a slow_down error
		if (
			error &&
			typeof error === 'object' &&
			'error' in error &&
			error.error === 'slow_down'
		) {
			methodLogger.warn(
				'Received slow_down error, retry mechanism will handle it',
			);
			throw error; // Let the retry mechanism handle it
		}

		// Check if this is an expired_token error
		if (
			error &&
			typeof error === 'object' &&
			'error' in error &&
			error.error === 'expired_token'
		) {
			methodLogger.error('Device code has expired', error);
			throw createApiError(
				'AWS SSO authorization session has expired. Please try again.',
				undefined,
				error,
			);
		}

		// Check if this is an access_denied error
		if (
			error &&
			typeof error === 'object' &&
			'error' in error &&
			error.error === 'access_denied'
		) {
			methodLogger.error('User denied authorization', error);
			throw createApiError(
				'AWS SSO authorization was denied by the user.',
				undefined,
				error,
			);
		}

		// For any other error, log and propagate
		methodLogger.error('Failed to poll for token', error);
		throw createApiError('Failed to get AWS SSO token', undefined, error);
	}
}
