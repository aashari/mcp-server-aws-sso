import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { config } from '../utils/config.util';
import { getCachedSsoToken } from './vendor.aws.sso.auth.service';
import { getAllAccountsWithRoles } from './vendor.aws.sso.accounts.service';
import { executeAwsCommand } from './vendor.aws.sso.exec.service';

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

describe('AWS SSO Exec Service', () => {
	// Set longer timeout for API calls
	jest.setTimeout(60000);

	beforeAll(() => {
		config.load();
	});

	test('executeCommand should run AWS CLI commands with temporary credentials', async () => {
		if (await skipIfNoValidSsoSession()) return;

		// First get a list of accounts to find a valid account/role combination
		const accounts = await getAllAccountsWithRoles();
		if (!accounts || accounts.length === 0) {
			console.warn('SKIPPING TEST: No AWS accounts available.');
			return;
		}

		// Find an account that has at least one role
		const accountWithRole = accounts.find(
			(account: any) => account.roles && account.roles.length > 0,
		);
		if (!accountWithRole) {
			console.warn(
				'SKIPPING TEST: No AWS accounts with roles available.',
			);
			return;
		}

		const accountId = accountWithRole.accountId;
		const roleName = accountWithRole.roles[0].roleName;

		// Run a simple AWS command - get caller identity
		const result = await executeAwsCommand(
			accountId,
			roleName,
			'aws sts get-caller-identity',
		);

		expect(result).toBeDefined();
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toBeTruthy();

		// Parse the JSON output and verify it contains the expected fields
		try {
			const identity = JSON.parse(result.stdout);
			expect(identity.Account).toBeDefined();
			expect(identity.UserId).toBeDefined();
			expect(identity.Arn).toBeDefined();
		} catch (error) {
			// If parsing fails, the output format might have changed or been unexpected
			console.warn(
				'Could not parse caller identity output:',
				result.stdout,
			);
			expect(result.stdout).toContain('Account');
			expect(result.stdout).toContain('UserId');
			expect(result.stdout).toContain('Arn');
		}
	});
});
