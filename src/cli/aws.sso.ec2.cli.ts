import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { formatCliError } from '../utils/error-formatting.util.js';
import awsSsoEc2Controller from '../controllers/aws.sso.ec2.controller.js';

/**
 * AWS SSO EC2 Execution CLI Module
 *
 * Provides CLI commands for executing shell commands on EC2 instances via SSM
 * with temporary credentials obtained through AWS SSO. Commands in this module
 * require valid AWS SSO authentication.
 */

// Create a module logger
const cliLogger = Logger.forContext('cli/aws.sso.ec2.cli.ts');

// Log module initialization
cliLogger.debug('AWS SSO EC2 execution CLI module initialized');

/**
 * Register the EC2 exec command
 * @param program Commander program instance
 */
function registerEc2ExecCommand(program: Command): void {
	program
		.command('ec2-exec-command')
		.description(
			'Execute a shell command on an EC2 instance via SSM using temporary credentials from AWS SSO. This command sends a non-interactive shell command to your EC2 instance using AWS Systems Manager and returns the output. The command runs with temporary credentials obtained through your AWS SSO login. Prerequisites: EC2 instance must have SSM Agent installed, you must first authenticate using the "login" command, and your role must have permission to use SSM.',
		)
		.requiredOption(
			'--instance-id <id>',
			'EC2 instance ID where the command will be executed (e.g., i-1234567890abcdef0)',
		)
		.requiredOption(
			'--account-id <id>',
			'AWS account ID (12-digit number) where the EC2 instance is located',
		)
		.requiredOption(
			'--role-name <role>',
			'IAM role name to assume via SSO (must have SSM permissions)',
		)
		.option(
			'--region <region>',
			'AWS region where the EC2 instance is located (uses default region if not specified)',
		)
		.requiredOption(
			'--command <command>',
			'Shell command to execute on the EC2 instance (e.g., "ls -l", "df -h")',
		)
		.action(async (options) => {
			const execLogger = Logger.forContext(
				'cli/aws.sso.ec2.cli.ts',
				'ec2-exec-command',
			);

			execLogger.debug('Executing EC2 command with SSO credentials', {
				instanceId: options.instanceId,
				accountId: options.accountId,
				roleName: options.roleName,
				region: options.region,
				command: options.command,
			});

			try {
				// Call the controller with the parsed options
				const result = await awsSsoEc2Controller.executeEc2Command({
					instanceId: options.instanceId,
					accountId: options.accountId,
					roleName: options.roleName,
					region: options.region,
					command: options.command,
				});

				console.log(result.content);
			} catch (error) {
				execLogger.error('EC2 exec command failed', error);

				// Format the error in the same style as success output
				console.log(
					formatCliError(error, {
						title: 'AWS SSO: EC2 Command Error',
						accountId: options.accountId,
						roleName: options.roleName,
						region: options.region,
						command: options.command,
						instanceId: options.instanceId,
					}),
				);

				process.exit(1);
			}
		});
}

/**
 * Register all commands in this module
 * @param program Commander program instance
 */
function register(program: Command): void {
	registerEc2ExecCommand(program);
}

export default { register };
