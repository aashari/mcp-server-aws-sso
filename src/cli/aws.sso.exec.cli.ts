import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import awsSsoExecController from '../controllers/aws.sso.exec.controller.js';
import { parseCommand } from '../utils/command.util.js';

/**
 * CLI module for executing AWS CLI commands with AWS SSO credentials.
 *
 * Provides commands for running AWS CLI commands with temporary credentials
 * obtained from AWS SSO. All commands require valid AWS SSO authentication first.
 * The credentials are obtained transparently and used to execute the command.
 */

/**
 * Register AWS SSO exec CLI command
 *
 * @param {Command} program - Commander program instance to register commands with
 */
function register(program: Command): void {
	const methodLogger = Logger.forContext(
		'cli/aws.sso.exec.cli.ts',
		'register',
	);
	methodLogger.debug('Registering AWS SSO exec CLI');

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
        $ mcp-aws-sso exec --account-id 123456789012 --role-name AWSReadOnlyAccess --region us-west-2 --command "aws ec2 describe-instances"`,
		)
		.requiredOption(
			'-a, --account-id <accountId>',
			'AWS account ID to get credentials for',
		)
		.requiredOption(
			'-r, --role-name <roleName>',
			'AWS role name to assume via SSO',
		)
		.option(
			'-g, --region <region>',
			'AWS region to use for the command (overrides default region)',
		)
		.requiredOption(
			'-c, --command <command>',
			'AWS CLI command to execute (e.g., "aws s3 ls")',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/aws.sso.exec.cli.ts',
				'exec',
			);
			actionLogger.debug('Executing AWS command with SSO credentials', {
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

				// Output the formatted result
				console.log(result.content);
			} catch (error) {
				handleCliError(error);
			}
		});

	methodLogger.debug('AWS SSO exec CLI registered');
}

export default {
	register,
};
