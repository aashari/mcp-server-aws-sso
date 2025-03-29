import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import awsSsoAccountsController from '../controllers/aws.sso.accounts.controller.js';

/**
 * Register AWS SSO accounts CLI commands
 * @param program Commander program instance
 */
function register(program: Command): void {
	const methodLogger = Logger.forContext(
		'cli/aws.sso.accounts.cli.ts',
		'register',
	);
	methodLogger.debug('Registering AWS SSO accounts CLI commands');

	registerListAccountsCommand(program);

	methodLogger.debug('AWS SSO accounts CLI commands registered');
}

/**
 * Register the list-accounts command
 * @param program Commander program instance
 */
function registerListAccountsCommand(program: Command): void {
	program
		.command('list-accounts')
		.description(
			`List all AWS accounts and roles available to the authenticated user.
			
        PURPOSE: Discover and explore all AWS accounts and roles you have access to
        through AWS SSO. Essential for identifying account IDs and role names needed
        for other commands like 'exec'.
			
        WHEN TO USE:
        - After authenticating with AWS SSO via the 'login' command
        - When you need to find the account ID and role name for use with other commands
        - When you want to see a comprehensive overview of your AWS SSO access permissions
        - To verify your permissions across multiple AWS accounts
        
        AUTHENTICATION:
        - Requires a valid AWS SSO session (use 'login' command first)
        - If you've already completed authentication in browser but this is your first check,
          it will automatically retrieve and verify your token
        - If session is expired, you'll be prompted to login again
        
        OUTPUT: Markdown-formatted list of all accounts with their IDs, names,
        email addresses, and roles available in each account.
        
        EXAMPLES:
        $ mcp-aws-sso login         # First authenticate in browser
        $ mcp-aws-sso list-accounts # Then verify and list accounts
			`,
		)
		.action(async () => {
			const actionLogger = Logger.forContext(
				'cli/aws.sso.accounts.cli.ts',
				'list-accounts',
			);
			try {
				actionLogger.debug('Listing all AWS accounts and roles');
				const result = await awsSsoAccountsController.listAccounts();
				console.log(result.content);
			} catch (error) {
				actionLogger.error('List-accounts command failed', error);
				handleCliError(error);
			}
		});
}

// Export the register function
export default { register };
