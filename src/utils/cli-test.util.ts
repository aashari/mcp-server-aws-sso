import { execFile } from 'child_process';
import { resolve } from 'path';

/**
 * CLI Test Utility Module
 *
 * Provides utilities for testing CLI commands in a controlled environment.
 * Used for integration testing of CLI commands without side effects.
 */

// Constants
const TIMEOUT = 30000; // 30 seconds timeout for CLI commands

/**
 * Type definition for CLI command execution result
 */
export interface CommandResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

/**
 * CLI Test Utility
 * Provides helper methods for testing CLI commands
 */
export class CliTestUtil {
	/**
	 * Run a CLI command and capture its output
	 *
	 * @param args Command line arguments (without the program name)
	 * @param env Optional environment variables to set
	 * @returns Promise resolving to command result with stdout, stderr, and exit code
	 */
	static async runCommand(
		args: string[],
		env: Record<string, string> = {},
	): Promise<CommandResult> {
		// Path to the CLI entry point
		const cliPath = resolve('./dist/index.js');

		return new Promise((resolve) => {
			// Set test environment variables
			const testEnv = {
				...process.env,
				NODE_ENV: 'test',
				...env,
			};

			// Execute the CLI command
			const childProcess = execFile(
				'node',
				[cliPath, ...args],
				{
					env: testEnv,
					timeout: TIMEOUT,
				},
				(error, stdout, stderr) => {
					resolve({
						stdout: stdout.toString(),
						stderr: stderr.toString(),
						exitCode: error?.code ? Number(error.code) : 0,
					});
				},
			);

			// Additional safety in case the child process hangs
			setTimeout(() => {
				try {
					childProcess.kill();
					resolve({
						stdout: '',
						stderr: 'Command timed out after 30 seconds',
						exitCode: 124, // Standard timeout exit code
					});
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
				} catch (e) {
					// Process might have already exited
				}
			}, TIMEOUT);
		});
	}
}
