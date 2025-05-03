/**
 * AWS SSO accounts vendor service
 */
import { Logger } from '../utils/logger.util.js';
import { createAuthMissingError, createApiError } from '../utils/error.util.js';
import {
	getCachedCredentials,
	saveCachedCredentials,
	getCachedAccountRoles,
	saveAccountRoles,
} from '../utils/aws.sso.cache.util.js';
import {
	AwsSsoAccountWithRoles,
	AwsCredentials,
	GetCredentialsParams,
	ListAccountsParams,
	ListAccountsResponse,
	ListAccountRolesParams,
	ListAccountRolesResponse,
	AwsSsoAccount,
	AwsSsoRole,
} from './vendor.aws.sso.types.js';
import { AwsSsoAccountRole } from './aws.sso.types.js';
import { getCachedSsoToken } from './vendor.aws.sso.auth.service.js';
import {
	SSOClient,
	GetRoleCredentialsCommand,
	ListAccountRolesCommand,
	ListAccountsCommand,
} from '@aws-sdk/client-sso';

const logger = Logger.forContext('services/vendor.aws.sso.accounts.service.ts');

/**
 * List AWS SSO accounts for the authenticated user
 *
 * Retrieves the list of AWS accounts that the user has access to via SSO.
 * Requires an active SSO token.
 *
 * @param {ListAccountsParams} [params={}] - Optional parameters for customizing the request
 * @param {number} [params.maxResults] - Maximum number of accounts to return
 * @param {string} [params.nextToken] - Pagination token for subsequent requests
 * @returns {Promise<ListAccountsResponse>} List of AWS SSO accounts and pagination token if available
 * @throws {Error} If SSO token is missing or API request fails
 */
async function listSsoAccounts(
	params: ListAccountsParams = {},
): Promise<ListAccountsResponse> {
	const methodLogger = logger.forMethod('listSsoAccounts');
	methodLogger.debug('Listing AWS SSO accounts', params);

	// Get SSO token
	const token = await getCachedSsoToken();
	if (!token) {
		throw createAuthMissingError('No SSO token found. Please login first.');
	}

	try {
		// Use AWS SDK to list accounts instead of direct API call
		const region = token.region || 'us-east-1';

		// Create SSO client with proper region
		const ssoClient = new SSOClient({
			region: region,
			maxAttempts: 3,
		});

		// Configure command with proper parameters
		const command = new ListAccountsCommand({
			accessToken: token.accessToken,
			maxResults: params.maxResults,
			nextToken: params.nextToken,
		});

		// Execute command to get accounts
		methodLogger.debug('Requesting accounts list using AWS SDK');
		const response = await ssoClient.send(command);

		// Convert response to expected format with type handling
		const accountList: AwsSsoAccount[] = (response.accountList || []).map(
			(account) => ({
				accountId: account.accountId || '',
				accountName: account.accountName || '',
				accountEmail: account.emailAddress,
			}),
		);

		const result: ListAccountsResponse = {
			accountList,
			nextToken: response.nextToken,
		};

		methodLogger.debug(
			`Retrieved ${result.accountList.length} accounts${
				result.nextToken ? ' with pagination token' : ''
			}`,
		);

		return result;
	} catch (error) {
		methodLogger.error('Failed to list accounts', error);
		throw createApiError(
			`Failed to list AWS accounts: ${error instanceof Error ? error.message : String(error)}`,
			undefined,
			error,
		);
	}
}

/**
 * List roles for a specific AWS SSO account
 *
 * Retrieves the list of roles that the user can assume in the specified AWS account.
 * Requires an active SSO token.
 *
 * @param {ListAccountRolesParams} params - Parameters for the request
 * @param {string} params.accountId - AWS account ID to list roles for
 * @param {number} [params.maxResults] - Maximum number of roles to return
 * @param {string} [params.nextToken] - Pagination token for subsequent requests
 * @returns {Promise<ListAccountRolesResponse>} List of AWS SSO roles and pagination token if available
 * @throws {Error} If SSO token is missing or API request fails
 */
