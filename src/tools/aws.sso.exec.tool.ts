import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { ExecToolArgsType } from './aws.sso.exec.types.js';
import awsSsoExecController from '../controllers/aws.sso.exec.controller.js';
import { parseCommand } from '../utils/command.util.js';
import { z } from 'zod';

// Define tool schema directly here instead of importing
const ExecToolSchema = {
	accountId: z.string().min(12).describe('AWS account ID (12-digit number)'),
	roleName: z.string().min(1).describe('AWS role name to assume via SSO'),
	region: z.string().optional().describe('AWS region to use (optional)'),
	command: z
		.string()
		.min(1)
		.describe('AWS CLI command to execute (e.g., "aws s3 ls")'),
};

/**
 * Execute an AWS CLI command with temporary credentials from SSO
 *
 * This tool gets temporary AWS credentials for the specified account and role
 * via SSO, then executes the AWS CLI command with those credentials. The command
 * output is returned as Markdown, along with execution details like exit code and runtime.
 *
 * @param {ExecToolArgsType} args - Tool arguments including account ID, role name, and command
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} - MCP tool response with formatted command output
 */
async function execTool(args: ExecToolArgsType, _extra: RequestHandlerExtra) {
	const toolLogger = Logger.forContext(
		'tools/aws.sso.exec.tool.ts',
		'execTool',
	);
	toolLogger.debug('AWS SSO exec tool called', {
		accountId: args.accountId,
		roleName: args.roleName,
		command: args.command,
		region: args.region,
	});

	try {
		// Parse the command string properly instead of simple split
		const commandParts = parseCommand(args.command);

		// Call the controller with proper args
		const result = await awsSsoExecController.executeCommand({
			accountId: args.accountId,
			roleName: args.roleName,
			region: args.region,
			command: commandParts,
		});

		// Return the formatted result
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		toolLogger.error('AWS SSO exec tool error', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register the AWS SSO exec tool with the MCP server
 *
 * @param {McpServer} server - MCP server instance to register the tool with
 */
export function register(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/aws.sso.exec.tool.ts',
		'register',
	);
	methodLogger.debug('Registering AWS SSO exec tool');

	server.tool(
		'exec',
		`Execute an AWS CLI command with temporary credentials from AWS SSO.
		
		PURPOSE: Runs AWS CLI commands securely using credentials obtained from AWS SSO without requiring you to handle or store credentials directly.
		
		WHEN TO USE:
		- When you need to run an AWS CLI command with SSO credentials
		- For accessing AWS resources without managing long-term credentials
		- When you want to execute AWS commands from within the AI assistant
		- After logging in to AWS SSO using the 'login' command
		
		WHEN NOT TO USE:
		- When you don't have AWS SSO set up
		- When you need to run commands that require interactive input
		- For running non-AWS commands
		
		RETURNS: Formatted Markdown output with:
		- The command that was executed
		- The command's exit code
		- Standard output and error streams
		- Troubleshooting tips if the command failed
		
		EXAMPLES:
		- List S3 buckets: exec({ accountId: "123456789012", roleName: "ReadOnly", command: "aws s3 ls" })
		- Describe EC2 instances: exec({ accountId: "123456789012", roleName: "AdminRole", command: "aws ec2 describe-instances", region: "us-west-2" })
		
		ERRORS:
		- Authentication errors if AWS SSO login is needed
		- Permission errors if the role doesn't have required permissions
		- AWS CLI errors from the command execution
		
		AUTHENTICATION:
		- Requires a valid AWS SSO session (use 'login' command first)`,
		ExecToolSchema,
		execTool,
	);

	methodLogger.debug('AWS SSO exec tool registered');
}

export default { register };
