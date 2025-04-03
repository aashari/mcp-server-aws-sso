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

			// Mock process.stdin.once to prevent the test from hanging
			const originalOnce = process.stdin.once;
			process.stdin.once = jest
				.fn()
				.mockImplementation((event, callback) => {
					if (event === 'data') {
						// Mock user pressing Enter
						setTimeout(() => callback(Buffer.from('\n')), 100);
					}
					return process.stdin;
				});

			// Run the login command with --no-open flag to prevent browser launch
			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'login',
				'--no-open',
			]);

			// Restore original stdin.once
			process.stdin.once = originalOnce;

			// The command should start without errors
			expect(exitCode).toBe(0);
			CliTestUtil.validateMarkdownOutput(stdout);
			CliTestUtil.validateOutputContains(stdout, [
				'# AWS SSO Login',
				'Please complete the login process',
				'verification code',
			]);
		}, 60000);

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
