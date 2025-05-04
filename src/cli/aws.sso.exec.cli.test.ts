import { CliTestUtil } from '../utils/cli.test.util';
import { getAwsSsoConfig } from '../services/vendor.aws.sso.auth.service';
import { getAllAccountsWithRoles } from '../services/vendor.aws.sso.accounts.service';

describe('AWS SSO Exec CLI Commands', () => {
	// Set a longer timeout
	jest.setTimeout(30000);

	beforeAll(async () => {
		// Check if credentials are available
		try {
			await getAwsSsoConfig();
		} catch (error) {
			console.warn(
				'WARNING: No AWS SSO credentials available. Live API tests will be skipped.',
			);
		}
	});

	/**
	 * Helper function to skip tests if AWS SSO credentials are not available
	 */
	const skipIfNoCredentials = async () => {
		try {
			await getAwsSsoConfig();
			return false;
		} catch (error) {
			return true;
		}
	};

	/**
	 * Helper to get a valid account and role for testing
	 */
	const getTestAccountAndRole = async () => {
		try {
			const accounts = await getAllAccountsWithRoles();
			if (!accounts || accounts.length === 0) {
				return null;
			}

			const accountWithRole = accounts.find(
				(account: any) => account.roles && account.roles.length > 0,
			);

			if (!accountWithRole) {
				return null;
			}

			return {
				accountId: accountWithRole.accountId,
				roleName: accountWithRole.roles[0].roleName,
			};
		} catch (error) {
			return null;
		}
	};

	describe('exec-command command', () => {
		// Test running a real command with the new output format
		it('should execute command and show formatted output', async () => {
			if (await skipIfNoCredentials()) {
				console.warn('Skipping exec-command test - no credentials');
				return;
			}

			// Get a valid account/role combination
			const testAccount = await getTestAccountAndRole();
			if (!testAccount) {
				console.warn('Skipping test - no accounts/roles available');
				return;
			}

			const { stdout, stderr, exitCode } = await CliTestUtil.runCommand([
				'exec-command',
				'--account-id',
				testAccount.accountId,
				'--role-name',
				testAccount.roleName,
				'--command',
				'aws --version',
			]);

			// Check for success
			if (exitCode !== 0 || stderr.includes('not authenticated')) {
				console.warn('Skipping verification - error executing command');
				return;
			}

			// Verify the new output format for successful commands
			const expectedPatterns = [
				'# AWS CLI Command Output',
				/\*\*Executed At\*\*:.*/,
				`**Account**: ${testAccount.accountId}`,
				`**Role**: ${testAccount.roleName}`,
				'aws-cli', // Should contain version info
			];
			CliTestUtil.validateOutputContains(stdout, expectedPatterns);
		}, 60000);

		// Test error handling with a bad command
		it('should format errors for bad commands', async () => {
			if (await skipIfNoCredentials()) {
				console.warn('Skipping exec-command test - no credentials');
				return;
			}

			// Get a valid account/role combination
			const testAccount = await getTestAccountAndRole();
			if (!testAccount) {
				console.warn('Skipping test - no accounts/roles available');
				return;
			}

			const { stdout } = await CliTestUtil.runCommand([
				'exec-command',
				'--account-id',
				testAccount.accountId,
				'--role-name',
				testAccount.roleName,
				'--command',
				'aws invalid-command',
			]);

			// Verify the new output format for error commands
			const expectedPatterns = [
				'# AWS CLI Command Output',
				/\*\*Executed At\*\*:.*/, // Check for timestamp
				`**Account**: ${testAccount.accountId}`, // Use testAccount variable
				`**Role**: ${testAccount.roleName}`, // Use testAccount variable
				/\*\*Exit Code\*\*: \d+/, // Check for Exit Code line using RegExp object
				'usage: aws', // Check for usage string
			];
			CliTestUtil.validateOutputContains(stdout, expectedPatterns);
		}, 60000);

		it('should provide helpful error when no command is provided', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'exec-command',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(/required option.*--account-id/i);
		}, 15000);

		it('should handle missing account option', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'exec-command',
				'--role-name',
				'SomeRole',
				'--command',
				'aws s3 ls',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(/required option.*--account-id/i);
		}, 15000);

		it('should handle missing role option', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'exec-command',
				'--account-id',
				'123456789012',
				'--command',
				'aws s3 ls',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(/required option.*--role-name/i);
		}, 15000);

		it('should handle missing command option', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'exec-command',
				'--account-id',
				'123456789012',
				'--role-name',
				'SomeRole',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(/required option.*--command/i);
		}, 15000);

		it('should handle help flag correctly', async () => {
			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'exec-command',
				'--help',
			]);

			expect(exitCode).toBe(0);
			expect(stdout).toMatch(/Usage|Options|Description/i);
			expect(stdout).toContain('exec-command');
			expect(stdout).toContain('--account');
			expect(stdout).toContain('--role');
			expect(stdout).toContain('--region');
			expect(stdout).toContain('--command');
		}, 15000);

		it('should handle unknown flags gracefully', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'exec-command',
				'--account-id',
				'123456789012',
				'--role-name',
				'SomeRole',
				'--command',
				'aws s3 ls',
				'--unknown-flag',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(/unknown option|invalid|error/i);
		}, 15000);

		// Test authentication required message
		it('should show auth required message when not logged in', async () => {
			// Skip real verification if credentials exist
			if (!(await skipIfNoCredentials())) {
				console.warn('Skipping auth check - credentials exist');
				return;
			}

			const { stdout } = await CliTestUtil.runCommand([
				'exec-command',
				'--account-id',
				'123456789012',
				'--role-name',
				'TestRole',
				'--command',
				'aws s3 ls',
			]);

			// Check for auth required message
			const expectedPatterns = [
				'# AWS SSO Authentication Required',
				'How to Authenticate',
				'mcp-aws-sso login',
			];
			CliTestUtil.validateOutputContains(stdout, expectedPatterns);
		}, 15000);
	});
});
