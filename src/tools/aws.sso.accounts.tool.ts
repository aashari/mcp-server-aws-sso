import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { ListAccountsToolArgsType } from './aws.sso.types.js';
import awsSsoAccountsController from '../controllers/aws.sso.accounts.controller.js';
import { z } from 'zod';

/**
 * AWS SSO Accounts Tool Module
 *
 * Provides MCP tools for listing and exploring AWS accounts and roles
 * available through AWS SSO. These tools enable AI models to discover and
 * access AWS resources with temporary credentials.
 */

// Create a module logger
const toolLogger = Logger.forContext('tools/aws.sso.accounts.tool.ts');

// Log module initialization
toolLogger.debug('AWS SSO accounts tool module initialized');

/**
 * Handles the AWS SSO list accounts tool
 * Lists all available AWS accounts and their roles
 * @param _args Tool arguments (none required)
 * @param _extra Extra request handler information
 * @returns MCP response with accounts and roles
 */
async function handleListAccounts(
	_args: ListAccountsToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const listAccountsLogger = Logger.forContext(
		'tools/aws.sso.accounts.tool.ts',
		'handleListAccounts',
	);
	listAccountsLogger.debug('Handling list accounts request');

	try {
		const response = await awsSsoAccountsController.listAccounts();

		return {
			content: [
				{
					type: 'text' as const,
					text: response.content,
				},
			],
			metadata: response.metadata,
		};
	} catch (error) {
		listAccountsLogger.error('List accounts failed', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register AWS SSO accounts tools with the MCP server
 * @param server MCP server instance
 */
function register(server: McpServer): void {
	const registerLogger = Logger.forContext(
		'tools/aws.sso.accounts.tool.ts',
		'register',
	);
	registerLogger.debug('Registering AWS SSO accounts tools');

	// Define schema for the list_accounts tool
	const ListAccountsArgs = z.object({
		// No parameters - always list all accounts with all roles
	});

	// Register the AWS SSO list accounts tool
	server.tool(
		'list_accounts',
		`List all AWS accounts and roles available via SSO.

        PURPOSE: Provides a comprehensive view of all AWS accounts you have access to via SSO,
        along with the roles available in each account.

        WHEN TO USE:
        - After authenticating with AWS SSO
        - When you need to see all available accounts and roles in one view
        - To get an overview of your AWS SSO access permissions

        WHEN NOT TO USE:
        - Before authenticating with AWS SSO
        
        NOTES:
        - Results are cached to avoid rate limits with the AWS SSO API
        - This tool automatically retrieves all roles for all accounts in a single call

        RETURNS: Markdown output with a detailed list of all accounts and the roles available in each account.

        EXAMPLES:
        - List all accounts and roles: {}

        ERRORS:
        - Authentication required: You must login first using login
        - Rate limiting: If you have a large number of accounts, the AWS API may return rate limit errors`,
		ListAccountsArgs.shape,
		handleListAccounts,
	);

	registerLogger.debug('AWS SSO accounts tools registered');
}

// Export the register function
export default { register };
