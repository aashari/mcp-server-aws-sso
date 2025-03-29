import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import awsSsoAuthCli from './aws.sso.auth.cli.js';
import awsSsoAccountsCli from './aws.sso.accounts.cli.js';
import awsSsoExecCli from './aws.sso.exec.cli.js';
import { config } from '../utils/config.util.js';

/**
 * CLI module for AWS SSO integration.
 * Provides commands for authentication and command execution with AWS SSO.
 */

// Create a logger instance for this module
const logger = Logger.forContext('cli/index.ts');

/**
 * Run the CLI with provided arguments
 *
 * @param args Command line arguments
 * @returns A promise that resolves when the CLI command completes
 */
export async function runCli(args: string[]): Promise<void> {
	logger.debug('Running CLI with args', { argsCount: args.length });

	// Load and parse configuration
	config.load();

	// Set up the program
	const program = new Command();

	program
		.name('mcp-aws-sso')
		.description('MCP Server CLI for AWS SSO')
		.version('1.0.0'); // Same as the server version

	// Register CLI commands
	logger.debug('Registering CLI commands');

	// Register AWS SSO auth CLI commands
	awsSsoAuthCli.register(program);
	logger.debug('AWS SSO authentication CLI commands registered');

	// Register AWS SSO accounts CLI commands
	awsSsoAccountsCli.register(program);
	logger.debug('AWS SSO accounts CLI commands registered');

	// Register AWS SSO exec CLI commands
	awsSsoExecCli.register(program);
	logger.debug('AWS SSO exec CLI commands registered');

	// Execute the CLI
	await program.parseAsync(args);
}

export default { runCli };
