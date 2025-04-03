import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import awsSsoExecController from '../controllers/aws.sso.exec.controller.js';
import { parseCommand } from '../utils/command.util.js';

/**
 * AWS SSO Execution CLI Module
 *
 * Provides CLI commands for executing AWS CLI commands with temporary
 * credentials obtained through AWS SSO. Commands in this module require
 * valid AWS SSO authentication.
 */

// Create a module logger
const cliLogger = Logger.forContext('cli/aws.sso.exec.cli.ts');

// Log module initialization
cliLogger.debug('AWS SSO execution CLI module initialized');

/**
 * Register AWS SSO exec CLI commands with the program
 * @param program Commander program instance
 */
function register(program: Command): void {
	const registerLogger = Logger.forContext(
		'cli/aws.sso.exec.cli.ts',
		'register',
	);
	registerLogger.debug('Registering AWS SSO exec CLI');

	registerExecCommand(program);

	registerLogger.debug('AWS SSO exec CLI registered');
}

/**
 * Register the exec command
 * @param program Commander program instance
 */
function registerExecCommand(program: Command): void {
	program
		.command('exec')
		.description(
			`Execute AWS CLI commands using credentials from AWS SSO.
			
        PURPOSE: Run AWS CLI commands with temporary credentials obtained from AWS SSO without
        having to manually configure profiles or export environment variables.

        WHEN TO USE:
        - When you need to quickly run AWS CLI commands with SSO credentials
        - When you need to work with multiple AWS accounts and roles
        - When you want to execute commands without modifying your AWS profile configuration
        - After authenticating with AWS SSO using the 'login' command
        
        PREREQUISITES:
        - Valid AWS SSO authentication (run 'login' command first)
        - AWS CLI (aws) must be installed on your system
        
        AUTHENTICATION:
        - Credentials are obtained automatically and temporarily for the command execution
        - No profile configuration required
        
        OUTPUT: Command output is displayed with stdout, stderr, and exit code information.
        
        EXAMPLES:
        $ mcp-aws-sso exec --account-id 123456789012 --role-name AWSAdministratorAccess --command "aws s3 ls"
        $ mcp-aws-sso exec --account-id 123456789012 --role-name AWSReadOnlyAccess --region us-west-2 --command "aws ec2 describe-instances"
			`,
		)
		.requiredOption(
			'--account-id <id>',
			'AWS account ID to use for the command execution',
		)
		.requiredOption(
			'--role-name <role>',
			'IAM role name to assume for the command execution',
		)
		.option(
			'--region <region>',
			'AWS region to use for the command execution',
		)
		.requiredOption(
			'--command <command>',
			'AWS CLI command to execute with the temporary credentials',
		)
		.action(async (options) => {
			const execLogger = Logger.forContext(
				'cli/aws.sso.exec.cli.ts',
				'exec',
			);

			execLogger.debug('Executing AWS command with SSO credentials', {
				accountId: options.accountId,
				roleName: options.roleName,
				region: options.region,
				command: options.command,
			});

			try {
				// Parse the command string properly instead of simple split
				const commandParts = parseCommand(options.command);

				// Call the controller with the parsed options
				const result = await awsSsoExecController.executeCommand({
					accountId: options.accountId,
					roleName: options.roleName,
					region: options.region,
					command: commandParts,
				});

				console.log(result.content);
			} catch (error) {
				execLogger.error('Exec command failed', error);
				handleCliError(error);
			}
		});
}

// Export the register function
export default { register };
