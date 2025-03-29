import {
	SSOClient,
	ListAccountsCommand,
	ListAccountRolesCommand,
	GetRoleCredentialsCommand,
} from '@aws-sdk/client-sso';
import { AwsCredentials, RoleInfo } from './vendor.aws.sso.types.js';
import * as ssoCache from '../utils/aws.sso.cache.util.js';
import { getAwsSsoConfig } from './vendor.aws.sso.auth.service.js';
import { Logger } from '../utils/logger.util.js';
import { createApiError } from '../utils/error.util.js';
import { AwsSsoAccount, AwsSsoAccountRole } from './aws.sso.types.js';

const logger = Logger.forContext('services/aws.sso.accounts.service.ts');
const { clearSsoToken } = ssoCache;

/**
 * List AWS accounts accessible via SSO
 * @param accessToken SSO access token
 * @returns Array of AWS accounts
 */
export async function listSsoAccounts(
	accessToken: string,
): Promise<AwsSsoAccount[]> {
	const methodLogger = Logger.forContext(
		'services/aws.sso.accounts.service.ts',
		'listSsoAccounts',
	);
	methodLogger.debug('Listing SSO accounts');

	// Verify we have a valid access token
	if (!accessToken || accessToken.trim() === '') {
		methodLogger.error('Access token is empty or missing');
		throw createApiError(
			'Invalid or missing AWS SSO access token. Please login again.',
		);
	}

	// Get SSO configuration - make sure we use the right region
	const ssoConfig = await getAwsSsoConfig();
	methodLogger.debug('Using AWS SSO configuration', {
		region: ssoConfig.region,
	});

	// For debugging only - log token details without exposing the actual token
	methodLogger.debug('Access token details', {
		length: accessToken?.length || 0,
		firstChars: accessToken?.substring(0, 5) || 'none',
	});

	// Create SSO client with the appropriate region and retries
	const ssoClient = new SSOClient({
		region: ssoConfig.region,
		maxAttempts: 3,
	});

	try {
		// Call the AWS SSO API to list accounts
		const command = new ListAccountsCommand({
			accessToken,
			maxResults: 100, // Increased from 50 to get more accounts
		});

		methodLogger.debug('Sending ListAccountsCommand to AWS SSO');
		const response = await ssoClient.send(command);

		if (!response.accountList || response.accountList.length === 0) {
			methodLogger.debug('No accounts found');
			return [];
		}

		methodLogger.debug(`Found ${response.accountList.length} SSO accounts`);

		// Map API response to our interface
		return response.accountList.map((account) => ({
			accountId: account.accountId || '',
			accountName: account.accountName || '',
			emailAddress: account.emailAddress,
		}));
	} catch (error: unknown) {
		methodLogger.error('Failed to list SSO accounts', error);

		// If we get an unauthorized error, consider the token invalid
		if (
			error &&
			typeof error === 'object' &&
			(('name' in error &&
				(error.name === 'UnauthorizedException' ||
					error.name === 'InvalidRequestException')) ||
				('message' in error &&
					typeof error.message === 'string' &&
					(error.message.includes('token') ||
						error.message.includes('Token') ||
						error.message.includes('unauthorized') ||
						error.message.includes('Unauthorized'))))
		) {
			// Clear the cached token so we'll try to authenticate again next time
			try {
				// Clear saved token
				await clearSsoToken();
				methodLogger.debug('Cleared invalid SSO token');
			} catch (clearError) {
				methodLogger.error('Error clearing invalid token', clearError);
			}

			throw createApiError(
				`Your AWS SSO session is invalid or expired. Please login again.`,
			);
		}

		throw createApiError(
			`Failed to list AWS accounts: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * List roles for a specific AWS account
 * @param accessToken SSO access token
 * @param accountId AWS account ID
 * @returns Array of AWS account roles
 */
export async function listAccountRoles(
	accessToken: string,
	accountId: string,
): Promise<AwsSsoAccountRole[]> {
	const methodLogger = Logger.forContext(
		'services/aws.sso.accounts.service.ts',
		'listAccountRoles',
	);
	methodLogger.debug(`Listing roles for account ${accountId}`);

	// Get SSO configuration - make sure we use the right region
	const ssoConfig = await getAwsSsoConfig();
	methodLogger.debug('Using AWS SSO configuration', {
		region: ssoConfig.region,
	});

	// Create SSO client with the appropriate region and retries
	const ssoClient = new SSOClient({
		region: ssoConfig.region,
		maxAttempts: 3,
	});

	try {
		const response = await ssoClient.send(
			new ListAccountRolesCommand({
				accessToken,
				accountId,
				maxResults: 100, // Increased from 50 to get more roles
			}),
		);

		if (!response.roleList || response.roleList.length === 0) {
			methodLogger.debug(`No roles found for account ${accountId}`);
			return [];
		}

		methodLogger.debug(
			`Found ${response.roleList.length} roles for account ${accountId}`,
		);

		// Map API response to our interface with type safety
		return response.roleList.map((roleInfo: RoleInfo) => ({
			accountId,
			roleName: roleInfo.roleName || '',
			roleArn:
				roleInfo.roleArn ??
				`arn:aws:iam::${accountId}:role/${roleInfo.roleName || ''}`,
		}));
	} catch (error) {
		methodLogger.error(
			`Failed to list roles for account ${accountId}`,
			error,
		);

		// If we get an unauthorized error, consider the token invalid
		if (
			error &&
			typeof error === 'object' &&
			'name' in error &&
			(error.name === 'UnauthorizedException' ||
				error.name === 'InvalidRequestException')
		) {
			// Clear the cached token so we'll try to authenticate again next time
			try {
				// Clear saved token
				await clearSsoToken();
				methodLogger.debug('Cleared invalid SSO token');
			} catch (clearError) {
				methodLogger.error('Error clearing invalid token', clearError);
			}

			throw createApiError(
				`Your AWS SSO session is invalid or expired. Please login again.`,
			);
		}

		throw createApiError(
			`Failed to list roles for account ${accountId}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Get AWS credentials for a specific role
 * @param accessToken AWS SSO access token
 * @param accountId AWS account ID
 * @param roleName AWS role name
 * @returns AWS credentials
 */
export async function getAwsCredentials(
	accessToken: string,
	accountId: string,
	roleName: string,
): Promise<AwsCredentials> {
	logger.debug(
		`Getting AWS credentials for account ${accountId}, role ${roleName}`,
	);

	try {
		// Get SSO configuration
		const ssoConfig = await getAwsSsoConfig();

		// Create SSO client
		const ssoClient = new SSOClient({ region: ssoConfig.region });

		// Get role credentials using GetRoleCredentialsCommand (not CreateTokenCommand)
		const command = new GetRoleCredentialsCommand({
			accessToken,
			accountId,
			roleName,
		});

		const response = await ssoClient.send(command);

		if (!response.roleCredentials) {
			throw new Error('No credentials returned from AWS SSO');
		}

		// Create credentials object
		const credentials: AwsCredentials = {
			accessKeyId: response.roleCredentials.accessKeyId!,
			secretAccessKey: response.roleCredentials.secretAccessKey!,
			sessionToken: response.roleCredentials.sessionToken!,
			expiration: new Date(response.roleCredentials.expiration!),
		};

		// Create a regionInfo object for the cache
		const regionInfo = {
			region: ssoConfig.region,
		};

		// Cache credentials for later use with region info
		await ssoCache.saveCachedCredentials(accountId, roleName, {
			...credentials,
			...regionInfo,
		});

		logger.debug(
			`Got credentials for account ${accountId}, role ${roleName}, expiring at ${credentials.expiration.toISOString()}`,
		);
		return credentials;
	} catch (error) {
		logger.error(
			`Error getting credentials for account ${accountId}, role ${roleName}`,
			error,
		);
		throw error;
	}
}

/**
 * Get a list of accounts with their available roles
 * @param accessToken AWS SSO access token
 * @returns List of accounts with roles
 */
export async function getAccountsWithRoles(
	accessToken: string,
): Promise<{ account: AwsSsoAccount; roles: AwsSsoAccountRole[] }[]> {
	const methodLogger = Logger.forContext(
		'services/aws.sso.accounts.service.ts',
		'getAccountsWithRoles',
	);
	methodLogger.debug('Getting AWS accounts with roles');

	try {
		// Get accounts, using cache if available
		const cachedAccounts = await ssoCache.getCachedAccounts();
		let accounts: AwsSsoAccount[];

		if (cachedAccounts.length === 0) {
			methodLogger.debug('No accounts in cache, fetching from AWS SSO');
			accounts = await listSsoAccounts(accessToken);

			// If no accounts were found, return empty result early
			if (accounts.length === 0) {
				methodLogger.debug('No accounts found from AWS SSO');
				return [];
			}

			// Save to cache for next time
			await ssoCache.saveAccounts(accounts);
		} else {
			methodLogger.debug(
				`Found ${cachedAccounts.length} accounts in cache`,
			);
			accounts = cachedAccounts;
		}

		// Get roles for each account
		const result = [];
		for (const account of accounts) {
			methodLogger.debug(
				`Getting roles for account ${account.accountId}`,
			);

			// Try to get roles from cache first
			const cachedRoles = await ssoCache.getCachedAccountRoles(
				account.accountId,
			);
			let roles: AwsSsoAccountRole[];

			if (cachedRoles.length === 0) {
				methodLogger.debug(
					`No roles in cache for account ${account.accountId}, fetching from AWS SSO`,
				);
				// Fetch roles if not in cache
				try {
					roles = await listAccountRoles(
						accessToken,
						account.accountId,
					);
					// Save to cache for next time
					await ssoCache.saveAccountRoles(account, roles);
				} catch (error) {
					methodLogger.error(
						`Error fetching roles for account ${account.accountId}`,
						error,
					);
					// Continue with other accounts if one fails
					continue;
				}
			} else {
				methodLogger.debug(
					`Found ${cachedRoles.length} roles in cache for account ${account.accountId}`,
				);
				roles = cachedRoles;
			}

			result.push({ account, roles });
		}

		methodLogger.debug(
			`Got ${result.length} accounts with roles (total ${result.reduce(
				(sum, item) => sum + item.roles.length,
				0,
			)} roles)`,
		);
		return result;
	} catch (error) {
		methodLogger.error('Error getting accounts with roles', error);
		throw error;
	}
}

/**
 * Get cached AWS credentials or fetch new ones if needed
 * @param accountId AWS account ID
 * @param roleName AWS role name
 * @returns AWS credentials or undefined if not available
 */
export async function getCachedCredentials(
	accountId: string,
	roleName: string,
): Promise<AwsCredentials | undefined> {
	logger.debug(
		`Getting cached credentials for account ${accountId}, role ${roleName}`,
	);

	try {
		// Get cached credentials
		const cachedCreds = await ssoCache.getCachedCredentials(
			accountId,
			roleName,
		);
		if (!cachedCreds) {
			return undefined;
		}

		// Return the credentials directly as they're already in the right format
		return cachedCreds;
	} catch (error) {
		logger.error(
			`Error getting cached credentials for account ${accountId}, role ${roleName}`,
			error,
		);
		return undefined;
	}
}
