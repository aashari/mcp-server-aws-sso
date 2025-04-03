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

	describe('list-accounts command', () => {
		it('should list accounts and return success exit code', async () => {
			if (await skipIfNoCredentials()) {
				console.warn('Skipping list-accounts test - no credentials');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'list-accounts',
			]);

			expect(exitCode).toBe(0);
			CliTestUtil.validateMarkdownOutput(stdout);
			CliTestUtil.validateOutputContains(stdout, [
				'# AWS SSO Accounts',
				/\*\*Account ID\*\*:/,
				/\*\*Account Name\*\*:/,
			]);
		}, 60000);

		it('should support filtering with name flag', async () => {
			if (await skipIfNoCredentials()) {
				console.warn('Skipping filter test - no credentials');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'list-accounts',
				'--name',
				'test',
			]);

			expect(exitCode).toBe(0);
			CliTestUtil.validateMarkdownOutput(stdout);
			// The output might contain accounts or a message that no accounts were found
			// Either is valid depending on whether any account matches the filter
		}, 60000);

		it('should handle help flag correctly', async () => {
			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'list-accounts',
				'--help',
			]);

			expect(exitCode).toBe(0);
			// Help output should contain information about the command
			expect(stdout).toMatch(/Usage|Options|Description/i);
			expect(stdout).toContain('list-accounts');
		}, 15000);

		it('should handle unknown flags gracefully', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'list-accounts',
				'--unknown-flag',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(/unknown option|invalid|error/i);
		}, 15000);
	});
});
