import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { LoginToolArgsType, LoginToolArgsSchema } from './aws.sso.types.js';
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
 * Handles the AWS SSO login process.
 * @param args Tool arguments
 * @returns MCP response
 */
async function handleLogin(args: LoginToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/aws.sso.auth.tool.ts',
		'handleLogin',
	);
	methodLogger.debug('Handling login request', args);

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
		methodLogger.error('Login failed', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register AWS SSO auth tools with the MCP server
 * @param server MCP server instance
 */
export function registerTools(server: McpServer): void {
	const registerLogger = Logger.forContext(
		'tools/aws.sso.auth.tool.ts',
		'registerTools',
	);
	registerLogger.debug('Registering AWS SSO auth tools');

	// Register the AWS SSO login tool
	server.tool(
		'aws_sso_login',
		'Initiates the AWS SSO login flow. Opens a browser for authentication unless `launchBrowser` is false. Polls for completion unless `autoPoll` is false. Returns user code and verification URL if manual interaction is needed.',
		LoginToolArgsSchema.shape,
		handleLogin,
	);

	registerLogger.debug('AWS SSO auth tools registered');
}

// Export the register function
export default { registerTools };
