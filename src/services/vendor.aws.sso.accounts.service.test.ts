import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
	getAllAccountsWithRoles,
	listSsoAccounts,
	listAccountRoles,
} from './vendor.aws.sso.accounts.service';
import { AwsSsoAccountRole } from './aws.sso.types';
import {
	AwsSsoAccountWithRoles,
	ListAccountsResponse,
	ListAccountRolesResponse,
	AwsSsoAccount,
} from './vendor.aws.sso.types.js';

// Mock dependencies
jest.mock('./vendor.aws.sso.auth.service');
jest.mock('../utils/aws.sso.cache.util.ts');

// Import *after* mocks
import { getCachedSsoToken } from './vendor.aws.sso.auth.service';
import {
	getCachedAccountRoles,
	saveAccountRoles,
} from '../utils/aws.sso.cache.util.js';

// Assign mocks using direct casting with correct function signatures
const mockListSsoAccounts = listSsoAccounts as jest.Mock<
	typeof listSsoAccounts
>;
const mockListAccountRoles = listAccountRoles as jest.Mock<
	typeof listAccountRoles
>;
const mockGetCachedSsoToken = getCachedSsoToken as jest.Mock<
	typeof getCachedSsoToken
>;
const mockGetCachedAccountRoles = getCachedAccountRoles as jest.Mock<
	typeof getCachedAccountRoles
>;
const mockSaveAccountRoles = saveAccountRoles as jest.Mock<
	typeof saveAccountRoles
>;

// Mock the module to override implementations
jest.mock('./vendor.aws.sso.accounts.service', () => {
	const actual = jest.requireActual('./vendor.aws.sso.accounts.service');
	return {
		// Keep actual implementation for the function we are testing
		getAllAccountsWithRoles: actual.getAllAccountsWithRoles,
		// Provide mocks for functions called INTERNALLY by getAllAccountsWithRoles
		listSsoAccounts: mockListSsoAccounts,
		listAccountRoles: mockListAccountRoles,
		getAwsCredentials: actual.getAwsCredentials, // Keep actual for other potential tests
	};
});

describe('AWS SSO Accounts Service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetCachedSsoToken.mockResolvedValue({
			accessToken: 'valid-token',
			expiresAt: Date.now() / 1000 + 3600,
		});
	});

	describe('getAllAccountsWithRoles', () => {
		it('should return all accounts and roles, handling pagination', async () => {
			mockListSsoAccounts
				.mockResolvedValueOnce({
					accountList: [
						{
							accountId: '111',
							accountName: 'Acc1',
						} as AwsSsoAccount,
					],
					nextToken: 'token1',
				} as ListAccountsResponse)
				.mockResolvedValueOnce({
					accountList: [
						{
							accountId: '222',
							accountName: 'Acc2',
						} as AwsSsoAccount,
					],
					nextToken: undefined,
				} as ListAccountsResponse);

			mockListAccountRoles
				.mockResolvedValueOnce({
					roleList: [{ roleName: 'RoleA' }],
					nextToken: undefined,
				} as ListAccountRolesResponse)
				.mockResolvedValueOnce({
					roleList: [{ roleName: 'RoleB' }, { roleName: 'RoleC' }],
					nextToken: undefined,
				} as ListAccountRolesResponse);

			mockGetCachedAccountRoles.mockResolvedValue([]);

			const result = await getAllAccountsWithRoles(); // Call the actual (partially mocked) function

			expect(result).toHaveLength(2);
			expect(mockListSsoAccounts).toHaveBeenCalledTimes(2);
			expect(mockListAccountRoles).toHaveBeenCalledTimes(2);
			expect(mockGetCachedAccountRoles).toHaveBeenCalledTimes(2);
			expect(mockSaveAccountRoles).toHaveBeenCalledTimes(2);
		});

		it('should use cached roles when available', async () => {
			mockListSsoAccounts.mockResolvedValueOnce({
				accountList: [
					{ accountId: '111', accountName: 'Acc1' } as AwsSsoAccount,
				],
				nextToken: undefined,
			} as ListAccountsResponse);

			const cachedRoles: AwsSsoAccountRole[] = [
				{
					accountId: '111',
					roleName: 'CachedRoleA',
					roleArn: 'arn:cached',
				},
			];
			mockGetCachedAccountRoles.mockResolvedValue(cachedRoles);

			const result = await getAllAccountsWithRoles();

			expect(result).toHaveLength(1);
			expect(mockListSsoAccounts).toHaveBeenCalledTimes(1);
			expect(mockListAccountRoles).not.toHaveBeenCalled();
			expect(mockGetCachedAccountRoles).toHaveBeenCalledWith('111');
			expect(mockSaveAccountRoles).not.toHaveBeenCalled();
		});
	});

	// TODO: Add back tests for listSsoAccounts, listAccountRoles, getAwsCredentials if needed
});
