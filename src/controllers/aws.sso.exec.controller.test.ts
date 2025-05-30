import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { config } from '../utils/config.util';
import { getCachedSsoToken } from '../services/vendor.aws.sso.auth.core.service.js';
import { getAllAccountsWithRoles } from '../services/vendor.aws.sso.accounts.service';
import awsSsoExecController from '../controllers/aws.sso.exec.controller';
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
	// Skip in CI environment as it may not have valid AWS credentials
	if (process.env.CI) {
		console.warn(
			'SKIPPING TEST: Running in CI environment where AWS credentials may not be fully configured',
		);
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

		// Run a simple AWS command - version should work on any AWS CLI
		const result = await awsSsoExecController.executeCommand({
			accountId,
			roleName,
			command: 'aws --version',
		});

		expect(result).toBeDefined();
		expect(result.content).toBeDefined();
		expect(typeof result.content).toBe('string');

		// Content should be Markdown formatted output with the new structure
		expect(result.content).toContain('# AWS SSO: Command Result');
		expect(result.content).toContain(`**Account/Role**: ${accountId}`);

		// The output should still contain aws-cli somewhere
		expect(result.content).toContain('aws-cli');
	});

	// Test format of authentication required message
	test('formatAuthRequired should return properly formatted message', async () => {
		// Test the formatting function directly instead of mocking
		const authRequiredMessage = formatAuthRequired();

		expect(authRequiredMessage).toBeDefined();
		expect(authRequiredMessage).toContain(
			'# AWS SSO: Authentication Required',
		);
		expect(authRequiredMessage).toContain('How to Authenticate');
		expect(authRequiredMessage).toContain('mcp-aws-sso login');
	});

	// Test handling of errors from AWS CLI commands
	test('executeCommand should format error output correctly', async () => {
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

		// Run a command that should fail - invalid s3 bucket
		const result = await awsSsoExecController.executeCommand({
			accountId,
			roleName,
			command:
				'aws s3 ls s3://nonexistent-bucket-name-that-does-not-exist',
		});

		expect(result).toBeDefined();
		expect(result.content).toBeDefined();
		expect(typeof result.content).toBe('string');

		// Check error formatting
		expect(result.content).toContain('# ❌ AWS SSO: Command Error');
		expect(result.content).toContain('Error:');

		// Should contain error message about bucket not existing or access denied
		// Also accept token validation errors which are common in CI/test environments
		expect(result.content).toMatch(
			/(NoSuchBucket|AccessDenied|not found|not exist|NoSuchKey|InvalidToken|invalid token|InvalidClient|security token.*invalid)/i,
		);
	});
});
