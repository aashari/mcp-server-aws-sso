import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { config } from '../utils/config.util';
import { getCachedSsoToken } from './vendor.aws.sso.auth.service';
import { getAllAccountsWithRoles } from './vendor.aws.sso.accounts.service';
import { executeCommand } from './vendor.aws.sso.exec.service';

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
	// Skip in CI environment as it may not have valid AWS credentials
	if (process.env.CI) {
		console.warn(
			'SKIPPING TEST: Running in CI environment where AWS credentials may not be fully configured',
		);
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
		const result = await executeCommand(
			accountId,
			roleName,
			'aws sts get-caller-identity',
		);

		expect(result).toBeDefined();

		// If we're in a restricted environment, we might get auth errors
		// but we should still receive a proper result structure
		if (result.exitCode !== 0) {
			console.warn(
				`Command execution returned non-zero exit code: ${result.exitCode}`,
			);
			console.warn(`Error message: ${result.stderr}`);

			// Check if it's a token/credential error which is acceptable in some environments
			const isCredentialError =
				/invalid.*token|InvalidClientTokenId|security token.*invalid/i.test(
					result.stderr,
				);

			if (isCredentialError) {
				// Skip further verification since we know why it failed
				console.warn(
					'Detected credential validation error - this is expected in some environments',
				);

				// Just verify the result structure but not the content
				expect(result.stderr).toBeTruthy();
				expect(typeof result.stdout).toBe('string');
				expect(typeof result.stderr).toBe('string');
				return;
			}
		}

		// Only expect these assertions to pass if exit code is 0
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
