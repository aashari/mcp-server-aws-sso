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

	describe('exec command', () => {
		it('should provide helpful error when no command is provided', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand(['exec']);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(/required option.*--account-id/i);
		}, 15000);

		it('should handle missing account option', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'exec',
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
				'exec',
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
				'exec',
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
				'exec',
				'--help',
			]);

			expect(exitCode).toBe(0);
			expect(stdout).toMatch(/Usage|Options|Description/i);
			expect(stdout).toContain('exec');
			expect(stdout).toContain('--account');
			expect(stdout).toContain('--role');
		}, 15000);

		it('should handle unknown flags gracefully', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'exec',
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
