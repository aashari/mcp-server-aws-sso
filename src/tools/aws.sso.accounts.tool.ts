import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
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
 * @param args Tool arguments including optional pagination parameters
 * @returns MCP response with accounts and roles
 */
async function handleListAccounts(args: ListAccountsToolArgsType) {
	const listAccountsLogger = Logger.forContext(
		'tools/aws.sso.accounts.tool.ts',
		'handleListAccounts',
	);
	listAccountsLogger.debug('Handling list accounts request', args);

	try {
		// Pass pagination parameters to the controller
		const response = await awsSsoAccountsController.listAccounts({
			limit: args.limit,
			cursor: args.cursor,
		});

		return {
			content: [
				{
					type: 'text' as const,
					text: response.content,
				},
			],
			metadata: {
				...(response.metadata || {}),
				pagination: response.pagination,
			},
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
function registerTools(server: McpServer): void {
	const registerLogger = Logger.forContext(
		'tools/aws.sso.accounts.tool.ts',
		'registerTools',
	);
	registerLogger.debug('Registering AWS SSO accounts tools');

	// Define schema for the list_accounts tool
	const ListAccountsArgs = z.object({
		// Add pagination parameters
		limit: z
			.number()
			.optional()
			.describe('Maximum number of accounts to return'),
		cursor: z
			.string()
			.optional()
			.describe('Pagination token for subsequent pages'),
	});

	// Register the AWS SSO list accounts tool
	server.tool(
		'aws_ls_accounts',
		`Lists all AWS accounts and associated roles accessible to the authenticated user via AWS SSO.\n- Use this after login (\`aws_sso_login\`) to discover available accounts and roles for use with \`aws_sso_exec_command\`.\n- Results are paginated with \`limit\` and \`cursor\` parameters.\nReturns a Markdown list of accounts with their available roles.\n**Note:** Requires prior successful authentication using \`aws_sso_login\`.`,
		ListAccountsArgs.shape,
		handleListAccounts,
	);

	registerLogger.debug('AWS SSO accounts tools registered');
}

// Export the register function
export default { registerTools };
