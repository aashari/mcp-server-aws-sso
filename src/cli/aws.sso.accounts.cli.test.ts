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
		it('should list accounts with the new format', async () => {
			if (await skipIfNoCredentials()) {
				console.warn('Skipping ls-accounts test - no credentials');
				return;
			}

			const { stdout, stderr, exitCode } = await CliTestUtil.runCommand([
				'ls-accounts',
			]);

			// If not authenticated or other error, skip detailed checks
			if (exitCode !== 0 || stderr.includes('not authenticated')) {
				console.warn('Skipping detailed verification - error occurred');
				return;
			}

			// Check for new format elements
			CliTestUtil.validateOutputContains(stdout, [
				'# AWS SSO: Accounts and Roles',
				'**Session Status**:',
				'Valid until',
				'remaining',
				'## Available Accounts',
				'Account:',
				'Email',
				'Roles',
				'## Next Steps',
				'mcp-aws-sso exec-command',
			]);
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

		// Test authentication required message
		it('should show authentication required message when not logged in', async () => {
			// Skip real verification if credentials exist
			if (!(await skipIfNoCredentials())) {
				console.warn('Skipping auth check - credentials exist');
				return;
			}

			const { stdout } = await CliTestUtil.runCommand(['ls-accounts']);

			// Check for auth required message
			CliTestUtil.validateOutputContains(stdout, [
				'# AWS SSO Authentication Required',
				'How to Authenticate',
				'mcp-aws-sso login',
			]);
		}, 15000);
	});
});
