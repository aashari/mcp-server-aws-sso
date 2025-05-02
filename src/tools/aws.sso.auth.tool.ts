import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { LoginToolArgsType } from './aws.sso.types.js';
import awsSsoAuthController from '../controllers/aws.sso.auth.controller.js';
import { z } from 'zod';

/**
 * AWS SSO Authentication Tool Module
 *
 * Provides MCP tools for authenticating with AWS SSO and managing authentication state.
 * These tools enable AI models to initiate the login flow and verify authentication status.
 */

// Create a module logger
const toolLogger = Logger.forContext('tools/aws.sso.auth.tool.ts');

// Log module initialization
toolLogger.debug('AWS SSO authentication tool module initialized');

/**
 * Handles the AWS SSO login tool
 * @param args Tool arguments
 * @returns MCP response with login information
 */
async function handleLogin(args: LoginToolArgsType) {
	const loginLogger = Logger.forContext(
		'tools/aws.sso.auth.tool.ts',
		'handleLogin',
	);
	loginLogger.debug('Handling login request', args);

	try {
		// Call controller to start login, passing launchBrowser argument
		const response = await awsSsoAuthController.startLogin({
			autoPoll: args.autoPoll, // Use the argument from the tool call
			launchBrowser: args.launchBrowser, // Pass the arg from the tool call
		});

		// Return the response in the MCP format
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
		loginLogger.error('Login failed', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register AWS SSO auth tools with the MCP server
 * @param server MCP server instance
 */
function registerTools(server: McpServer): void {
	const registerLogger = Logger.forContext(
		'tools/aws.sso.auth.tool.ts',
		'registerTools',
	);
	registerLogger.debug('Registering AWS SSO auth tools');

	// Define schema for the login tool
	const LoginArgs = z.object({
		launchBrowser: z
			.boolean()
			.optional()
			.default(true)
			.describe(
				'Whether to automatically launch a browser for authentication (default: true)',
			),
		autoPoll: z
			.boolean()
			.optional()
			.default(true) // Match CLI default
			.describe(
				'Automatically poll for token completion after user browser interaction (default: true). Setting to false is primarily for testing/debugging.',
			),
	});

	// Register the AWS SSO login tool
	server.tool(
		'aws_sso_login',
		`Initiates the AWS SSO device authorization flow to authenticate the user via browser interaction. Can optionally control browser launch with \`launchBrowser\` and automatic polling with \`autoPoll\`. Returns Markdown with login instructions (URL and code) or success confirmation with available accounts. Must be used before any other AWS SSO tools like \`aws_sso_list_accounts\` or \`aws_sso_exec_command\`.`,
		LoginArgs.shape,
		handleLogin,
	);

	registerLogger.debug('AWS SSO auth tools registered');
}

// Export the register function
export default { registerTools };
