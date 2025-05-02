import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { getCachedSsoToken } from '../services/vendor.aws.sso.auth.service.js';
import {
	listAccountRoles,
	getAccountsWithRoles, // Use the single-page fetch function
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
	ListAccountsOptions,
} from './aws.sso.accounts.types.js'; // Add ListAccountsOptions
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';

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
 * List all AWS accounts and their roles
 *
 * Retrieves and formats all available AWS accounts and the roles the user
 * can assume in each account via AWS SSO. Groups roles by account for better organization.
 *
 * @async
 * @param {ListAccountsOptions} options - List accounts options
 * @returns {Promise<ControllerResponse>} Response with comprehensive formatted list of accounts and roles
 * @throws {Error} If account listing fails or authentication is required
 * @example
 * // List all accounts and their roles
 * const result = await listAccounts();
 *
 * // List accounts with pagination
 * const result = await listAccounts({ limit: 10, cursor: "next-token-value" });
 */
async function listAccounts(
	options: ListAccountsOptions = {},
): Promise<ControllerResponse> {
	const listLogger = Logger.forContext(
		'controllers/aws.sso.accounts.controller.ts',
		'listAccounts',
	);
	listLogger.debug('Listing AWS SSO accounts via API', options);

	try {
		// --- Authentication Check (remains the same) ---
		const cachedToken = await getCachedSsoToken();
		if (!cachedToken) {
			return {
				content: formatAuthRequired(),
				metadata: { authenticated: false },
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
				metadata: { authenticated: false },
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
				metadata: { authenticated: false },
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

		listLogger.debug('Fetching page of AWS accounts with roles');
		try {
			const accountsResponse = await getAccountsWithRoles({
				maxResults: options.limit, // Let service handle default if undefined
				nextToken: options.cursor,
			});

			// Handle case where API returns no accounts for this page/token
			if (
				!accountsResponse.accountsWithRoles ||
				accountsResponse.accountsWithRoles.length === 0
			) {
				listLogger.debug(
					'No accounts returned from API for this page.',
				);
				return {
					content: formatNoAccounts(), // Use the formatter for consistency
					metadata: { authenticated: true, accounts: [] },
					// Include pagination info even if empty, as API might still have nextToken
					pagination: extractPaginationInfo(
						{
							nextToken: accountsResponse.nextToken,
							accountsWithRoles: [],
						},
						PaginationType.NEXT_TOKEN,
						'AWS SSO Accounts (Empty Page)',
					),
				};
			}

			// --- Apply Client-Side Filtering to the CURRENT page ---
			let pageData = accountsResponse.accountsWithRoles;
			const totalFoundOnPage = pageData.length; // Count before filtering
			if (options.query && options.query.trim() !== '') {
				const searchTerm = options.query.trim().toLowerCase();
				listLogger.debug(
					`Filtering current page with query: ${searchTerm}`,
				);
				pageData = pageData.filter(
					(account) =>
						account.accountId.includes(searchTerm) ||
						account.accountName
							.toLowerCase()
							.includes(searchTerm) ||
						(account.accountEmail &&
							account.accountEmail
								.toLowerCase()
								.includes(searchTerm)),
				);
				listLogger.debug(
					`Found ${pageData.length} accounts on this page after filtering.`,
				);
			}
			// --- End Filtering ---

			const pagination = extractPaginationInfo(
				{
					nextToken: accountsResponse.nextToken,
					accountsWithRoles: accountsResponse.accountsWithRoles, // Pass original array for count
				},
				PaginationType.NEXT_TOKEN,
				'AWS SSO Accounts',
			);
			listLogger.debug('API pagination result', { pagination });

			const formattedContent =
				pageData.length > 0
					? formatAccountsAndRoles(expiresDate, pageData)
					: options.query
						? `No accounts matching query "${options.query}" found on this page.`
						: 'No accounts found on this page.';

			return {
				content: formattedContent,
				pagination,
				metadata: {
					authenticated: true,
					filterApplied: !!options.query,
					accountsOnPageBeforeFilter: totalFoundOnPage,
					accountsOnPageAfterFilter: pageData.length,
				},
			};
		} catch (error) {
			// Handle API errors during account fetching
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
					metadata: { authenticated: false },
				};
			}
			throw error; // Rethrow other API errors
		}
	} catch (error) {
		// Handle broader errors (like auth check failure initially)
		const processedError =
			error instanceof Error ? error : new Error(String(error));
		return handleControllerError(processedError, {
			entityType: 'AWS SSO Accounts',
			operation: 'listing via API', // Update operation description
			source: 'controllers/aws.sso.accounts.controller.ts@listAccounts',
			additionalInfo: {
				query: options.query,
				limit: options.limit,
				cursor: options.cursor,
			},
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
