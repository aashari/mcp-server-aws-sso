import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { config } from '../utils/config.util';
import { getCachedSsoToken } from './vendor.aws.sso.auth.service';
import {
	listSsoAccounts,
	getAccountsWithRoles,
	getAwsCredentials,
} from './vendor.aws.sso.accounts.service';

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

describe('AWS SSO Accounts Service', () => {
	// Set longer timeout for API calls
	jest.setTimeout(60000);

	beforeAll(() => {
		config.load();
	});

	test('listSsoAccounts should return a list of AWS accounts', async () => {
		if (await skipIfNoValidSsoSession()) return;

		const accounts = await listSsoAccounts();
		expect(accounts).toBeDefined();
		expect(Array.isArray(accounts.accountList)).toBe(true);

		// If accounts exist, check their structure
		if (accounts.accountList.length > 0) {
			const firstAccount = accounts.accountList[0];
			expect(firstAccount.accountId).toBeDefined();
			expect(firstAccount.accountName).toBeDefined();
		}
	});

	test('getAccountsWithRoles should return accounts with their roles', async () => {
		if (await skipIfNoValidSsoSession()) return;

		const accounts = await getAccountsWithRoles();
		expect(accounts).toBeDefined();
		expect(Array.isArray(accounts)).toBe(true);

		// If accounts exist, check their structure
		if (accounts.length > 0) {
			const firstAccount = accounts[0];
			expect(firstAccount.accountId).toBeDefined();
			expect(firstAccount.accountName).toBeDefined();
			expect(Array.isArray(firstAccount.roles)).toBe(true);
		}
	});

	test('getAwsCredentials should return valid credentials for a role', async () => {
		if (await skipIfNoValidSsoSession()) return;

		// First get a list of accounts to find a valid account/role combination
		const accounts = await getAccountsWithRoles();
		if (!accounts || accounts.length === 0) {
			console.warn('SKIPPING TEST: No AWS accounts available.');
			return;
		}

		// Find an account with at least one role
		const accountWithRole = accounts.find(
			(account) => account.roles && account.roles.length > 0,
		);
		if (!accountWithRole) {
			console.warn(
				'SKIPPING TEST: No AWS accounts with roles available.',
			);
			return;
		}

		const accountId = accountWithRole.accountId;
		const roleName = accountWithRole.roles[0].roleName;

		// Now get credentials for this account/role
		const credentials = await getAwsCredentials({
			accountId,
			roleName,
		});

		expect(credentials).toBeDefined();
		expect(credentials.accessKeyId).toBeDefined();
		expect(credentials.secretAccessKey).toBeDefined();
		expect(credentials.sessionToken).toBeDefined();
		expect(credentials.expiration).toBeDefined();

		// Verify credentials are not expired
		const now = new Date();
		expect(credentials.expiration).toBeInstanceOf(Date);
		expect(credentials.expiration.getTime()).toBeGreaterThan(now.getTime());
	});
});
