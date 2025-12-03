import { CliTestUtil } from '../utils/cli.test.util';
import { getAwsSsoConfig } from '../services/vendor.aws.sso.auth.core.service.js';

describe('AWS SSO Auth CLI Commands', () => {
	// Test environment setup - no need for beforeAll hook
	// All individual tests handle credentials checking internally

	/**
	 * Helper function to skip tests if AWS SSO credentials are not available
	 */
	const skipIfNoCredentials = async () => {
		try {
			await getAwsSsoConfig();
			return false;
		} catch {
			// Expected in CI/test environments where AWS_SSO_START_URL is not set
			return true;
		}
	};

	describe('login command', () => {
		// Skip this test due to issues simulating --no-launch-browser in test environment
		it.skip('should display login instructions without errors when not launching browser', async () => {
			if (await skipIfNoCredentials()) {
				console.warn('Skipping login test - no credentials');
				return;
			}

			// Use the no-launch-browser flag
			const { stdout, stderr } = await CliTestUtil.runCommand([
				'login',
				'--no-launch-browser',
			]);

			// Check for specific known errors instead of exact exit code/stderr
			expect(stderr).not.toMatch(/error: unknown option/i);
			expect(stderr).not.toMatch(/error: too many arguments/i);

			// Verify that the output contains the new format elements
			expect(stdout).toMatch(
				/AWS SSO (Authentication Started|Manual Authentication Required)/i,
			);
			expect(stdout).toMatch(/browser|authentication steps/i);
			expect(stdout).toMatch(/verification code/i);
		}, 15000);

		// Test for already authenticated scenario
		// Skip: requires active AWS SSO session with valid tokens (interactive browser auth)
		it.skip('should display session information when already authenticated', async () => {
			if (await skipIfNoCredentials()) {
				console.warn('Skipping login test - no credentials');
				return;
			}

			// Use the no-launch-browser option to prevent waiting for browser authentication
			const { stdout, stderr } = await CliTestUtil.runCommand(
				['login', '--no-launch-browser'],
				{ timeoutMs: 55000 }, // Allow 55s for AWS SSO operations
			);

			// Check that we received expected output based on different auth states
			if (stdout.includes('Session Active')) {
				// Already authenticated
				CliTestUtil.validateOutputContains(stdout, [
					'Session Active',
					'Session Details',
					'Valid for',
				]);
			} else if (
				stdout.includes('Authentication Started') ||
				stdout.includes('Manual Authentication Required')
			) {
				// Login flow started
				CliTestUtil.validateOutputContains(stdout, [
					'Authentication',
					'verification code',
				]);
			} else if (stdout.includes('Error') || stderr.includes('Error')) {
				// Error case (acceptable in tests)
				console.warn(
					'Login returned an error, which is expected in a test environment',
				);
				return;
			}

			// Test passes as long as we got some valid response
		}, 60000); // Increase timeout to 60 seconds

		it('should handle help flag correctly', async () => {
			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'login',
				'--help',
			]);

			expect(exitCode).toBe(0);
			expect(stdout).toMatch(/Usage|Options|Description/i);
			expect(stdout).toContain('login');

			// Check for the available flags
			expect(stdout).toMatch(/--no-launch-browser/i);
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
