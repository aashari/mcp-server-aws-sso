import { Logger } from '../utils/logger.util.js';
import { config } from '../utils/config.util.js';
import { createAuthMissingError, createApiError } from '../utils/error.util.js';
import * as ssoCache from '../utils/aws.sso.cache.util.js';
import {
	AwsSsoConfig,
	AwsSsoConfigSchema,
	AwsSsoAuthResult,
} from './vendor.aws.sso.types.js';
import { z } from 'zod';

const logger = Logger.forContext(
	'services/vendor.aws.sso.auth.core.service.ts',
);

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
			const issueSummary = error.issues
				.map((issue) => {
					const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
					return `${path}: ${issue.message}`;
				})
				.join(', ');
			throw createApiError(
				`Invalid AWS SSO configuration: ${issueSummary}`,
				undefined,
				error,
			);
		}
		throw error;
	}
}

/**
 * Get cached SSO token from the cache
 *
 * @returns {Promise<AwsSsoAuthResult | undefined>} The cached token or undefined if not found
 */
export async function getCachedSsoToken(): Promise<
	AwsSsoAuthResult | undefined
> {
	const methodLogger = logger.forMethod('getCachedSsoToken');
	methodLogger.debug('Getting cached token');

	return ssoCache.getCachedSsoToken();
}
