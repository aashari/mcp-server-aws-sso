import { CliTestUtil } from '../utils/cli-test.util';

jest.mock('../controllers/aws.sso.accounts.controller.js', () => ({
	default: {
		listAccounts: jest.fn().mockResolvedValue({
			content: '# Mock AWS accounts list',
			metadata: {
				authenticated: true,
				accounts: [
					{
						accountId: '123456789012',
						accountName: 'Test Account',
						email: 'test@example.com',
						roles: [
							{
								roleName: 'AdminAccess',
								roleArn:
									'arn:aws:iam::123456789012:role/AdminAccess',
							},
						],
					},
				],
			},
		}),
	},
}));

describe('AWS SSO Accounts CLI', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should output account list when list-accounts command is called', async () => {
		// Run the command
		const result = await CliTestUtil.runCommand(['list-accounts']);

		// Verify output
		expect(result.stderr).toBe('');
		expect(result.stdout).toContain('# Mock AWS accounts list');
		expect(result.exitCode).toBe(0);
	});
});
