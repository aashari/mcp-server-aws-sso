import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { getCachedSsoToken } from '../services/vendor.aws.sso.auth.service.js';
import {
	getAccountsWithRoles,
	listAccountRoles,
} from '../services/vendor.aws.sso.accounts.service.js';
import { clearSsoToken } from '../utils/aws.sso.cache.util.js';
import {
	formatAccountsAndRoles,
	formatNoAccounts,
	formatAuthRequired,
	formatAccountRoles,
} from './aws.sso.accounts.formatter.js';
import { ListRolesOptions } from './aws.sso.accounts.types.js';

/**
 * AWS SSO Accounts Controller Module
 *
 * Provides functionality for listing and managing AWS SSO accounts and roles.
 * Handles retrieving account information, listing available roles, and formatting
 * the results for display. All operations require valid AWS SSO authentication.
 */

// Create a module logger
const moduleLogger = Logger.forContext(
	'controllers/aws.sso.accounts.controller.ts',
);

// Log module initialization
moduleLogger.debug('AWS SSO accounts controller initialized');

/**
 * List all AWS accounts and their roles
 *
 * Retrieves and formats all available AWS accounts and the roles the user
 * can assume in each account via AWS SSO. Groups roles by account for better organization.
 *
 * @async
 * @returns {Promise<ControllerResponse>} Response with comprehensive formatted list of accounts and roles
 * @throws {Error} If account listing fails or authentication is required
 * @example
 * // List all accounts and their roles
 * const result = await listAccounts();
 */
async function listAccounts(): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/aws.sso.accounts.controller.ts',
		'listAccounts',
	);
	methodLogger.debug('Listing AWS SSO accounts and roles');

	try {
		// First check if we have a valid token
		const cachedToken = await getCachedSsoToken();
		if (!cachedToken) {
			// No token found, user needs to authenticate
			methodLogger.debug('No SSO token found, authentication required');
			return {
				content: formatAuthRequired(),
				metadata: {
					authenticated: false,
				},
			};
		}

		// Verify token has an access token
		if (!cachedToken.accessToken || cachedToken.accessToken.trim() === '') {
			methodLogger.error('Cached token has empty access token');

			// Clear invalid token and ask for re-authentication
			try {
				await clearSsoToken();
				methodLogger.debug('Cleared invalid empty token');
			} catch (clearError) {
				methodLogger.error('Error clearing invalid token', clearError);
			}

			return {
				content: formatAuthRequired(),
				metadata: {
					authenticated: false,
				},
			};
		}

		// We have a token, validate it's not expired
		const now = Math.floor(Date.now() / 1000);
		if (cachedToken.expiresAt <= now) {
			methodLogger.debug('SSO token is expired, authentication required');

			// Clear expired token
			try {
				await clearSsoToken();
				methodLogger.debug('Cleared expired token');
			} catch (clearError) {
				methodLogger.error('Error clearing expired token', clearError);
			}

			return {
				content: formatAuthRequired(),
				metadata: {
					authenticated: false,
				},
			};
		}

		// Format expiration date for display
		let expiresDate = 'Unknown';
		try {
			const expirationDate = new Date(cachedToken.expiresAt * 1000);
			expiresDate = expirationDate.toLocaleString();
		} catch (error) {
			methodLogger.error('Error formatting expiration date', error);
		}

		// Get accounts with roles
		console.log(
			'Retrieving AWS accounts and roles. This may take a moment...',
		);
		methodLogger.debug('Getting AWS accounts with roles');

		try {
			// Check if we already have cached account roles data
			const cacheUtil = await import('../utils/aws.sso.cache.util.js');
			const cachedAccounts = await cacheUtil.getAccountRolesFromCache();

			if (cachedAccounts && cachedAccounts.length > 0) {
				methodLogger.debug('Using account roles from cache');

				// Map the cached accounts to the format expected by the formatter
				// The cache uses {account: {...}, roles: [...]} format, but we need it flattened
				const formattedAccountsWithRoles = cachedAccounts.map(
					(item) => ({
						...item.account,
						roles: item.roles,
						timestamp: Date.now(),
					}),
				);

				return {
					content: formatAccountsAndRoles(
						expiresDate,
						formattedAccountsWithRoles,
					),
					metadata: {
						authenticated: true,
						accounts: formattedAccountsWithRoles.map((account) => ({
							accountId: account.accountId,
							accountName: account.accountName,
							accountEmail: account.emailAddress, // Note: different property name in cache
							roles: account.roles,
						})),
					},
				};
			}

			// If no cached data or cache is empty, get accounts with roles from API
			methodLogger.debug(
				'No cached account roles, fetching from AWS SSO API',
			);

			// Get accounts with roles
			const accountsWithRoles = await getAccountsWithRoles({
				// Use the access token from the cached token
				// The vendor implementation expects a params object, not just the token
			});

			if (accountsWithRoles.length === 0) {
				methodLogger.debug('No accounts found');
				return {
					content: formatNoAccounts(),
					metadata: {
						authenticated: true,
						accounts: [],
					},
				};
			}

			// Format the accounts with roles for the response
			// The vendor implementation returns a different format compared to the non-vendor one
			const formattedAccountsWithRoles = accountsWithRoles.map(
				(account) => ({
					...account,
					timestamp: Date.now(),
				}),
			);

			// Return accounts and roles
			return {
				content: formatAccountsAndRoles(
					expiresDate,
					formattedAccountsWithRoles,
				),
				metadata: {
					authenticated: true,
					accounts: formattedAccountsWithRoles.map((account) => ({
						accountId: account.accountId,
						accountName: account.accountName,
						accountEmail: account.accountEmail,
						roles: account.roles,
					})),
				},
			};
		} catch (error) {
			// If we get an error about invalid/expired token, show auth required message
			if (
				error instanceof Error &&
				(error.message.includes('invalid') ||
					error.message.includes('expired') ||
					error.message.includes('session'))
			) {
				methodLogger.debug(
					'Token validation failed, authentication required',
					error,
				);
				return {
					content: formatAuthRequired(),
					metadata: {
						authenticated: false,
					},
				};
			}

			// For other errors, pass through to general error handler
			throw error;
		}
	} catch (error) {
		return handleControllerError(error, {
			entityType: 'AWS SSO Accounts',
			operation: 'listing',
			source: 'controllers/aws.sso.accounts.controller.ts@listAccounts',
		});
	}
}

/**
 * List roles available for a specified AWS account
 *
 * Retrieves and formats all IAM roles the authenticated user can assume
 * in a specific AWS account via SSO.
 *
 * @async
 * @param {ListRolesOptions} params - Role listing parameters
 * @returns {Promise<ControllerResponse>} Response with formatted list of available roles
 * @throws {Error} If role listing fails or authentication is invalid
 * @example
 * // List roles for account 123456789012
 * const result = await listRoles({
 *   accessToken: "token-value",
 *   accountId: "123456789012"
 * });
 */
async function listRoles(
	params: ListRolesOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/aws.sso.accounts.controller.ts',
		'listRoles',
	);
	methodLogger.debug(`Listing roles for account ${params.accountId}`);

	try {
		// Get roles for account
		const roles = await listAccountRoles({
			accountId: params.accountId,
		});

		return {
			content: formatAccountRoles(params.accountId, roles.roleList),
			metadata: {
				roles: roles.roleList,
			},
		};
	} catch (error) {
		return handleControllerError(error, {
			entityType: 'AWS Account Roles',
			entityId: params.accountId,
			operation: 'listing',
			source: 'controllers/aws.sso.accounts.controller.ts@listRoles',
		});
	}
}

export default {
	listAccounts,
	listRoles,
};
