import { CommandExecutionResult } from './aws.sso.exec.types.js';
import { formatHeading, formatCodeBlock } from '../utils/formatter.util.js';
import { RoleInfo } from '../services/vendor.aws.sso.types.js';

/**
 * Formats the result of an executed command into Markdown
 *
 * @param command The command that was executed (used for context, not displayed directly)
 * @param result The execution result containing stdout, stderr, and exit code
 * @param options Optional context like account, role, region, and suggested roles
 * @returns Formatted Markdown string
 */
export function formatCommandResult(
	_command: string,
	result: CommandExecutionResult,
	options?: {
		accountId?: string;
		roleName?: string;
		region?: string;
		suggestedRoles?: RoleInfo[];
	},
): string {
	const lines: string[] = [];
	const executedAt = new Date();

	// Main heading
	lines.push(formatHeading('AWS CLI Command Output', 1));
	lines.push('');

	// Add timestamp
	lines.push(`**Executed At**: ${executedAt.toLocaleString()}`);

	// Add account/role/region context if provided
	if (options?.accountId) {
		lines.push(`**Account**: ${options.accountId}`);
	}
	if (options?.roleName) {
		lines.push(`**Role**: ${options.roleName}`);
	}
	if (options?.region) {
		lines.push(`**Region**: ${options.region}`);
	} else if (options?.accountId) {
		// If we have an account but no region, indicate default
		lines.push('**Region**: default');
	}

	lines.push('');

	// For successful commands, show the output directly without exit code
	if (result.exitCode === 0 && result.stdout) {
		if (result.stdout.trim()) {
			// For non-empty stdout, format as a code block
			lines.push(formatCodeBlock(result.stdout));
		} else {
			// For empty stdout, show a success message
			lines.push('*Command completed successfully with no output.*');
		}
	}
	// For errors, format differently
	else if (result.exitCode !== 0) {
		// Check if it's a permission error and roles are suggested
		const isPermissionError =
			options?.suggestedRoles && options.suggestedRoles.length > 0;

		if (isPermissionError) {
			lines.push(formatHeading('Permission Denied', 2));
			lines.push(
				`The command failed due to insufficient permissions for the role \`${options.roleName}\` in account \`${options.accountId}\`.`,
			);
			lines.push('');
			lines.push(`**Exit Code**: ${result.exitCode ?? 'Unknown'}`);
			lines.push('');

			// Show error output if available
			if (result.stderr && result.stderr.trim()) {
				lines.push(formatCodeBlock(result.stderr));
			} else if (result.stdout && result.stdout.trim()) {
				lines.push(formatCodeBlock(result.stdout));
			} else {
				lines.push('*Command failed with no specific error output.*');
			}
			lines.push('');

			// Add suggested roles section
			lines.push(
				formatHeading(
					`Available Roles for Account ${options.accountId}`,
					3,
				),
			);
			if (options.suggestedRoles && options.suggestedRoles.length > 0) {
				options.suggestedRoles.forEach((role) => {
					lines.push(`- ${role.roleName}`);
				});
				lines.push('');
				lines.push(
					'Try executing the command again using one of the roles listed above.',
				);
			} else {
				// This case might occur if role listing failed, but we still detected a permission error
				lines.push(
					'Could not retrieve alternative roles for this account.',
				);
			}
		} else {
			// Generic error formatting
			lines.push(formatHeading('Error', 2));
			lines.push(`**Exit Code**: ${result.exitCode ?? 'Unknown'}`);
			lines.push('');

			// Show error output if available
			if (result.stderr && result.stderr.trim()) {
				lines.push(formatCodeBlock(result.stderr));
			} else if (result.stdout && result.stdout.trim()) {
				// Some AWS commands put error messages in stdout
				lines.push(formatCodeBlock(result.stdout));
			} else {
				lines.push('*Command failed with no error output.*');
			}
		}
	}
	// For unusual cases like exit code 0 but stderr present
	else if (result.stderr && result.stderr.trim()) {
		lines.push(formatHeading('Output', 2));
		if (result.stdout && result.stdout.trim()) {
			lines.push(formatCodeBlock(result.stdout));
			lines.push('');
		}

		lines.push(formatHeading('Warnings', 2));
		lines.push(formatCodeBlock(result.stderr));
	}

	return lines.join('\n');
}
