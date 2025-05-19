import { Logger } from '../utils/logger.util.js';
import { withRetry } from '../utils/retry.util.js';
import { z } from 'zod';

const logger = Logger.forContext('services/vendor.aws.sso.auth.http.ts');

/**
 * Make a POST request to a URL with JSON body
 * @param url The URL to post to
 * @param data The data to send in the request body
 * @returns The JSON response
 */
export async function post<T>(
	url: string,
	data: Record<string, unknown>,
): Promise<T> {
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
export const ClientRegistrationResponseSchema = z.object({
	clientId: z.string(),
	clientSecret: z.string(),
	expiresAt: z.string().optional(),
});

/**
 * Zod schema for device authorization response
 */
export const DeviceAuthorizationResponseSchema = z.object({
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
export const TokenResponseSchema = z.object({
	accessToken: z.string().optional(),
	access_token: z.string().optional(),
	refreshToken: z.string().optional().nullable(),
	refresh_token: z.string().optional().nullable(),
	tokenType: z.string().optional(),
	token_type: z.string().optional(),
	expires_in: z.number().optional(),
	expiresIn: z.number().optional(),
});
