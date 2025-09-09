import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
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
					text: result.content,
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

	// Register the AWS SSO EC2 exec command tool
	server.tool(
		'aws_sso_ec2_exec_command',
		`Executes a shell command on an EC2 instance via AWS Systems Manager (SSM) using temporary credentials obtained through AWS SSO. This tool enables running commands on EC2 instances without requiring SSH access or opening inbound ports.

How it works:
1. Verifies you have a valid AWS SSO authentication token
2. Obtains temporary credentials for the specified account and role
3. Sends the command to the EC2 instance via SSM's RunShellScript document
4. Polls for command completion (up to 20 seconds)
5. Returns the command output and execution status

Critical prerequisites:
- You MUST first authenticate using \`aws_sso_login\` to obtain a valid token
- The EC2 instance MUST have the SSM Agent installed and running
- The instance MUST have an IAM role with the AmazonSSMManagedInstanceCore policy
- Your AWS role MUST have permissions for \`ssm:SendCommand\` and \`ssm:GetCommandInvocation\`
- AWS SSO must be configured with a start URL and region

Required parameters:
- \`instanceId\`: The EC2 instance ID (e.g., "i-1234567890abcdef0")
- \`accountId\`: The 12-digit AWS account ID (get from \`aws_sso_ls_accounts\`)
- \`roleName\`: The IAM role name to assume (get from \`aws_sso_ls_accounts\`)
- \`command\`: The shell command to execute (e.g., "ls -l", "whoami", "df -h")

Optional parameters:
- \`region\`: AWS region where the EC2 instance is located (defaults to configured region)

For complex commands with quoting, ensure proper escaping.

Returns comprehensive Markdown output that includes:
- Execution context (instance ID, account, role, region)
- Command that was executed
- Command output
- Error messages if any
- Troubleshooting guidance if SSM connection fails
- Suggested alternative roles if permission errors occur`,
		Ec2ExecCommandToolArgs.shape,
		handleEc2ExecCommand,
	);

	registerLogger.debug('AWS SSO EC2 exec tools registered');
}

// Export the register function
export default { registerTools };
