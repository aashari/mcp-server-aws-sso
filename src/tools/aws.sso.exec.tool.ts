import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
async function handleExecCommand(args: ExecCommandToolArgsType) {
	const execCommandLogger = Logger.forContext(
		'tools/aws.sso.exec.tool.ts',
		'handleExecCommand',
	);
	execCommandLogger.debug('Handling exec command request', args);

	try {
		// Parse the command string properly instead of simple split
		// const commandParts = parseCommand(args.command); // Removed parsing

		// Call the controller with proper args
		const result = await awsSsoExecController.executeCommand({
			accountId: args.accountId,
			roleName: args.roleName,
			region: args.region,
			command: args.command, // Pass raw string
		});

		// Return the response in MCP format
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
			metadata: result.metadata,
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
	server.tool(
		'aws_sso_exec_command',
		`Executes an AWS CLI command using temporary credentials obtained via AWS SSO for a specific account (\`accountId\`) and role (\`roleName\`). Provide the full command string (starting with 'aws') in the \`command\` parameter. Quotes within the command are handled. Optionally specify the AWS \`region\`. Use to interact with AWS resources programmatically via the CLI. **Note:** Requires prior successful authentication using \`aws_sso_login\` and requires AWS CLI to be installed on the host system where the server is running. Requires AWS SSO to be configured in the environment. Returns formatted stdout, stderr, and exit code of the executed command.`,
		ExecCommandToolArgs.shape,
		handleExecCommand,
	);

	registerLogger.debug('AWS SSO exec tools registered');
}

// Export the register function
export default { registerTools };
