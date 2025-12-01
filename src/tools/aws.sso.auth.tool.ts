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
async function handleLogin(args: Record<string, unknown>) {
	const loginLogger = Logger.forContext(
		'tools/aws.sso.auth.tool.ts',
		'handleLogin',
	);
	loginLogger.debug('Handling login request', args);

	try {
		// Pass args directly to the controller without setting defaults here
		// The controller should handle all defaults
		const response = await awsSsoAuthController.startLogin(
			args as LoginToolArgsType,
		);

		loginLogger.debug('Login process completed', {
			responseLength: response.content.length,
		});

		// Return the response in the MCP format
		return {
			content: [
				{
					type: 'text' as const,
					text: response.content,
				},
			],
		};
	} catch (error) {
		// Log the error with full details for diagnostics
		loginLogger.error('AWS SSO login failed', error);

		// Format the error for MCP tool response
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

		// Return the response in the MCP format without metadata
		return {
			content: [
				{
					type: 'text' as const,
					text: response.content,
				},
			],
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

	// Tool descriptions
	const LOGIN_DESCRIPTION = `Initiate AWS SSO device authorization flow to obtain temporary credentials.

This flow works as follows:
1. Generates a unique user verification code and authentication URL
2. Opens a browser to AWS SSO login page (if \`launchBrowser: true\`)
3. You enter the verification code and complete AWS SSO login
4. Background polling automatically collects and caches the token
5. The cached token is used by other AWS SSO tools

**IMPORTANT FOR AI ASSISTANTS**: When the tool returns authentication instructions:
- ALWAYS check if a browser window opened automatically
- If browser opened: Guide the user to complete authentication
- If no browser opened: Instruct user to manually open the URL and enter code
- Always provide both the verification code and URL as backup

Prerequisites:
- AWS SSO must be configured with a start URL and region
- Browser access is required for authentication
- You must have an AWS SSO account with appropriate permissions

Returns: Authentication status, session details, verification code and URL`;

	// Register the AWS SSO login tool using modern registerTool API
	server.registerTool(
		'aws_sso_login',
		{
			title: 'AWS SSO Login',
			description: LOGIN_DESCRIPTION,
			inputSchema: LoginToolArgsSchema,
		},
		handleLogin,
	);

	const STATUS_DESCRIPTION = `Check current AWS SSO authentication status.

Verifies if a valid cached token exists and its expiration time. Does NOT perform authentication - only checks status. If no valid token exists, instructs you to run \`aws_sso_login\`.

Use before calling \`aws_sso_ls_accounts\` or \`aws_sso_exec_command\`.

Returns: Authentication status, session details, expiration time, next steps`;

	// Register the AWS SSO status tool using modern registerTool API
	server.registerTool(
		'aws_sso_status',
		{
			title: 'AWS SSO Status',
			description: STATUS_DESCRIPTION,
			inputSchema: StatusToolArgsSchema,
		},
		handleStatus,
	);

	registerLogger.debug('AWS SSO auth tools registered');
}

// Export the register function
export default { registerTools };
