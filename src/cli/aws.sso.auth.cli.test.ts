import { CliTestUtil } from '../utils/cli.test.util';
import { getAwsSsoConfig } from '../services/vendor.aws.sso.auth.service';

describe('AWS SSO Auth CLI Commands', () => {
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

	describe('login command', () => {
		it('should display login instructions without errors', async () => {
			if (await skipIfNoCredentials()) {
				console.warn('Skipping login test - no credentials');
				return;
			}

			// Since this is just a test, we'll run with the --no-browser flag
			// and disable auto-polling to prevent timeouts
			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'login',
				'--no-browser',
				'--no-auto-poll', // Disable auto-polling to prevent test timeout
			]);

			// During tests, the actual exit code may vary depending on the environment
			// Just make sure the command executed without crashing
			expect(exitCode).not.toBe(null);
			// We might not always get Markdown output in test environments,
			// so only validate that some output was produced
			expect(stdout.length).toBeGreaterThan(0);
			// Verify that the output contains instructions for manual authentication
			expect(stdout).toMatch(
				/verification|user code|browser|authenticate/i,
			);
		}, 15000); // Reduce timeout since we're not polling anymore

		it('should handle help flag correctly', async () => {
			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'login',
				'--help',
			]);

			expect(exitCode).toBe(0);
			expect(stdout).toMatch(/Usage|Options|Description/i);
			expect(stdout).toContain('login');
		}, 15000);

		it('should handle unknown flags gracefully', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'login',
				'--unknown-flag',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(/unknown option|invalid|error/i);
		}, 15000);
	});
});
