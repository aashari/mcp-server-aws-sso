import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { LoginToolArgsSchema, LoginToolArgsType } from './aws.sso.types.js';
import awsSsoAuthController from '../controllers/aws.sso.auth.controller.js';

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

	// Register the AWS SSO login tool
	server.tool(
		'aws_sso_login',
		`Initiates the AWS SSO device authorization flow to authenticate the user via browser interaction. Browser launch and automatic polling are enabled by default. Set \`launchBrowser: false\` to disable browser launch or \`autoPoll: false\` to disable automatic polling. Returns Markdown with login instructions (URL and code) or success confirmation with available accounts. Must be used before any other AWS SSO tools like \`aws_sso_ls_accounts\` or \`aws_sso_exec_command\`.`,
		LoginToolArgsSchema.shape,
		handleLogin,
	);

	registerLogger.debug('AWS SSO auth tools registered');
}

// Export the register function
export default { registerTools };