async function listAccountRoles(
	params: ListAccountRolesParams,
): Promise<ListAccountRolesResponse> {
	const methodLogger = logger.forMethod('listAccountRoles');
	methodLogger.debug('Listing AWS SSO account roles', params);

	// Validate required parameters
	if (!params.accountId) {
		throw new Error('Account ID is required');
	}

	// Get SSO token
	const token = await getCachedSsoToken();
	if (!token) {
		throw createAuthMissingError('No SSO token found. Please login first.');
	}

	try {
		// Use AWS SDK to list roles instead of direct API call
		const region = token.region || 'us-east-1';

		// Create SSO client with proper region
		const ssoClient = new SSOClient({
			region: region,
			maxAttempts: 3,
		});

		// Configure command with proper parameters
		const command = new ListAccountRolesCommand({
			accessToken: token.accessToken,
			accountId: params.accountId,
			maxResults: params.maxResults,
			nextToken: params.nextToken,
		});

		// Execute command to get roles
		methodLogger.debug('Requesting roles list using AWS SDK');
		const response = await ssoClient.send(command);

		// Convert response to expected format
		const result: ListAccountRolesResponse = {
			roleList: response.roleList || [],
			nextToken: response.nextToken,
		};

		methodLogger.debug(
			`Retrieved ${result.roleList.length} roles for account ${params.accountId}${
				result.nextToken ? ' with pagination token' : ''
			}`,
		);

		return result;
	} catch (error) {
		methodLogger.error('Failed to list roles', error);
		throw createApiError(
			`Failed to list roles for account ${params.accountId}: ${error instanceof Error ? error.message : String(error)}`,
			undefined,
			error,
		);
	}
}

/**
 * Get temporary AWS credentials for a role via SSO
 *
 * Retrieves temporary AWS credentials for the specified account and role.
 * Requires an active SSO token.
 *
 * @param {GetCredentialsParams} params - Parameters for the request
 * @param {string} params.accountId - AWS account ID
 * @param {string} params.roleName - Role name to assume
 * @param {string} [params.region] - Optional AWS region override
 * @returns {Promise<AwsCredentials>} Temporary AWS credentials
 * @throws {Error} If SSO token is missing or API request fails
 */
async function getAwsCredentials(
	params: GetCredentialsParams,
): Promise<AwsCredentials> {
	const methodLogger = logger.forMethod('getAwsCredentials');
	methodLogger.debug('Getting AWS credentials', {
		accountId: params.accountId,
		roleName: params.roleName,
	});

	// Validate required parameters
	if (!params.accountId || !params.roleName) {
		throw new Error('Account ID and role name are required');
	}

	// First, check if we have cached credentials
	const cachedCreds = await getCachedCredentials(
		params.accountId,
		params.roleName,
	);
	if (cachedCreds) {
		const now = new Date();
		// Allow a 5-minute buffer before expiration
		const expiration = new Date(cachedCreds.expiration);
		const bufferMs = 5 * 60 * 1000; // 5 minutes in milliseconds

		if (expiration.getTime() - now.getTime() > bufferMs) {
			methodLogger.debug('Using cached credentials', {
				accountId: params.accountId,
				roleName: params.roleName,
				expiration: expiration.toISOString(),
			});

			// Ensure we have the right type
			const credentials: AwsCredentials = {
				accessKeyId: cachedCreds.accessKeyId,
				secretAccessKey: cachedCreds.secretAccessKey,
				sessionToken: cachedCreds.sessionToken,
				expiration: new Date(cachedCreds.expiration),
			};

			return credentials;
		}

		methodLogger.debug('Cached credentials are expiring soon, refreshing', {
			expiration: expiration.toISOString(),
		});
	}

	// Get SSO token
	const token = await getCachedSsoToken();
	if (!token) {
		throw createAuthMissingError('No SSO token found. Please login first.');
	}

	try {
		// Use AWS SDK to get credentials instead of direct API call
		const region = params.region || token.region || 'us-east-1';

		// Create SSO client with proper region
		const ssoClient = new SSOClient({
			region: region,
			maxAttempts: 3,
		});

		// Configure command with proper parameters
		const command = new GetRoleCredentialsCommand({
			accessToken: token.accessToken,
			accountId: params.accountId,
			roleName: params.roleName,
		});

		// Execute command to get credentials
		methodLogger.debug('Requesting temporary credentials using AWS SDK');
		const response = await ssoClient.send(command);

		if (!response.roleCredentials) {
			throw new Error('No credentials returned from AWS SSO');
		}

		// Create credentials object from response
		const credentials: AwsCredentials = {
			accessKeyId: response.roleCredentials.accessKeyId!,
			secretAccessKey: response.roleCredentials.secretAccessKey!,
			sessionToken: response.roleCredentials.sessionToken!,
			expiration: new Date(response.roleCredentials.expiration!),
		};

		// Cache the credentials
		await saveCachedCredentials(
			params.accountId,
			params.roleName,
			credentials,
		);

		return credentials;
	} catch (error) {
		methodLogger.error('Failed to get AWS credentials', error);
		throw createApiError(
			`Failed to get AWS credentials: ${error instanceof Error ? error.message : String(error)}`,
			undefined,
			error,
		);
	}
}

