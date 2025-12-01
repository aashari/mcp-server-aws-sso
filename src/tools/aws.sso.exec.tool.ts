import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ExecCommandToolArgs,
	ExecCommandToolArgsType,
} from './aws.sso.types.js';
import awsSsoExecController from '../controllers/aws.sso.exec.controller.js';

/**
 * AWS SSO Execution Tool Module
 *
 * Provides MCP tools for executing AWS CLI commands with temporary credentials
 * obtained through AWS SSO. These tools enable AI models to interact with AWS
 * resources using secure, time-limited credentials.
 */

// Create a module logger
const toolLogger = Logger.forContext('tools/aws.sso.exec.tool.ts');

// Log module initialization
toolLogger.debug('AWS SSO execution tool module initialized');

/**
 * Handles the AWS SSO exec tool
 * Executes AWS CLI commands with credentials from AWS SSO
 * @param args Tool arguments with account info and command
 * @returns MCP response with command execution results
 */
async function handleExecCommand(args: Record<string, unknown>) {
	const execCommandLogger = Logger.forContext(
		'tools/aws.sso.exec.tool.ts',
		'handleExecCommand',
	);
	execCommandLogger.debug('Handling exec command request', args);

	try {
		// Pass args directly to the controller
		const result = await awsSsoExecController.executeCommand(
			args as ExecCommandToolArgsType,
		);

		// Return the response in MCP format without metadata
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		execCommandLogger.error('Exec failed', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register AWS SSO exec tools with the MCP server
 * @param server MCP server instance
 */
function registerTools(server: McpServer): void {
	const registerLogger = Logger.forContext(
		'tools/aws.sso.exec.tool.ts',
		'registerTools',
	);
	registerLogger.debug('Registering AWS SSO exec tools');

	const EXEC_COMMAND_DESCRIPTION = `Execute AWS CLI command using temporary credentials from AWS SSO.

Workflow:
1. Verifies valid AWS SSO authentication token
2. Obtains temporary credentials for account and role
3. Executes the AWS CLI command
4. Caches credentials for future use (1 hour)

Prerequisites:
- MUST first authenticate using \`aws_sso_login\`
- AWS CLI MUST be installed on the system
- AWS SSO must be configured

Required: \`accountId\`, \`roleName\`, \`command\`
Optional: \`region\`

Returns: Execution context, command output, errors, exit code`;

	// Register the AWS SSO exec command tool using modern registerTool API
	server.registerTool(
		'aws_sso_exec_command',
		{
			title: 'AWS SSO Execute Command',
			description: EXEC_COMMAND_DESCRIPTION,
			inputSchema: ExecCommandToolArgs,
		},
		handleExecCommand,
	);

	registerLogger.debug('AWS SSO exec tools registered');
}

// Export the register function
export default { registerTools };
