import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
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
			'Execute an AWS CLI command using temporary credentials from AWS SSO for a specific account/role.',
		)
		.requiredOption('--account-id <id>', 'AWS account ID (12-digit number)')
		.requiredOption('--role-name <role>', 'AWS role name to assume via SSO')
		.option('--region <region>', 'AWS region to use (optional)')
		.requiredOption(
			'--command <command>',
			'AWS CLI command to execute (e.g., "aws s3 ls")',
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
				handleCliError(error);
			}
		});
}

// Export the register function
export default { register };
