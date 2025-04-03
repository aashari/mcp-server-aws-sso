import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
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
 * @param _extra Extra request handler information
 * @returns MCP response with login information
 */
async function handleLogin(
	args: LoginToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const loginLogger = Logger.forContext(
		'tools/aws.sso.auth.tool.ts',
		'handleLogin',
	);
	loginLogger.debug('Handling login request', args);

	try {
		// Call controller to start login
		const response = await awsSsoAuthController.startLogin({
			autoPoll: true, // Always automatically poll for token in API mode
			launchBrowser: args.launchBrowser,
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
function register(server: McpServer): void {
	const registerLogger = Logger.forContext(
		'tools/aws.sso.auth.tool.ts',
		'register',
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
	});

	// Register the AWS SSO login tool
	server.tool(
		'login',
		`Authenticate with AWS SSO via browser.

        PURPOSE: Initiates AWS SSO device authorization flow, launching a browser for login, 
        and automatically polls for token completion.

        WHEN TO USE:
        - Before accessing any AWS resources
        - When your authentication token has expired
        - As the first step in any AWS SSO workflow

        WHEN NOT TO USE:
        - When you're already authenticated (unless you explicitly want to reauthenticate)
        
        NOTES:
        - Browser launch can be disabled with launchBrowser: false
        - Authentication flow is PKCE-based with a verification code displayed
        - Temporary credentials are acquired via SSO, not long-term access keys

        RETURNS: Markdown output with either login instructions or authentication success confirmation
        (including available AWS accounts if successfully authenticated).

        EXAMPLES:
        - Basic usage: {}
        - Without browser launch: { launchBrowser: false }

        ERRORS:
        - Browser launch failure: If unable to open browser automatically
        - Authentication timeout: If user doesn't complete authentication in time
        - AWS SSO service errors: If unable to connect to AWS SSO service`,
		LoginArgs.shape,
		handleLogin,
	);

	registerLogger.debug('AWS SSO auth tools registered');
}

// Export the register function
export default { register };
