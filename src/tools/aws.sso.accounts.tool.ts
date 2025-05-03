import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
// Imports removed as they are no longer used
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

	// Define schema - Now empty as no arguments are needed
	const ListAccountsArgsSchema = z.object({});

	// Register the AWS SSO list accounts tool
	server.tool(
		'aws_sso_ls_accounts',
		// Update description to remove query filter
		`Lists ALL AWS accounts and associated roles accessible via AWS SSO. Fetches the complete list, handling pagination internally. \n- Returns a Markdown list of all accessible accounts.\n**Note:** Requires prior successful authentication using \`aws_sso_login\`.`,
		ListAccountsArgsSchema.shape,
		handleListAccounts,
	);

	registerLogger.debug('AWS SSO accounts tools registered');
}

// Export the register function
export default { registerTools };
