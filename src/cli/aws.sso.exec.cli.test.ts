import { CliTestUtil } from '../utils/cli.test.util';
import { getAwsSsoConfig } from '../services/vendor.aws.sso.auth.service';

describe('AWS SSO Exec CLI Commands', () => {
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

	// Note: skipIfNoCredentials function is defined but not currently used
	// Keeping the commented implementation for future use if needed
	/*
	const skipIfNoCredentials = async () => {
		try {
			await getAwsSsoConfig();
			return false;
		} catch (error) {
			return true;
		}
	};
	*/

	describe('exec-cmd command', () => {
		it('should provide helpful error when no command is provided', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'exec-cmd',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(/required option.*--account-id/i);
		}, 15000);

		it('should handle missing account option', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'exec-cmd',
				'--role-name',
				'AWSReadOnlyAccess',
				'--command',
				'aws s3 ls',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(/required option.*--account-id/i);
		}, 15000);

		it('should handle missing role option', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'exec-cmd',
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
				'exec-cmd',
				'--account-id',
				'123456789012',
				'--role-name',
				'AWSReadOnlyAccess',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(/required option.*--command/i);
		}, 15000);

		it('should handle help flag correctly', async () => {
			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'exec-cmd',
				'--help',
			]);

			expect(exitCode).toBe(0);
			expect(stdout).toMatch(/Usage|Options|Description/i);
			expect(stdout).toContain('exec-cmd');
			expect(stdout).toContain('--account');
			expect(stdout).toContain('--role');
		}, 15000);

		it('should handle unknown flags gracefully', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'exec-cmd',
				'--unknown-flag',
				'--',
				'aws',
				's3',
				'ls',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(/unknown option|invalid|error/i);
		}, 15000);
	});
});
