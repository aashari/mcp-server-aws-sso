#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Logger } from './utils/logger.util.js';
import { config } from './utils/config.util.js';
import { createUnexpectedError } from './utils/error.util.js';
import { runCli } from './cli/index.js';

import awsSsoAuthTools from './tools/aws.sso.auth.tool.js';
import awsSsoAccountsTools from './tools/aws.sso.accounts.tool.js';
import awsSsoExecTools from './tools/aws.sso.exec.tool.js';

/**
 * MCP Server for AWS SSO
 *
 * Provides tools for authentication with AWS SSO and executing AWS CLI commands
 * with temporary credentials from SSO.
 */

// Create file-level logger
const indexLogger = Logger.forContext('index.ts');

// Define version constant for easier management and consistent versioning
const VERSION = '1.1.0';

let serverInstance: McpServer | null = null;
let transportInstance: SSEServerTransport | StdioServerTransport | null = null;

/**
 * Start the MCP server with the specified transport mode
 *
 * @param mode The transport mode to use (stdio or sse)
 * @returns Promise that resolves when the server is started
 */
export async function startServer(mode: 'stdio' | 'sse' = 'stdio') {
	const serverLogger = Logger.forContext('index.ts', 'startServer');

	// Load configuration
	config.load();

	// Enable debug logging if DEBUG is set to true
	if (config.getBoolean('DEBUG')) {
		serverLogger.debug('Debug mode enabled');
	}

	// Log the DEBUG value to verify configuration loading
	serverLogger.info(`DEBUG value: ${process.env.DEBUG}`);
	serverLogger.info(
		`AWS_SSO_START_URL value exists: ${Boolean(process.env.AWS_SSO_START_URL)}`,
	);
	serverLogger.info(`Config DEBUG value: ${config.get('DEBUG')}`);

	serverInstance = new McpServer({
		name: '@aashari/mcp-server-aws-sso',
		version: VERSION,
	});

	if (mode === 'stdio') {
		transportInstance = new StdioServerTransport();
	} else {
		throw createUnexpectedError('SSE mode is not supported yet');
	}

	serverLogger.info(
		`Starting server with ${mode.toUpperCase()} transport...`,
	);

	// register authentication tools
	awsSsoAuthTools.register(serverInstance);
	serverLogger.debug('Registered AWS SSO authentication tools');

	// register accounts tools
	awsSsoAccountsTools.register(serverInstance);
	serverLogger.debug('Registered AWS SSO accounts tools');

	// register exec tools
	awsSsoExecTools.register(serverInstance);
	serverLogger.debug('Registered AWS SSO exec tools');

	return serverInstance.connect(transportInstance).catch((err) => {
		serverLogger.error(`Failed to start server`, err);
		process.exit(1);
	});
}

/**
 * Main entry point - this will run when executed directly
 */
async function main() {
	const mainLogger = Logger.forContext('index.ts', 'main');

	// Load configuration
	config.load();

	// Log the DEBUG value to verify configuration loading
	mainLogger.info(`DEBUG value: ${process.env.DEBUG}`);
	mainLogger.info(
		`AWS_SSO_START_URL value exists: ${Boolean(process.env.AWS_SSO_START_URL)}`,
	);
	mainLogger.info(`Config DEBUG value: ${config.get('DEBUG')}`);

	// Check if arguments are provided (CLI mode)
	if (process.argv.length > 2) {
		// CLI mode: Pass arguments to CLI runner
		mainLogger.info('Starting in CLI mode');
		await runCli(process.argv);
		mainLogger.info('CLI execution completed');
	} else {
		// MCP Server mode: Start server with default STDIO
		mainLogger.info('Starting in server mode');
		await startServer();
		mainLogger.info('Server is now running');
	}
}

// If this file is being executed directly (not imported), run the main function
if (require.main === module) {
	main().catch((err) => {
		indexLogger.error('Unhandled error in main process', err);
		process.exit(1);
	});
}

// Export key utilities for library users
export { config };
export { Logger };
