import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import awsSsoAuthCli from './aws.sso.auth.cli.js';
import awsSsoAccountsCli from './aws.sso.accounts.cli.js';
import awsSsoExecCli from './aws.sso.exec.cli.js';
import { config } from '../utils/config.util.js';

/**
 * CLI entry point for the AWS SSO MCP Server
 * Handles command registration, parsing, and execution
 */

// Create a logger instance for this module
const cliLogger = Logger.forContext('cli/index.ts');

/**
 * Run the CLI with provided arguments
 *
 * @param args Command line arguments
 * @returns A promise that resolves when the CLI command completes
 */
export async function runCli(args: string[]): Promise<void> {
	cliLogger.debug('Initializing CLI with arguments', {
		argsCount: args.length,
	});

	// Load and parse configuration
	config.load();

	// Set up the program
	const program = new Command();

	program
		.name('mcp-aws-sso')
		.description('MCP Server CLI for AWS SSO')
		.version('1.0.0'); // Same as the server version

	// Register CLI commands
	cliLogger.debug('Registering CLI commands...');

	// Register AWS SSO auth CLI commands
	awsSsoAuthCli.register(program);
	cliLogger.debug('Registered AWS SSO authentication CLI commands');

	// Register AWS SSO accounts CLI commands
	awsSsoAccountsCli.register(program);
	cliLogger.debug('Registered AWS SSO accounts CLI commands');

	// Register AWS SSO exec CLI commands
	awsSsoExecCli.register(program);
	cliLogger.debug('Registered AWS SSO exec CLI commands');

	cliLogger.debug('CLI commands registered successfully');

	// Execute the CLI
	cliLogger.debug('Parsing CLI arguments');
	await program.parseAsync(args);
	cliLogger.debug('CLI command execution completed');
}

export default { runCli };
