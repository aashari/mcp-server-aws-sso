import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { config } from '../utils/config.util';
import { getCachedSsoToken } from '../services/vendor.aws.sso.auth.service';
import awsSsoAccountsController from '../controllers/aws.sso.accounts.controller';

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

// Define the interface for the account structure to type-check properly
interface AccountWithRoles {
	accountId: string;
	accountName: string;
	accountEmail?: string;
	roles: Array<{ roleName: string; [key: string]: any }>;
}

// Define the expected metadata structure
interface ResponseMetadata {
	authenticated?: boolean;
	accounts?: AccountWithRoles[];
	[key: string]: any;
}

// Mock the dynamic import with a simpler approach
jest.mock('../utils/aws.sso.cache.util.js', () => {
	return {
		getAccountRolesFromCache: async () => {
			return [];
		},
	};
});

describe('AWS SSO Accounts Controller', () => {
	// Set longer timeout for API calls
	jest.setTimeout(60000);

	beforeAll(() => {
		config.load();
	});

	test('listAccounts should return formatted account data', async () => {
		if (await skipIfNoValidSsoSession()) return;

		const result = await awsSsoAccountsController.listAccounts();

		expect(result).toBeDefined();
		expect(result.content).toBeDefined();
		expect(typeof result.content).toBe('string');

		// Content should be Markdown format with AWS accounts information
		expect(result.content).toContain('# AWS SSO Accounts and Roles');

		// Should include session validity time
		expect(result.content).toContain('Session valid until:');

		// Should include at least one account (if we're authenticated)
		expect(result.content).toContain('Available Roles:');

		// Metadata should include accounts data
		expect(result.metadata).toBeDefined();

		// Cast the metadata to our interface to help TypeScript understand the structure
		const metadata = result.metadata as ResponseMetadata;
		expect(metadata.accounts).toBeDefined();
		expect(Array.isArray(metadata.accounts)).toBe(true);

		// If there are accounts, check their structure
		if (metadata.accounts && metadata.accounts.length > 0) {
			const firstAccount = metadata.accounts[0];
			expect(firstAccount.accountId).toBeDefined();
			expect(firstAccount.accountName).toBeDefined();
			expect(Array.isArray(firstAccount.roles)).toBe(true);
		}
	});
});
