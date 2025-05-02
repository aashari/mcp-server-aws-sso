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
		// Pass pagination and query parameters to the controller
		const response = await awsSsoAccountsController.listAccounts({
			limit: args.limit,
			cursor: args.cursor,
			query: args.query,
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

	// Define schema for the list_accounts tool (ensure consistency with types file)
	const ListAccountsArgs = z.object({
		limit: z
			.number()
			.int()
			.positive()
			.optional()
			.describe(
				'Maximum number of accounts per API response page (default/max may vary)',
			),
		cursor: z
			.string()
			.optional()
			.describe(
				'Pagination token (nextToken from previous page results)',
			),
		query: z
			.string()
			.optional()
			.describe(
				'Search term to filter accounts on the current page by ID, name, or email',
			),
	});

	// Register the AWS SSO list accounts tool
	server.tool(
		'aws_ls_accounts',
		// Update description to reflect per-page filtering and API pagination
		`Lists AWS accounts and associated roles accessible via AWS SSO. \n- Results are fetched page-by-page from the AWS API. \n- Use \`limit\` to suggest page size (API default/max may vary) and \`cursor\` (the nextToken from previous results) to get the next page. \n- Supports filtering the *current page* results with \`query\` (searches ID, name, email). \n- Returns a Markdown list of matching accounts from the current page and pagination info.\n**Note:** Requires prior successful authentication using \`aws_sso_login\`.`,
		ListAccountsArgs.shape,
		handleListAccounts,
	);

	registerLogger.debug('AWS SSO accounts tools registered');
}

// Export the register function
export default { registerTools };
