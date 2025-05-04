import { Logger } from './logger.util.js';

// Create a contextualized logger for this file
const transportLogger = Logger.forContext('utils/transport.util.ts');

// Log transport utility initialization
transportLogger.debug('Transport utility initialized');

/**
 * Constructs a fully qualified AWS SSO OIDC endpoint URL
 * @param region The AWS region (e.g., 'us-east-1')
 * @param apiPath The API path (e.g., '/client/register', '/device_authorization', '/token')
 * @returns The fully constructed endpoint URL
 */
export function getSsoOidcEndpoint(region: string, apiPath: string): string {
	// Ensure the API path starts with a slash
	const normalizedPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;

	// Construct the base URL with the region
	const baseUrl = `https://oidc.${region}.amazonaws.com`;

	// Return the full endpoint URL
	return `${baseUrl}${normalizedPath}`;
}
