import { CommandExecutionResult } from './aws.sso.exec.types.js';
import { formatHeading, formatCodeBlock } from '../utils/formatter.util.js';

/**
 * Formats the result of an executed command into Markdown
 *
 * @param command The command that was executed
 * @param result The execution result containing stdout, stderr, and exit code
 * @returns Formatted Markdown string
 */
export function formatCommandResult(
	command: string,
	result: CommandExecutionResult,
): string {
	const lines: string[] = [];
	lines.push(formatHeading(`Command Result: \`${command}\``, 2));
	lines.push('');

	lines.push(formatHeading('Exit Code', 3));
	lines.push(
		formatCodeBlock(
			String(result.exitCode !== null ? result.exitCode : 'N/A'),
		),
	);
	lines.push('');

	if (result.stdout) {
		lines.push(formatHeading('Standard Output (stdout)', 3));
		lines.push(formatCodeBlock(result.stdout));
		lines.push('');
	}

	if (result.stderr) {
		lines.push(formatHeading('Standard Error (stderr)', 3));
		lines.push(formatCodeBlock(result.stderr));
		lines.push('');
	}

	return lines.join('\n');
}
