import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListAccountsArgsSchema,
	ListAccountsArgsType,
} from './aws.sso.types.js';
import awsSsoAccountsController from '../controllers/aws.sso.accounts.controller.js';

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
 * @param args Tool arguments (empty for this tool)
 * @returns MCP response with accounts and roles
 */
async function handleListAccounts(args: ListAccountsArgsType) {
	const listAccountsLogger = Logger.forContext(
		'tools/aws.sso.accounts.tool.ts',
		'handleListAccounts',
	);
	listAccountsLogger.debug('Handling list accounts request', args);

	try {
		// Call controller with no arguments
		const response = await awsSsoAccountsController.listAccounts();

		return {
			content: [
				{
					type: 'text' as const,
					text: response.content,
				},
			],
			metadata: {
				// No pagination or query info to return
				...(response.metadata || {}),
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

	// Register the AWS SSO list accounts tool
	server.tool(
		'aws_sso_ls_accounts',
		`Lists all AWS accounts and roles accessible to you through AWS SSO. This tool provides essential information needed for the \`aws_sso_exec_command\` tool.

The tool handles the following:
- Verifies you have a valid AWS SSO authentication token
- Fetches all accessible accounts with their IDs, names, and email addresses
- Retrieves all available roles for each account that you can assume
- Handles pagination internally to return the complete list in a single call
- Caches account and role information for better performance

The information returned includes:
- Account ID (12-digit number required for \`aws_sso_exec_command\`)
- Account name and email
- Available role names (required for \`aws_sso_exec_command\`)

Prerequisites:
- You MUST first authenticate successfully using \`aws_sso_login\`
- AWS SSO must be configured with a start URL and region
- Your AWS SSO permissions determine which accounts and roles are visible

No parameters are required. Returns a comprehensive Markdown list of all accounts and roles accessible to you through AWS SSO.`,
		ListAccountsArgsSchema.shape,
		handleListAccounts,
	);

	registerLogger.debug('AWS SSO accounts tools registered');
}

// Export the register function
export default { registerTools };
