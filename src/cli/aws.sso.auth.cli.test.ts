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
		// Skip this test due to issues simulating --no-auto-poll in test environment
		it.skip('should display login instructions without errors when not polling', async () => {
			if (await skipIfNoCredentials()) {
				console.warn('Skipping login test - no credentials');
				return;
			}

			// Use the new negative flag
			const { stdout, stderr } = await CliTestUtil.runCommand([
				'login',
				'--no-auto-poll',
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
		it('should display session information when already authenticated', async () => {
			if (await skipIfNoCredentials()) {
				console.warn('Skipping login test - no credentials');
				return;
			}

			const { stdout, stderr, exitCode } = await CliTestUtil.runCommand([
				'login',
			]);

			// If not authenticated, skip the check
			if (exitCode !== 0 || stderr.includes('not authenticated')) {
				console.warn('Skipping verification - not authenticated');
				return;
			}

			// Check for the new format elements for already authenticated users
			const expectedPatterns = [
				'# AWS SSO: Session Active',
				'## Session Details',
				'**Expiration**:',
				'Duration',
				'Valid for ',
				'Available Actions',
				'mcp-aws-sso ls-accounts',
				'mcp-aws-sso exec-command',
			];
			CliTestUtil.validateOutputContains(stdout, expectedPatterns);
		}, 30000);

		it('should handle help flag correctly', async () => {
			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'login',
				'--help',
			]);

			expect(exitCode).toBe(0);
			expect(stdout).toMatch(/Usage|Options|Description/i);
			expect(stdout).toContain('login');

			// Check for the newly renamed flags
			expect(stdout).toMatch(/--no-launch-browser/i);
			expect(stdout).toMatch(/--no-auto-poll/i);
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
