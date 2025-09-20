import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
	ServerNotification,
	ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ExecCommandToolArgs,
	ExecCommandToolArgsType,
} from './aws.sso.types.js';
import awsSsoExecController from '../controllers/aws.sso.exec.controller.js';
// import { parseCommand } from '../utils/command.util.js'; // No longer needed

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
async function handleExecCommand(
	args: ExecCommandToolArgsType,
	_extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
) {
	const execCommandLogger = Logger.forContext(
		'tools/aws.sso.exec.tool.ts',
		'handleExecCommand',
	);
	execCommandLogger.debug('Handling exec command request', args);

	try {
		// Pass args directly to the controller
		const result = await awsSsoExecController.executeCommand(args);

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

	// Register the AWS SSO exec command tool
	server.tool<typeof ExecCommandToolArgs.shape>(
		'aws_sso_exec_command',
		`Executes an AWS CLI command using temporary credentials obtained through AWS SSO. This tool enables you to run AWS CLI commands without manually configuring credentials.

How it works:
1. Verifies you have a valid AWS SSO authentication token
2. Obtains temporary credentials for the specified account and role
3. Sets up the environment with those credentials
4. Executes the AWS CLI command you specified
5. Caches credentials for the account/role combination for future use (typically valid for 1 hour)

Critical prerequisites:
- You MUST first authenticate using \`aws_sso_login\` to obtain a valid token
- AWS CLI MUST be installed on the system where the MCP server is running
- AWS SSO must be configured with a start URL and region
- You must have permissions to assume the specified role in the specified account

Required parameters:
- \`accountId\`: The 12-digit AWS account ID (get from \`aws_sso_ls_accounts\`)
- \`roleName\`: The IAM role name to assume (get from \`aws_sso_ls_accounts\`)
- \`command\`: The full AWS CLI command to execute (e.g., "aws s3 ls")

Optional parameters:
- \`region\`: AWS region to use for the command (defaults to configured region)

For complex commands with quoting, ensure proper escaping (e.g., "aws ec2 describe-instances --filters 'Name=tag:Name,Values=MyInstance'").

Returns comprehensive Markdown output that includes:
- Execution context (account, role, region)
- Command output (stdout)
- Error messages if any (stderr)
- Exit code (0 for success, non-zero for failure)
- Suggested alternative roles if permission errors occur`,
		ExecCommandToolArgs.shape,
		handleExecCommand,
	);

	registerLogger.debug('AWS SSO exec tools registered');
}

// Export the register function
export default { registerTools };
