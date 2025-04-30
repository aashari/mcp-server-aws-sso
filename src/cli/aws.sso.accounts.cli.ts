import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import awsSsoAccountsController from '../controllers/aws.sso.accounts.controller.js';

/**
 * AWS SSO Accounts CLI Module
 *
 * Provides CLI commands for listing and exploring AWS accounts and roles
 * available through AWS SSO. Commands for viewing account details and roles
 * require valid AWS SSO authentication.
 */

// Create a module logger
const cliLogger = Logger.forContext('cli/aws.sso.accounts.cli.ts');

// Log module initialization
cliLogger.debug('AWS SSO accounts CLI module initialized');

/**
 * Register AWS SSO accounts CLI commands
 * @param program Commander program instance
 */
function register(program: Command): void {
	const registerLogger = Logger.forContext(
		'cli/aws.sso.accounts.cli.ts',
		'register',
	);
	registerLogger.debug('Registering AWS SSO accounts CLI commands');

	registerListAccountsCommand(program);

	registerLogger.debug('AWS SSO accounts CLI commands registered');
}

/**
 * Register the list-accounts command
 * @param program Commander program instance
 */
function registerListAccountsCommand(program: Command): void {
	program
		.command('ls-accounts')
		.description(
			'List all AWS accounts and roles available to the authenticated user via AWS SSO.',
		)
		.action(async () => {
			const listLogger = Logger.forContext(
				'cli/aws.sso.accounts.cli.ts',
				'ls-accounts',
			);
			try {
				listLogger.debug('Listing all AWS accounts and roles');
				const result = await awsSsoAccountsController.listAccounts();
				console.log(result.content);
			} catch (error) {
				listLogger.error('List-accounts command failed', error);
				handleCliError(error);
			}
		});
}

// Export the register function
export default { register };
