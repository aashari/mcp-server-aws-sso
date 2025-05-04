import { CommandExecutionResult } from './aws.sso.exec.types.js';
import {
	formatHeading,
	formatCodeBlock,
	formatBulletList,
	formatSeparator,
	formatDate,
} from '../utils/formatter.util.js';
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

	lines.push(formatHeading('AWS SSO: Command Output', 1));
	lines.push('');

	// Context Block
	const contextProps: Record<string, unknown> = {};
	if (options?.accountId) contextProps['Account'] = options.accountId;
	if (options?.roleName) contextProps['Role'] = options.roleName;
	if (options?.region) contextProps['Region'] = options.region;
	else if (options?.accountId) contextProps['Region'] = 'default';

	if (Object.keys(contextProps).length > 0) {
		lines.push(formatHeading('Execution Context', 2));
		lines.push(formatBulletList(contextProps));
		lines.push('');
	}

	// Success Case
	if (result.exitCode === 0) {
		lines.push(formatHeading('Standard Output', 2));
		if (result.stdout && result.stdout.trim()) {
			lines.push(formatCodeBlock(result.stdout));
		} else {
			lines.push('*Command completed successfully with no output.*');
		}
		// Show stderr as warnings if present, even on success
		if (result.stderr && result.stderr.trim()) {
			lines.push('');
			lines.push(formatHeading('Warnings (stderr)', 2));
			lines.push(formatCodeBlock(result.stderr));
		}
	}
	// Error Case
	else {
		const isPermissionError =
			options?.suggestedRoles && options.suggestedRoles.length > 0;

		if (isPermissionError) {
			lines.push(formatHeading('Error: Permission Denied', 2));
			lines.push(
				`The command failed due to insufficient permissions for the role \`${options.roleName}\` in account \`${options.accountId}\`.`,
			);
		} else {
			lines.push(formatHeading('Error', 2));
			lines.push('The command failed to execute.');
		}

		lines.push('');
		lines.push(`**Exit Code**: ${result.exitCode ?? 'Unknown'}`);
		lines.push('');

		lines.push(formatHeading('Standard Error (stderr)', 3));
		if (result.stderr && result.stderr.trim()) {
			lines.push(formatCodeBlock(result.stderr));
		} else if (result.stdout && result.stdout.trim()) {
			// Sometimes errors go to stdout
			lines.push('*(Error details potentially in stdout)*');
			lines.push(formatCodeBlock(result.stdout));
		} else {
			lines.push('*Command failed with no specific error output.*');
		}
		lines.push('');

		// Add suggested roles section only on permission error
		if (isPermissionError) {
			lines.push(
				formatHeading(
					`Available Roles for Account ${options.accountId || 'Unknown'}`,
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
				lines.push(
					'Could not retrieve alternative roles for this account.',
				);
			}
		}
	}

	// Add standard footer with timestamp
	lines.push('');
	lines.push(formatSeparator());
	lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);

	return lines.join('\n');
}
