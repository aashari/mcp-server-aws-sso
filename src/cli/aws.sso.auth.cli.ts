import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import awsSsoAuthController from '../controllers/aws.sso.auth.controller.js';
import {
	formatAlreadyLoggedIn,
	formatAuthRequired,
} from '../controllers/aws.sso.auth.formatter.js';
import { getCachedSsoToken } from '../services/vendor.aws.sso.auth.service.js';
import { formatDate } from '../utils/formatter.util.js';

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

	// Register the status command
	program
		.command('status')
		.description(
			'Check AWS SSO authentication status. Verifies if a valid cached token exists, displays its expiration time, and provides guidance on next steps. This command does NOT perform authentication - it only checks if you are already authenticated. If no valid token exists, it will instruct you to run the "login" command. Use this before other AWS SSO commands to verify your authentication state.',
		)
		.action(async () => {
			const actionLogger = Logger.forContext(
				'cli/aws.sso.auth.cli.ts',
				'status',
			);
			try {
				actionLogger.debug('Checking authentication status via cache');
				// Get token directly from cache
				const token = await getCachedSsoToken();

				// Format the result based on authentication status
				let formattedContent: string;
				const now = Math.floor(Date.now() / 1000); // Current time in seconds

				if (token && token.expiresAt > now) {
					// Format expiration date for display
					let expiresDate = 'Unknown';
					try {
						const expirationDate = new Date(token.expiresAt * 1000);
						// Use standard formatter
						expiresDate = formatDate(expirationDate);
					} catch (error) {
						actionLogger.error(
							'Error formatting expiration date',
							error,
						);
					}
					formattedContent = formatAlreadyLoggedIn(expiresDate);
				} else {
					formattedContent = formatAuthRequired();
				}
				// Print the formatted content (already includes header/footer)
				console.log(formattedContent);
			} catch (error) {
				handleCliError(error);
			}
		});

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
			'Initiate AWS SSO authentication via device authorization flow. This generates a verification code, opens a browser to the AWS SSO authentication page (if enabled), and caches the resulting token. The cached token (valid for 8-12 hours) is used by other AWS SSO commands. Prerequisites: AWS SSO must be configured with a start URL and region, and you need browser access to complete the flow.',
		)
		.option(
			'--no-launch-browser',
			'Disable automatic browser launch. When disabled, you must manually open the verification URL and enter the provided code. Useful for remote servers or environments without display access.',
		)
		.option(
			'--no-auto-poll',
			'Disable automatic polling for authentication completion. When disabled, the command starts the login process but does not wait for completion, requiring you to check status separately with the "status" command.',
		)
		.action(async (options) => {
			const loginLogger = Logger.forContext(
				'cli/aws.sso.auth.cli.ts',
				'login',
			);
			loginLogger.debug('Starting AWS SSO login', {
				launchBrowser: options.launchBrowser !== false,
				autoPoll: options.autoPoll !== false,
			});

			try {
				const result = await awsSsoAuthController.startLogin({
					launchBrowser: options.launchBrowser !== false,
					autoPoll: options.autoPoll !== false,
				});
				// Print the formatted content (already includes header/footer)
				console.log(result.content);
			} catch (error) {
				loginLogger.error('Login command failed', error);
				handleCliError(error);
			}
		});
}

// Export the register function
export default { register };
