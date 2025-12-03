import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { truncateForAI } from '../utils/formatter.util.js';
import {
	Ec2ExecCommandToolArgs,
	Ec2ExecCommandToolArgsType,
} from './aws.sso.types.js';
import awsSsoEc2Controller from '../controllers/aws.sso.ec2.controller.js';

/**
 * AWS SSO EC2 Execution Tool Module
 *
 * Provides MCP tools for executing shell commands on EC2 instances via SSM
 * with temporary credentials from AWS SSO. Enables AI systems to run
 * commands on EC2 instances without SSH or direct network access.
 */

// Create a module logger
const toolLogger = Logger.forContext('tools/aws.sso.ec2.tool.ts');

// Log module initialization
toolLogger.debug('AWS SSO EC2 execution tool module initialized');

/**
 * Handles the AWS SSO EC2 exec tool
 * Executes shell commands on EC2 instances via SSM with credentials from AWS SSO
 * @param args Tool arguments with instance info and command
 * @returns MCP response with command execution results
 */
async function handleEc2ExecCommand(args: Record<string, unknown>) {
	const ec2ExecCommandLogger = Logger.forContext(
		'tools/aws.sso.ec2.tool.ts',
		'handleEc2ExecCommand',
	);
	ec2ExecCommandLogger.debug('Handling EC2 exec command request', args);

	try {
		// Pass args directly to the controller
		const result = await awsSsoEc2Controller.executeEc2Command(
			args as Ec2ExecCommandToolArgsType,
		);

		// Return the response in MCP format without metadata
		return {
			content: [
				{
					type: 'text' as const,
					text: truncateForAI(result.content, result.rawResponsePath),
				},
			],
		};
	} catch (error) {
		ec2ExecCommandLogger.error('EC2 exec failed', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register AWS SSO EC2 exec tools with the MCP server
 * @param server MCP server instance
 */
function registerTools(server: McpServer): void {
	const registerLogger = Logger.forContext(
		'tools/aws.sso.ec2.tool.ts',
		'registerTools',
	);
	registerLogger.debug('Registering AWS SSO EC2 exec tools');

	const EC2_EXEC_DESCRIPTION = `Execute shell command on EC2 instance via SSM using AWS SSO credentials.

No SSH access or inbound ports required. Uses SSM's RunShellScript document.

Prerequisites:
- MUST first authenticate using \`aws_sso_login\`
- EC2 instance MUST have SSM Agent installed
- Instance needs IAM role with AmazonSSMManagedInstanceCore policy
- Your role needs \`ssm:SendCommand\` and \`ssm:GetCommandInvocation\` permissions

Required: \`instanceId\`, \`accountId\`, \`roleName\`, \`command\`
Optional: \`region\`

Returns: Execution context, command output, errors, troubleshooting guidance`;

	// Register the AWS SSO EC2 exec command tool using modern registerTool API
	server.registerTool(
		'aws_sso_ec2_exec_command',
		{
			title: 'AWS SSO EC2 Execute Command',
			description: EC2_EXEC_DESCRIPTION,
			inputSchema: Ec2ExecCommandToolArgs,
		},
		handleEc2ExecCommand,
	);

	registerLogger.debug('AWS SSO EC2 exec tools registered');
}

// Export the register function
export default { registerTools };
