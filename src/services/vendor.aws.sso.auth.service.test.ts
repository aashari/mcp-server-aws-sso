import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { config } from '../utils/config.util';
import {
	getCachedSsoToken,
	getAwsSsoConfig,
} from './vendor.aws.sso.auth.core.service.js';

/**
 * Helper function to skip tests when no valid AWS SSO session is available
 * @returns {Promise<boolean>} True if tests should be skipped, false otherwise
 */
const skipIfNoValidSsoSession = async (): Promise<boolean> => {
	config.load(); // Ensure config is loaded in case beforeAll didn't run first
	const token = await getCachedSsoToken();
	if (!token) {
		console.warn(
			'SKIPPING TEST: No AWS SSO token found. Please run login first.',
		);
		return true;
	}
	const now = Math.floor(Date.now() / 1000);
	if (token.expiresAt <= now) {
		console.warn(
			'SKIPPING TEST: AWS SSO token is expired. Please run login first.',
		);
		return true;
	}
	// Check if AWS_SSO_START_URL is set, as it's required for some operations
	if (!config.get('AWS_SSO_START_URL')) {
		console.warn('SKIPPING TEST: AWS_SSO_START_URL is not configured.');
		return true;
	}
	return false;
};

describe('AWS SSO Auth Service', () => {
	// Set longer timeout for API calls
	jest.setTimeout(60000);

	beforeAll(() => {
		config.load();
	});

	test('getAwsSsoConfig should return start URL and region', async () => {
		config.load();
		if (!config.get('AWS_SSO_START_URL')) {
			console.warn('SKIPPING TEST: AWS_SSO_START_URL is not configured.');
			return;
		}

		const awsSsoConfig = await getAwsSsoConfig();
		expect(awsSsoConfig).toBeDefined();
		expect(awsSsoConfig.startUrl).toBeDefined();
		expect(awsSsoConfig.region).toBeDefined();
	});

	test('getCachedSsoToken should retrieve token if logged in', async () => {
		if (await skipIfNoValidSsoSession()) return;

		const token = await getCachedSsoToken();
		expect(token).toBeDefined();
		expect(token?.accessToken).toBeDefined();
		expect(token?.expiresAt).toBeDefined();
		expect(token?.region).toBeDefined();

		// Check token is valid
		const now = Math.floor(Date.now() / 1000);
		expect(token?.expiresAt).toBeGreaterThan(now);
	});
});
