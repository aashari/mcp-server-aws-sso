import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { executeCommand } from './vendor.aws.sso.exec.service';
import { getCachedSsoToken } from './vendor.aws.sso.auth.service';
import {
	getAllAccountsWithRoles,
	getAwsCredentials,
} from './vendor.aws.sso.accounts.service.js';
import {
	AwsSsoAccountWithRoles,
	AwsSsoRole,
	AwsCredentials,
	GetCredentialsParams,
} from './vendor.aws.sso.types';
import { CommandExecutionResult } from '../controllers/aws.sso.exec.types.js';

// Mock dependencies
jest.mock('child_process');
jest.mock('../utils/logger.util.js');
jest.mock('./vendor.aws.sso.auth.service');
jest.mock('./vendor.aws.sso.accounts.service');

// Import after mocks
import * as child_process from 'child_process';

// Assign mocks using direct casting with correct function signatures
const mockSpawn = child_process.spawn as jest.Mock;
const mockGetCachedSsoToken = getCachedSsoToken as jest.Mock<
	typeof getCachedSsoToken
>;
const mockGetAllAccountsWithRoles = getAllAccountsWithRoles as jest.Mock<
	typeof getAllAccountsWithRoles
>;
const mockGetAwsCredentials = getAwsCredentials as jest.Mock<
	typeof getAwsCredentials
>;

describe('AWS SSO Exec Service Tests', () => {
	const mockValidToken = {
		accessToken: 'valid-token',
		expiresAt: Date.now() / 1000 + 3600,
	};
	const mockCreds: AwsCredentials = {
		accessKeyId: 'key',
		secretAccessKey: 'secret',
		sessionToken: 'token',
		expiration: new Date(Date.now() + 3600 * 1000),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockGetCachedSsoToken.mockResolvedValue(mockValidToken);
		mockGetAwsCredentials.mockResolvedValue(mockCreds);
		mockSpawn.mockReturnValue({
			stdout: {
				on: jest.fn(
					(event: string, cb: (chunk: Buffer | string) => void) => {
						if (event === 'data') cb('Success');
					},
				),
			},
			stderr: { on: jest.fn() },
			on: jest.fn((event: string, cb: (code: number | null) => void) => {
				if (event === 'close') cb(0);
			}),
		});
	});

	it('should execute command successfully after validating account/role', async () => {
		const mockRole: AwsSsoRole = {
			accountId: '123456789012',
			roleName: 'ValidRole',
			roleArn: 'arn:valid',
		};
		const mockAccounts: AwsSsoAccountWithRoles[] = [
			{
				accountId: '123456789012',
				accountName: 'TestAccount',
				roles: [mockRole],
			},
		];
		mockGetAllAccountsWithRoles.mockResolvedValue(mockAccounts);

		const result: CommandExecutionResult = await executeCommand(
			'123456789012',
			'ValidRole',
			['aws', 's3', 'ls'],
		);

		expect(mockGetAllAccountsWithRoles).toHaveBeenCalledTimes(1);
		expect(mockGetAwsCredentials).toHaveBeenCalledWith({
			accountId: '123456789012',
			roleName: 'ValidRole',
		} as GetCredentialsParams);
		expect(mockSpawn).toHaveBeenCalled();
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain('Success');
	});

	it('should throw McpError if account or role validation fails', async () => {
		mockGetAllAccountsWithRoles.mockResolvedValue([
			{
				accountId: '123456789012',
				accountName: 'TestAccount',
				roles: [
					{
						accountId: '123456789012',
						roleName: 'SomeOtherRole',
						roleArn: 'arn:other',
					} as AwsSsoRole,
				],
			},
		]);

		await expect(
			executeCommand('123456789012', 'InvalidRole', ['aws', 's3', 'ls']),
		).rejects.toThrow(
			'Account 123456789012 not found or role InvalidRole not available in that account.',
		);
		expect(mockGetAllAccountsWithRoles).toHaveBeenCalledTimes(1);
		expect(mockGetAwsCredentials).not.toHaveBeenCalled();
		expect(mockSpawn).not.toHaveBeenCalled();
	});
});
