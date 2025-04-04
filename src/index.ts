#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Logger } from './utils/logger.util.js';
import { config } from './utils/config.util.js';
import { createUnexpectedError } from './utils/error.util.js';
import { VERSION, PACKAGE_NAME } from './utils/constants.util.js';
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

// Log initialization at debug level
indexLogger.debug('AWS SSO MCP server module loaded');

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
	serverLogger.info('Starting MCP server initialization...');
	config.load();
	serverLogger.info('Configuration loaded successfully');

	// Enable debug logging if DEBUG is set to true
	if (config.getBoolean('DEBUG')) {
		serverLogger.debug('Debug mode enabled');
	}

	// Log the DEBUG value to verify configuration loading
	serverLogger.debug(`DEBUG environment variable: ${process.env.DEBUG}`);
	serverLogger.debug(
		`AWS_SSO_START_URL value exists: ${Boolean(process.env.AWS_SSO_START_URL)}`,
	);
	serverLogger.debug(`Config DEBUG value: ${config.get('DEBUG')}`);

	serverLogger.info(`Initializing AWS SSO MCP server v${VERSION}`);
	serverInstance = new McpServer({
		name: PACKAGE_NAME,
		version: VERSION,
	});

	if (mode === 'stdio') {
		serverLogger.info('Using STDIO transport for MCP communication');
		transportInstance = new StdioServerTransport();
	} else {
		throw createUnexpectedError('SSE mode is not supported yet');
	}

	// Register tools
	serverLogger.info('Registering MCP tools...');

	// register authentication tools
	awsSsoAuthTools.registerTools(serverInstance);
	serverLogger.debug('Registered AWS SSO authentication tools');

	// register accounts tools
	awsSsoAccountsTools.registerTools(serverInstance);
	serverLogger.debug('Registered AWS SSO accounts tools');

	// register exec tools
	awsSsoExecTools.registerTools(serverInstance);
	serverLogger.debug('Registered AWS SSO exec tools');

	serverLogger.info('All tools registered successfully');

	try {
		serverLogger.info(`Connecting to ${mode.toUpperCase()} transport...`);
		await serverInstance.connect(transportInstance);
		serverLogger.info(
			'MCP server started successfully and ready to process requests',
		);
		return serverInstance;
	} catch (err) {
		serverLogger.error(`Failed to start server`, err);
		process.exit(1);
	}
}

/**
 * Main entry point - this will run when executed directly
 * Determines whether to run in CLI or server mode based on command-line arguments
 */
async function main() {
	const mainLogger = Logger.forContext('index.ts', 'main');

	// Load configuration
	config.load();

	// Log the DEBUG value to verify configuration loading
	mainLogger.debug(`DEBUG environment variable: ${process.env.DEBUG}`);
	mainLogger.debug(
		`AWS_SSO_START_URL value exists: ${Boolean(process.env.AWS_SSO_START_URL)}`,
	);
	mainLogger.debug(`Config DEBUG value: ${config.get('DEBUG')}`);

	// Check if arguments are provided (CLI mode)
	if (process.argv.length > 2) {
		// CLI mode: Pass arguments to CLI runner
		mainLogger.info('Starting in CLI mode');
		await runCli(process.argv.slice(2));
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
export { PACKAGE_NAME } from './utils/constants.util.js';
