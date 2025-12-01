import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { ListAccountsArgsSchema } from './aws.sso.types.js';
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
 * @returns MCP response with accounts and roles
 */
async function handleListAccounts() {
	const listAccountsLogger = Logger.forContext(
		'tools/aws.sso.accounts.tool.ts',
		'handleListAccounts',
	);
	listAccountsLogger.debug('Handling list accounts request');

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

	const LIST_ACCOUNTS_DESCRIPTION = `List all AWS accounts and roles accessible through AWS SSO.

Provides essential information needed for \`aws_sso_exec_command\`:
- Fetches all accessible accounts with IDs, names, and emails
- Retrieves all available roles for each account
- Handles pagination internally
- Caches account and role information

Prerequisites:
- MUST first authenticate using \`aws_sso_login\`
- AWS SSO must be configured with a start URL and region

Returns: Account list with IDs, names, roles, and session status`;

	// Register the AWS SSO list accounts tool using modern registerTool API
	server.registerTool(
		'aws_sso_ls_accounts',
		{
			title: 'AWS SSO List Accounts',
			description: LIST_ACCOUNTS_DESCRIPTION,
			inputSchema: ListAccountsArgsSchema,
		},
		handleListAccounts,
	);

	registerLogger.debug('AWS SSO accounts tools registered');
}

// Export the register function
export default { registerTools };
