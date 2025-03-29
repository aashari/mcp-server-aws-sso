import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { config } from '../utils/config.util';
import { getCachedSsoToken } from '../services/vendor.aws.sso.auth.service';
import { getAccountsWithRoles } from '../services/vendor.aws.sso.accounts.service';
import awsSsoExecController from '../controllers/aws.sso.exec.controller';

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

describe('AWS SSO Exec Controller', () => {
	// Set longer timeout for API calls
	jest.setTimeout(60000);

	beforeAll(() => {
		config.load();
	});

	test('executeCommand should run AWS CLI commands and format output', async () => {
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

		// Run a simple AWS command - version should work on any AWS CLI
		const result = await awsSsoExecController.executeCommand({
			accountId,
			roleName,
			command: ['aws', '--version'],
		});

		expect(result).toBeDefined();
		expect(result.content).toBeDefined();
		expect(typeof result.content).toBe('string');

		// Content should be Markdown formatted output
		expect(result.content).toContain('# AWS CLI Command Execution');
		expect(result.content).toContain('Command: `aws --version`');
		expect(result.content).toContain('## Result:');

		// The output should contain "aws-cli" somewhere
		expect(result.content).toContain('aws-cli');

		// Metadata should include command information
		expect(result.metadata).toBeDefined();
		expect(result.metadata?.command).toBeDefined();
		expect(result.metadata?.exitCode).toBe(0); // Command should succeed
	});
});
