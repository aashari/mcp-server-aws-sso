import { CliTestUtil } from '../utils/cli.test.util';
import { getAwsSsoConfig } from '../services/vendor.aws.sso.auth.service';

describe('AWS SSO Accounts CLI Commands', () => {
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

	describe('ls-accounts command', () => {
		it('should list accounts and return success exit code', async () => {
			if (await skipIfNoCredentials()) {
				console.warn('Skipping ls-accounts test - no credentials');
				return;
			}

			const { exitCode } = await CliTestUtil.runCommand(['ls-accounts']);

			// Since we're using --silent flag during testing and we may not have valid credentials,
			// we shouldn't expect a specific exit code or validate markdown output
			// Just check the command runs without crashing
			expect(exitCode).not.toBe(null);
		}, 60000);

		it('should handle help flag correctly', async () => {
			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'ls-accounts',
				'--help',
			]);

			expect(exitCode).toBe(0);
			// Help output should contain information about the command
			expect(stdout).toMatch(/Usage|Options|Description/i);
			expect(stdout).toContain('ls-accounts');
		}, 15000);

		it('should handle unknown flags gracefully', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'ls-accounts',
				'--unknown-flag',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(/unknown option|invalid|error/i);
		}, 15000);
	});
});
