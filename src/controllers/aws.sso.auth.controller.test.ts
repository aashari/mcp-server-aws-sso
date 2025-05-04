import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { config } from '../utils/config.util';
import { getCachedSsoToken } from '../services/vendor.aws.sso.auth.service';
import awsSsoAuthController from '../controllers/aws.sso.auth.controller';
import { formatAuthRequired } from '../controllers/aws.sso.auth.formatter';

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

describe('AWS SSO Auth Controller', () => {
	// Set longer timeout for API calls
	jest.setTimeout(60000);

	beforeAll(() => {
		config.load();
	});

	test('startLogin should detect existing authentication', async () => {
		if (await skipIfNoValidSsoSession()) return;

		// If we have a valid session, startLogin should detect it and return already logged in message
		const result = await awsSsoAuthController.startLogin({
			autoPoll: false, // Prevent actual login flow which would require browser interaction
			launchBrowser: false,
		});

		expect(result).toBeDefined();
		expect(result.content).toBeDefined();

		// Check for new format elements
		expect(result.content).toContain('# AWS SSO Session Active');
		expect(result.content).toContain('Session Details');
		expect(result.content).toContain('Expiration');
		expect(result.content).toContain('Duration');

		// Verify it contains duration information (either as hours or minutes)
		expect(result.content).toMatch(
			/Valid for (approximately \d+ hours|less than an hour|approximately 1 hour)/,
		);

		expect(result.metadata).toBeDefined();
		expect(result.metadata?.alreadyLoggedIn).toBe(true);
		expect(result.metadata?.authenticated).toBe(true);
	});

	test('checkAuthStatus should return authentication status', async () => {
		const result = await awsSsoAuthController.checkSsoAuthStatus();

		expect(result).toBeDefined();
		expect(result.isAuthenticated).toBeDefined();

		if (await skipIfNoValidSsoSession()) {
			// We should be unauthenticated here
			expect(result.isAuthenticated).toBe(false);
		} else {
			// We have a valid session, so we should be authenticated
			expect(result.isAuthenticated).toBe(true);
		}
	});

	// Test the auth required message format
	test('formatAuthRequired should return properly formatted message', () => {
		const result = formatAuthRequired();

		expect(result).toBeDefined();
		expect(typeof result).toBe('string');
		expect(result).toContain('# AWS SSO Authentication Required');
		expect(result).toContain('How to Authenticate');
		expect(result).toContain('mcp-aws-sso login');
	});
});
