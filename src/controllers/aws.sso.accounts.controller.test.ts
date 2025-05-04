import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { config } from '../utils/config.util';
import { getCachedSsoToken } from '../services/vendor.aws.sso.auth.service';
import awsSsoAccountsController from '../controllers/aws.sso.accounts.controller';
import {
	formatNoAccounts,
	formatAuthRequired,
} from '../controllers/aws.sso.accounts.formatter';

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

		// Check for new format elements
		expect(result.content).toContain('# AWS SSO Accounts and Roles');

		// Should include session validity with duration
		expect(result.content).toContain('Session Status');
		expect(result.content).toMatch(/Valid until .* \(.*remaining\)/);

		// Should have structured sections
		expect(result.content).toContain('## Available Accounts');

		// Should have account structure with email and roles
		expect(result.content).toMatch(/### Account:/);
		expect(result.content).toMatch(/- \*\*Email\*\*:/);
		expect(result.content).toMatch(/- \*\*Roles\*\*:/);

		// Should include next steps section
		expect(result.content).toContain('## Next Steps');
		expect(result.content).toContain('mcp-aws-sso exec-command');

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

	// Test the no accounts message format
	test('formatNoAccounts should return properly formatted message', () => {
		const result = formatNoAccounts();

		expect(result).toBeDefined();
		expect(typeof result).toBe('string');
		expect(result).toContain('# AWS SSO Accounts and Roles');
		expect(result).toContain('## No Accounts Found');
		expect(result).toContain('Possible Causes');
		expect(result).toContain('Suggested Actions');
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
