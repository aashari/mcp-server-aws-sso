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
		limit: z
			.number()
			.int()
			.positive()
			.optional()
			.describe('Maximum number of accounts to return per page'),
		cursor: z
			.string()
			.optional()
			.describe('Start index for pagination (0-based)'),
		query: z
			.string()
			.optional()
			.describe(
				'Search term to filter cached accounts by ID, name, or email',
			),
	});

	// Register the AWS SSO list accounts tool
	server.tool(
		'aws_ls_accounts',
		`Lists AWS accounts and roles from a local cache. \n- Use login command (\`aws_sso_login\`) first to populate/refresh the cache. \n- This might take time during login if you have many accounts. \n- Supports filtering with \`query\` (searches ID, name, email) and pagination with \`limit\` and \`cursor\` (start index).\n- Returns a Markdown list of matching accounts and their roles.`,
		ListAccountsArgs.shape,
		handleListAccounts,
	);

	registerLogger.debug('AWS SSO accounts tools registered');
}

// Export the register function
export default { registerTools };