/**
 * Get ALL AWS accounts with their available roles, handling pagination internally.
 *
 * Retrieves a combined view of all accounts and their roles that the user has access to.
 * This function loops through all pages of accounts and roles, utilizing caching for roles.
 *
 * @returns {Promise<AwsSsoAccountWithRoles[]>} Complete list of AWS accounts with their roles
 * @throws {Error} If SSO token is missing or API request fails
 */
async function getAllAccountsWithRoles(): Promise<AwsSsoAccountWithRoles[]> {
	const methodLogger = logger.forMethod('getAllAccountsWithRoles');
	methodLogger.debug(
		'Getting ALL AWS SSO accounts with roles (using cache)...',
	);

	const allAccountsWithRoles: AwsSsoAccountWithRoles[] = [];
	let accountsNextToken: string | undefined;

	do {
		const accountsResponse = await listSsoAccounts({
			nextToken: accountsNextToken,
		});
		const accounts = accountsResponse.accountList;
		accountsNextToken = accountsResponse.nextToken;

		methodLogger.debug(
			`Fetched page of ${accounts.length} accounts. Next token: ${accountsNextToken ? 'Yes' : 'No'}`,
		);

		for (const account of accounts) {
			try {
				// --- Check Cache First (Uses AwsSsoAccountRole[]) ---
				const rolesFromCache: AwsSsoAccountRole[] =
					await getCachedAccountRoles(account.accountId);
				if (rolesFromCache && rolesFromCache.length > 0) {
					methodLogger.debug(
						`Using cached roles for account ${account.accountId}`,
					);
					// Map cached roles (AwsSsoAccountRole[]) to the expected AwsSsoRole[]
					const mappedCachedRoles: AwsSsoRole[] = rolesFromCache.map(
						(role) => ({
							accountId: account.accountId,
							roleName: role.roleName,
							roleArn:
								role.roleArn ||
								`arn:aws:iam::${account.accountId}:role/${role.roleName}`,
						}),
					);
					allAccountsWithRoles.push({
						...account,
						roles: mappedCachedRoles,
					});
					continue;
				} else {
					methodLogger.debug(
						`No valid cached roles found for account ${account.accountId}, fetching...`,
					);
				}
				// --- End Cache Check ---

				let allRolesForAccountApi: {
					roleName?: string;
					roleArn?: string;
				}[] = []; // SDK RoleInfo type
				let rolesNextToken: string | undefined;

				do {
					const rolesResponse = await listAccountRoles({
						accountId: account.accountId,
						nextToken: rolesNextToken,
					});
					allRolesForAccountApi = allRolesForAccountApi.concat(
						rolesResponse.roleList || [],
					);
					rolesNextToken = rolesResponse.nextToken;
					methodLogger.debug(
						`Fetched page of roles for account ${account.accountId}. Next token: ${rolesNextToken ? 'Yes' : 'No'}`,
					);
				} while (rolesNextToken);

				// Map fetched roles (RoleInfo[]) to AwsSsoRole[] for the return type
				const formattedRoles: AwsSsoRole[] = allRolesForAccountApi.map(
					(role) => ({
						accountId: account.accountId,
						roleName: role.roleName || '',
						roleArn:
							role.roleArn ||
							`arn:aws:iam::${account.accountId}:role/${role.roleName || ''}`,
					}),
				);

				allAccountsWithRoles.push({
					...account,
					roles: formattedRoles,
				});

				// --- Save Fetched Roles to Cache ---
				// Map formattedRoles (AwsSsoRole[]) back to AwsSsoAccountRole[]
				const rolesToCache: AwsSsoAccountRole[] = formattedRoles.map(
					(role) => ({
						accountId: role.accountId,
						roleName: role.roleName,
						roleArn: role.roleArn,
					}),
				);
				await saveAccountRoles(account, rolesToCache);
				// --- End Save Cache ---
			} catch (error) {
				methodLogger.warn(
					`Error getting roles for account ${account.accountId}, including account with empty roles list.`,
					error,
				);
				// Include account even if role fetching fails, but with empty roles
				allAccountsWithRoles.push({
					...account,
					roles: [],
				});
			}
		}
	} while (accountsNextToken);

	methodLogger.debug(
		`Retrieved a total of ${allAccountsWithRoles.length} accounts with their roles.`,
	);

	return allAccountsWithRoles;
}

export {
	listSsoAccounts,
	listAccountRoles,
	getAwsCredentials,
	getAllAccountsWithRoles,
	getCachedCredentials,
};
