import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import awsSsoAuthController from '../controllers/aws.sso.auth.controller.js';

/**
 * AWS SSO Authentication CLI Module
 *
 * Provides CLI commands for authenticating with AWS SSO and managing
 * authentication status. Handles the browser-based login flow and
 * verifies authentication status.
 */

// Create a module logger
const cliLogger = Logger.forContext('cli/aws.sso.auth.cli.ts');

// Log module initialization
cliLogger.debug('AWS SSO authentication CLI module initialized');

/**
 * Register AWS SSO auth CLI commands
 * @param program Commander program instance
 */
function register(program: Command): void {
	const registerLogger = Logger.forContext(
		'cli/aws.sso.auth.cli.ts',
		'register',
	);
	registerLogger.debug('Registering AWS SSO auth CLI commands');

	registerLoginCommand(program);

	registerLogger.debug('AWS SSO auth CLI commands registered');
}

/**
 * Register the login command
 * @param program Commander program instance
 */
function registerLoginCommand(program: Command): void {
	program
		.command('login')
		.description(
			'Authenticate with AWS SSO via browser, automatically polling for completion.',
		)
		.option(
			'--no-browser',
			'Disable automatic browser launch; only show manual instructions.',
		)
		.option(
			'--no-auto-poll',
			'Disable automatic polling for token completion (used mainly for testing)',
		)
		.action(async (options) => {
			const loginLogger = Logger.forContext(
				'cli/aws.sso.auth.cli.ts',
				'login',
			);
			loginLogger.debug('Starting AWS SSO login', {
				launchBrowser: options.browser,
				autoPoll: options.autoPoll,
			});

			try {
				const result = await awsSsoAuthController.startLogin({
					launchBrowser: options.browser,
					autoPoll: options.autoPoll,
				});
				console.log(result.content);
			} catch (error) {
				loginLogger.error('Login command failed', error);
				handleCliError(error);
			}
		});
}

// Export the register function
export default { register };
