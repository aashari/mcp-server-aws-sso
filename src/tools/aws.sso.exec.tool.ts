import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { ExecToolArgsType } from './aws.sso.exec.types.js';
import awsSsoExecController from '../controllers/aws.sso.exec.controller.js';
import { parseCommand } from '../utils/command.util.js';
import { z } from 'zod';

/**
 * AWS SSO Execution Tool Module
 *
 * Provides MCP tools for executing AWS CLI commands with temporary credentials
 * obtained through AWS SSO. These tools enable AI models to interact with AWS
 * resources using secure, time-limited credentials.
 */

// Create a module logger
const moduleLogger = Logger.forContext('tools/aws.sso.exec.tool.ts');

// Log module initialization
moduleLogger.debug('AWS SSO execution tool module initialized');

/**
 * Handles the AWS SSO exec tool
 * Executes AWS CLI commands with credentials from AWS SSO
 * @param args Tool arguments with account info and command
 * @param _extra Extra request handler information
 * @returns MCP response with command execution results
 */
async function handleExec(args: ExecToolArgsType, _extra: RequestHandlerExtra) {
	const methodLogger = Logger.forContext(
		'tools/aws.sso.exec.tool.ts',
		'handleExec',
	);
	methodLogger.debug('Handling exec request', args);

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
		methodLogger.error('Exec failed', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register AWS SSO exec tools with the MCP server
 * @param server MCP server instance
 */
function register(server: McpServer): void {
	const methodLogger = Logger.forContext(
		'tools/aws.sso.exec.tool.ts',
		'register',
	);
	methodLogger.debug('Registering AWS SSO exec tools');

	// Define schema for the exec tool
	const ExecArgs = z.object({
		accountId: z
			.string()
			.min(1)
			.describe(
				'AWS account ID to get credentials for (12-digit number)',
			),
		roleName: z.string().min(1).describe('IAM role name to assume via SSO'),
		region: z
			.string()
			.optional()
			.describe(
				'AWS region to use for the command (overrides default region)',
			),
		command: z
			.string()
			.min(1)
			.describe('AWS CLI command to execute (e.g., "aws s3 ls")'),
	});

	// Register the AWS SSO exec tool
	server.tool(
		'exec',
		`Execute AWS CLI commands using temporary credentials from AWS SSO.

        PURPOSE: Run AWS CLI commands with credentials automatically obtained from AWS SSO.
        
        WHEN TO USE:
        - After authenticating with AWS SSO via login
        - When you need to interact with AWS resources via the CLI
        - When you need temporary credentials for specific accounts and roles
        
        WHEN NOT TO USE:
        - Before authenticating with AWS SSO
        - For non-AWS commands
        
        NOTES:
        - Credentials are obtained just-in-time for the command execution
        - Commands are executed with proper AWS environment variables set
        - The command must start with "aws" to use the AWS CLI
        - Quotes within commands are handled properly
        
        RETURNS: Markdown output with command results, including stdout, stderr, and exit code
        
        EXAMPLES:
        - List S3 buckets: { accountId: "123456789012", roleName: "ReadOnlyAccess", command: "aws s3 ls" }
        - Describe EC2 instances in a region: { accountId: "123456789012", roleName: "PowerUserAccess", region: "us-west-2", command: "aws ec2 describe-instances" }
        - Complex command with quotes: { accountId: "123456789012", roleName: "ReadOnlyAccess", command: "aws ec2 describe-instances --filters \\"Name=instance-state-name,Values=running\\"" }

        ERRORS:
        - Authentication required: You must login first using login
        - Invalid credentials: The accountId/roleName combination is invalid or you lack permission
        - Command errors: The AWS CLI command itself may return errors`,
		ExecArgs.shape,
		handleExec,
	);

	methodLogger.debug('AWS SSO exec tools registered');
}

// Export the register function
export default { register };
