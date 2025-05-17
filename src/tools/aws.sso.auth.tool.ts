import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	LoginToolArgsSchema,
	LoginToolArgsType,
	StatusToolArgsSchema,
} from './aws.sso.types.js';
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
 * Handles the AWS SSO status tool
 * @returns MCP response with authentication status
 */
async function handleStatus() {
	const statusLogger = Logger.forContext(
		'tools/aws.sso.auth.tool.ts',
		'handleStatus',
	);
	statusLogger.debug('Handling status check request');

	try {
		// Call controller to get auth status
		const response = await awsSsoAuthController.getAuthStatus();

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
		statusLogger.error('Status check failed', error);
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
		`Initiates the AWS SSO device authorization flow to obtain temporary credentials. This flow works as follows:
1. The tool generates a unique user verification code and authentication URL
2. A browser is opened to the AWS SSO login page (if \`launchBrowser: true\`)
3. You enter the verification code in the browser and complete the AWS SSO login
4. The tool receives and caches the token, valid for typically 8-12 hours
5. The cached token is then used by other AWS SSO tools without requiring repeated login

Browser launch behavior can be controlled with \`launchBrowser\` (default: true). When set to false, you must manually open the URL and enter the code.

Automatic polling for completion can be controlled with \`autoPoll\` (default: true). When set to false, the tool returns immediately after starting the flow, and you must use \`aws_sso_status\` to check completion.

Prerequisites:
- AWS SSO must be configured with a start URL and region (via AWS config file or environment variables)
- Browser access is required to complete the authentication flow
- You must have an AWS SSO account with appropriate permissions

Returns Markdown with login instructions or a success confirmation with cached token details.`,
		LoginToolArgsSchema.shape,
		handleLogin,
	);

	// Register the AWS SSO status tool
	server.tool(
		'aws_sso_status',
		`Checks the current AWS SSO authentication status by verifying if a valid cached token exists and its expiration time.

This tool does NOT perform authentication itself - it only checks if you're already authenticated. If no valid token exists, it will instruct you to run \`aws_sso_login\`.

A valid cached token is required for all other AWS SSO commands to work. Use this tool to verify authentication status before using commands like \`aws_sso_ls_accounts\` or \`aws_sso_exec_command\`.

The tool checks:
- If a token exists in the cache
- If the token is still valid (not expired)
- When the token will expire (if valid)

Prerequisites:
- AWS SSO must be configured with a start URL and region (via AWS config file or environment variables)

This tool takes no parameters and returns Markdown with the current authentication status and next steps.`,
		StatusToolArgsSchema.shape,
		handleStatus,
	);

	registerLogger.debug('AWS SSO auth tools registered');
}

// Export the register function
export default { registerTools };
