/**
 * AWS SSO accounts vendor service
 */
import { Logger } from '../utils/logger.util.js';
import { createAuthMissingError, createApiError } from '../utils/error.util.js';
import { fetchApi } from '../utils/transport.util.js';
import {
	getCachedCredentials,
	saveCachedCredentials,
} from '../utils/aws.sso.cache.util.js';
import {
	AwsSsoAccountWithRoles,
	AwsCredentials,
	GetCredentialsParams,
	ListAccountsParams,
	ListAccountsResponse,
	ListAccountRolesParams,
	ListAccountRolesResponse,
} from './vendor.aws.sso.types.js';
import { getCachedSsoToken } from './vendor.aws.sso.auth.service.js';
import { SSOClient, GetRoleCredentialsCommand } from '@aws-sdk/client-sso';

/**
 * Base API path for AWS SSO API
 * @constant {string}
 */
const SSO_API_PATH = 'https://portal.sso.%region%.amazonaws.com';

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

	// Build query parameters
	const queryParams = new URLSearchParams();
	if (params.maxResults) {
		queryParams.set('max-results', params.maxResults.toString());
	}
	if (params.nextToken) {
		queryParams.set('next-token', params.nextToken);
	}

	// Build URL with region
	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const region = token.region || 'us-east-1'; // Default to us-east-1 if region is undefined
	const baseUrl = SSO_API_PATH.replace('%region%', region);
	const url = `${baseUrl}/assignment/accounts${queryString}`;

	// Send request
	methodLogger.debug(`Sending request to: ${url}`);
	const response = await fetchApi<ListAccountsResponse>(url, {
		headers: {
			Authorization: `Bearer ${token.accessToken}`,
		},
	});

	methodLogger.debug(
		`Retrieved ${response.accountList.length} accounts${
			response.nextToken ? ' with pagination token' : ''
		}`,
	);

	return response;
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

	// Build query parameters
	const queryParams = new URLSearchParams();
	if (params.maxResults) {
		queryParams.set('max-results', params.maxResults.toString());
	}
	if (params.nextToken) {
		queryParams.set('next-token', params.nextToken);
	}

	// Build URL with region
	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const region = token.region || 'us-east-1'; // Default to us-east-1 if region is undefined
	const baseUrl = SSO_API_PATH.replace('%region%', region);
	const url = `${baseUrl}/assignment/accounts/${params.accountId}/roles${queryString}`;

	// Send request
	methodLogger.debug(`Sending request to: ${url}`);
	const response = await fetchApi<ListAccountRolesResponse>(url, {
		headers: {
			Authorization: `Bearer ${token.accessToken}`,
		},
	});

	methodLogger.debug(
		`Retrieved ${response.roleList.length} roles for account ${params.accountId}${
			response.nextToken ? ' with pagination token' : ''
		}`,
	);

	return response;
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
 * Get all AWS accounts with their available roles
 *
 * Retrieves a combined view of all accounts and their roles that the user has access to.
 * This is a convenience function that combines listSsoAccounts and listAccountRoles.
 *
 * @param {ListAccountsParams} [params={}] - Optional parameters for customizing the request
 * @param {number} [params.maxResults] - Maximum number of accounts to return
 * @param {string} [params.nextToken] - Pagination token for subsequent requests
 * @returns {Promise<AwsSsoAccountWithRoles[]>} List of AWS accounts with their roles
 * @throws {Error} If SSO token is missing or API request fails
 */
async function getAccountsWithRoles(
	params: ListAccountsParams = {},
): Promise<AwsSsoAccountWithRoles[]> {
	const methodLogger = logger.forMethod('getAccountsWithRoles');
	methodLogger.debug('Getting all AWS SSO accounts with roles', params);

	// Get accounts
	const accountsResponse = await listSsoAccounts(params);
	const accounts = accountsResponse.accountList;

	// Get roles for each account
	const accountsWithRoles: AwsSsoAccountWithRoles[] = [];
	for (const account of accounts) {
		try {
			const rolesResponse = await listAccountRoles({
				accountId: account.accountId,
			});

			accountsWithRoles.push({
				...account,
				roles: rolesResponse.roleList.map((role) => ({
					accountId: account.accountId,
					roleName: role.roleName || '',
					roleArn:
						role.roleArn ||
						`arn:aws:iam::${account.accountId}:role/${role.roleName || ''}`,
				})),
			});
		} catch (error) {
			methodLogger.warn(
				`Error getting roles for account ${account.accountId}`,
				error,
			);
			// Include account with empty roles array
			accountsWithRoles.push({
				...account,
				roles: [],
			});
		}
	}

	methodLogger.debug(
		`Retrieved ${accountsWithRoles.length} accounts with roles`,
	);
	return accountsWithRoles;
}

export {
	listSsoAccounts,
	listAccountRoles,
	getAwsCredentials,
	getAccountsWithRoles,
	getCachedCredentials,
};
