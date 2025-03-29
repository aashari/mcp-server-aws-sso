import { Logger } from '../utils/logger.util.js';
import { CommandExecutionResult } from './aws.sso.exec.types.js';
import {
	formatHeading,
	formatSeparator,
	formatBulletList,
	formatCodeBlock,
} from '../utils/formatter.util.js';

/**
 * Format authentication required message
 *
 * Creates a standardized message indicating AWS SSO authentication is required
 * before command execution can proceed.
 *
 * @returns {string} Formatted authentication required message in markdown
 */
export function formatAuthRequired(): string {
	const methodLogger = Logger.forContext(
		'controllers/aws.sso.exec.formatter.ts',
		'formatAuthRequired',
	);
	methodLogger.debug('Formatting auth required message');

	const lines: string[] = [
		formatHeading('Authentication Required', 1),
		'',
		'You need to authenticate with AWS SSO first.',
		'',
		'Please use the `login` command to authenticate.',
		'',
	];

	return lines.join('\n');
}

/**
 * Format command execution output
 *
 * Creates a detailed Markdown representation of command execution results,
 * including the command that was run, exit code, and standard output/error streams.
 *
 * @param {string} command - Command that was executed
 * @param {string} stdout - Standard output from the command
 * @param {string} stderr - Standard error from the command
 * @param {number} exitCode - Exit code from the command
 * @returns {string} Formatted command execution output in markdown
 */
export function formatCommandOutput(
	command: string,
	stdout: string,
	stderr: string,
	exitCode: number,
): string {
	const methodLogger = Logger.forContext(
		'controllers/aws.sso.exec.formatter.ts',
		'formatCommandOutput',
	);
	methodLogger.debug('Formatting command output', {
		commandLength: command.length,
		stdoutLength: stdout.length,
		stderrLength: stderr.length,
		exitCode,
	});

	const lines: string[] = [
		formatHeading('AWS CLI Command Execution', 1),
		'',
		`Command: \`${command}\``,
		'',
		formatHeading(
			`Result: ${exitCode === 0 ? 'Success' : 'Failed'} (Exit Code: ${exitCode})`,
			2,
		),
		'',
	];

	// Format standard output if present
	if (stdout.trim()) {
		lines.push(formatHeading('Standard Output (stdout)', 3));
		lines.push('');
		lines.push(formatCodeBlock(stdout));
		lines.push('');
	}

	// Format standard error if present
	if (stderr.trim()) {
		lines.push(formatHeading('Standard Error (stderr)', 3));
		lines.push('');
		lines.push(formatCodeBlock(stderr));
		lines.push('');
	}

	// Add footer separator if both stdout and stderr are present
	if (stdout.trim() && stderr.trim()) {
		lines.push(formatSeparator());
		lines.push('');
	}

	// Add contextual information for errors
	if (exitCode !== 0) {
		lines.push(formatHeading('Execution Failed', 3));
		lines.push('');
		lines.push(
			'The AWS CLI command returned a non-zero exit code, indicating an error.',
		);

		// Include common error resolution tips
		lines.push('');
		lines.push(formatHeading('Troubleshooting Tips', 4));
		lines.push('');
		lines.push(
			formatBulletList({
				'Check credentials': 'Verify AWS SSO credentials are valid.',
				'Check permissions':
					'Ensure the role has permissions for this command.',
				'Check command syntax':
					'Verify AWS CLI command syntax is correct.',
				'Check region':
					'Verify the AWS region is valid and accessible.',
			}),
		);
		lines.push('');
	}

	return lines.join('\n');
}

/**
 * Format command execution result into markdown
 *
 * @param command The command that was executed
 * @param result The result of the command execution
 * @returns Formatted output as Markdown
 */
export function formatExecResult(
	command: string,
	result: CommandExecutionResult,
): string {
	return formatCommandOutput(
		command,
		result.stdout,
		result.stderr,
		result.exitCode,
	);
}
