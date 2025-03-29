import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { ControllerResponse } from '../types/common.types.js';
import awsSsoService from '../services/aws.sso.service.js';
import {
	formatAccountsAndRoles,
	formatNoAccounts,
	formatAuthRequired,
	formatAccountRoles,
} from './aws.sso.accounts.formatter.js';

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
		const cachedToken = await awsSsoService.getCachedSsoToken();
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
				await awsSsoService.clearSsoToken();
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
				await awsSsoService.clearSsoToken();
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

		// Get accounts with roles (uses caching internally)
		console.log(
			'Retrieving AWS accounts and roles. This may take a moment...',
		);
		methodLogger.debug('Getting AWS accounts with roles');

		try {
			// Make sure we're using the token directly
			const accessToken = cachedToken.accessToken;

			// Log token information (without exposing the actual token)
			methodLogger.debug('Using access token', {
				accessTokenLength: accessToken?.length || 0,
				accessTokenFirst10Chars:
					accessToken?.substring(0, 10) || 'none',
				accessTokenType: typeof accessToken,
			});

			// Get accounts with roles
			const accountsWithRoles =
				await awsSsoService.getAccountsWithRoles(accessToken);

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

			// Add timestamp to each result
			const formattedAccountsWithRoles = accountsWithRoles.map(
				(item) => ({
					...item,
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
					accounts: formattedAccountsWithRoles.map(
						({ account, roles }) => ({
							...account,
							roles,
						}),
					),
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
 * @param {Object} params - Role listing parameters
 * @param {string} params.accessToken - AWS SSO access token
 * @param {string} params.accountId - AWS account ID to list roles for
 * @returns {Promise<ControllerResponse>} Response with formatted list of available roles
 * @throws {Error} If role listing fails or authentication is invalid
 * @example
 * // List roles for account 123456789012
 * const result = await listRoles({
 *   accessToken: "token-value",
 *   accountId: "123456789012"
 * });
 */
async function listRoles(params: {
	accessToken: string;
	accountId: string;
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/aws.sso.accounts.controller.ts',
		'listRoles',
	);
	methodLogger.debug(`Listing roles for account ${params.accountId}`);

	try {
		// Get roles for account
		const roles = await awsSsoService.listAccountRoles(
			params.accessToken,
			params.accountId,
		);

		return {
			content: formatAccountRoles(params.accountId, roles),
			metadata: {
				roles,
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
	formatAccountRoles,
};
