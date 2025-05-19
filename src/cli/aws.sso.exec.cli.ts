import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { formatCliError } from '../utils/error-formatting.util.js';
import awsSsoExecController from '../controllers/aws.sso.exec.controller.js';

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
		.command('exec-command')
		.description(
			'Execute an AWS CLI command using temporary credentials obtained through AWS SSO. This command obtains temporary credentials for the specified account and role, then uses them to execute your AWS CLI command. The credentials are cached for future commands (typically valid for 1 hour). Prerequisites: You must first authenticate using the "login" command, and AWS CLI must be installed on the system.',
		)
		.requiredOption(
			'--account-id <id>',
			'AWS account ID (12-digit number) accessible through your AWS SSO permissions',
		)
		.requiredOption(
			'--role-name <role>',
			'IAM role name to assume (not the full ARN, just the name)',
		)
		.option(
			'--region <region>',
			'AWS region to use (uses default region if not specified)',
		)
		.requiredOption(
			'--command <command>',
			'Full AWS CLI command to execute, with proper quoting if needed',
		)
		.action(async (options) => {
			const execLogger = Logger.forContext(
				'cli/aws.sso.exec.cli.ts',
				'exec-command',
			);

			execLogger.debug('Executing AWS command with SSO credentials', {
				accountId: options.accountId,
				roleName: options.roleName,
				region: options.region,
				command: options.command,
			});

			try {
				// Call the controller with the parsed options
				const result = await awsSsoExecController.executeCommand({
					accountId: options.accountId,
					roleName: options.roleName,
					region: options.region,
					command: options.command,
				});

				console.log(result.content);
			} catch (error) {
				execLogger.error('Exec command failed', error);

				// Format the error in the same style as success output
				console.log(
					formatCliError(error, {
						title: 'AWS SSO: Command Error',
						accountId: options.accountId,
						roleName: options.roleName,
						region: options.region,
						command: options.command,
					}),
				);

				process.exit(1);
			}
		});
}

// Export the register function
export default { register };
