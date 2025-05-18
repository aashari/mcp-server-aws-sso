import { Logger } from '../utils/logger.util.js';
import {
	handleControllerError,
	buildErrorContext,
} from '../utils/error-handler.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { getCachedSsoToken } from '../services/vendor.aws.sso.auth.service.js';
import {
	listAccountRoles,
	getAllAccountsWithRoles,
} from '../services/vendor.aws.sso.accounts.service.js';
import {
	clearSsoToken,
	// getAccountRolesFromCache, // No longer using cache
	// saveAccountRolesToCache,  // No longer using cache
} from '../utils/aws.sso.cache.util.js';
import {
	formatAccountsAndRoles,
	formatNoAccounts,
	formatAuthRequired,
	formatAccountRoles,
} from './aws.sso.accounts.formatter.js';
import {
	ListRolesOptions,
	// ListAccountsOptions, // Removed as it's empty and unused
} from './aws.sso.accounts.types.js';
// Removed unused imports for pagination, defaults, and ListAccountsParams

/**
 * AWS SSO Accounts Controller Module
 *
 * Provides functionality for listing and managing AWS SSO accounts and roles.
 * Handles retrieving account information, listing available roles, and formatting
 * the results for display. All operations require valid AWS SSO authentication.
 */

// Create a module logger
const controllerLogger = Logger.forContext(
	'controllers/aws.sso.accounts.controller.ts',
);

// Log module initialization
controllerLogger.debug('AWS SSO accounts controller initialized');

/**
 * List all AWS accounts and their roles (no pagination)
 *
 * Retrieves and formats all available AWS accounts and the roles the user
 * can assume in each account via AWS SSO. Handles pagination internally.
 *
 * @async
 * @returns {Promise<ControllerResponse>} Response with comprehensive formatted list of accounts and roles.
 * @throws {Error} If account listing fails or authentication is required
 */
async function listAccounts(): Promise<ControllerResponse> {
	const listLogger = Logger.forContext(
		'controllers/aws.sso.accounts.controller.ts',
		'listAccounts',
	);
	listLogger.debug('Listing ALL AWS SSO accounts');

	try {
		// --- Authentication Check ---
		const cachedToken = await getCachedSsoToken();
		if (!cachedToken) {
			return {
				content: formatAuthRequired(),
			};
		}
		if (!cachedToken.accessToken || cachedToken.accessToken.trim() === '') {
			try {
				await clearSsoToken();
			} catch (e) {
				listLogger.error('Error clearing invalid token', e);
			}
			return {
				content: formatAuthRequired(),
			};
		}
		const now = Math.floor(Date.now() / 1000);
		if (cachedToken.expiresAt <= now) {
			try {
				await clearSsoToken();
			} catch (e) {
				listLogger.error('Error clearing expired token', e);
			}
			return {
				content: formatAuthRequired(),
			};
		}
		let expiresDate = 'Unknown';
		try {
			const expirationDate = new Date(cachedToken.expiresAt * 1000);
			expiresDate = expirationDate.toLocaleString();
		} catch (error) {
			listLogger.error('Error formatting expiration date', error);
		}
		// --- End Authentication Check ---

		listLogger.debug(
			'Fetching ALL AWS accounts with roles from service...',
		);
		try {
			// Fetch the complete list from the service
			const allAccountsData = await getAllAccountsWithRoles();
			const totalAccountsFetched = allAccountsData.length;
			listLogger.debug(
				`Fetched ${totalAccountsFetched} accounts in total.`,
			);

			// Handle case where no accounts are found
			if (allAccountsData.length === 0) {
				listLogger.debug('No accounts found after fetching.');
				return {
					content: formatNoAccounts(true),
				};
			}

			// Format the accounts with roles
			const formattedContent = formatAccountsAndRoles(
				expiresDate,
				allAccountsData,
			);

			// Return the content only
			return {
				content: formattedContent,
			};
		} catch (error) {
			// Handle API errors during account fetching (authentication check still applies)
			if (
				error instanceof Error &&
				(error.message.includes('invalid') ||
					error.message.includes('expired') ||
					error.message.includes('session'))
			) {
				listLogger.debug(
					'Token validation failed during API call',
					error,
				);
				return {
					content: formatAuthRequired(),
				};
			}
			throw error; // Rethrow other API errors
		}
	} catch (error) {
		// Handle broader errors
		throw handleControllerError(
			error,
			buildErrorContext(
				'AWS SSO Accounts',
				'listing all',
				'controllers/aws.sso.accounts.controller.ts@listAccounts',
				undefined,
				{
					hasToken: !!(await getCachedSsoToken()),
				},
			),
		);
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
	const listRolesLogger = Logger.forContext(
		'controllers/aws.sso.accounts.controller.ts',
		'listRoles',
	);
	listRolesLogger.debug(`Listing roles for account ${params.accountId}`);

	try {
		// Get roles for account
		const roles = await listAccountRoles({
			accountId: params.accountId,
		});

		return {
			content: formatAccountRoles(params.accountId, roles.roleList),
		};
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'AWS Account Roles',
				'listing',
				'controllers/aws.sso.accounts.controller.ts@listRoles',
				params.accountId,
				{
					accountId: params.accountId,
				},
			),
		);
	}
}

export default {
	listAccounts,
	listRoles,
};
