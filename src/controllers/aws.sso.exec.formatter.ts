import { CommandExecutionResult } from './aws.sso.exec.types.js';
import {
	formatHeading,
	formatCodeBlock,
	baseCommandFormatter,
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
	// Build context properties
	const contextProps: Record<string, unknown> = {};
	if (options?.accountId) contextProps['Account'] = options.accountId;
	if (options?.roleName) contextProps['Role'] = options.roleName;
	if (options?.region) contextProps['Region'] = options.region;
	else if (options?.accountId) contextProps['Region'] = 'default';

	// Generate output sections based on command result
	const outputSections = [];

	// Success or Error output
	if (result.exitCode === 0) {
		// Success case
		outputSections.push({
			heading: 'Standard Output',
			content:
				result.stdout && result.stdout.trim()
					? result.stdout
					: '*Command completed successfully with no output.*',
			isCodeBlock: !!(result.stdout && result.stdout.trim()),
		});

		// Show stderr as warnings if present, even on success
		if (result.stderr && result.stderr.trim()) {
			outputSections.push({
				heading: 'Warnings (stderr)',
				content: result.stderr,
				isCodeBlock: true,
			});
		}
	} else {
		// Error case
		const isPermissionError =
			options?.suggestedRoles && options.suggestedRoles.length > 0;

		if (isPermissionError) {
			outputSections.push({
				heading: 'Error: Permission Denied',
				content: `The command failed due to insufficient permissions for the role \`${options.roleName}\` in account \`${options.accountId}\`.`,
			});
		} else {
			outputSections.push({
				heading: 'Error',
				content: 'The command failed to execute.',
			});
		}

		// Add exit code
		const errorDetails = [];
		errorDetails.push(`**Exit Code**: ${result.exitCode ?? 'Unknown'}`);
		errorDetails.push('');

		// Add stderr or stdout if available
		errorDetails.push(formatHeading('Standard Error (stderr)', 3));
		if (result.stderr && result.stderr.trim()) {
			errorDetails.push(formatCodeBlock(result.stderr));
		} else if (result.stdout && result.stdout.trim()) {
			// Sometimes errors go to stdout
			errorDetails.push('*(Error details potentially in stdout)*');
			errorDetails.push(formatCodeBlock(result.stdout));
		} else {
			errorDetails.push(
				'*Command failed with no specific error output.*',
			);
		}

		outputSections.push({
			heading: 'Error Details',
			level: 3,
			content: errorDetails,
		});

		// Add suggested roles section only on permission error
		if (
			isPermissionError &&
			options.suggestedRoles &&
			options.suggestedRoles.length > 0
		) {
			const roleContent = [
				...options.suggestedRoles.map((role) => `- ${role.roleName}`),
				'',
				'Try executing the command again using one of the roles listed above.',
			];

			outputSections.push({
				heading: `Available Roles for Account ${options.accountId || 'Unknown'}`,
				level: 3,
				content: roleContent,
			});
		}
	}

	// Add identity and region information
	const identityInfo = {
		defaultRegion: process.env.AWS_REGION || 'ap-southeast-1',
		selectedRegion: options?.region,
		identity: {
			accountId: options?.accountId,
			roleName: options?.roleName,
		},
	};

	return baseCommandFormatter(
		'AWS SSO: Command Output',
		contextProps,
		outputSections,
		undefined, // No additional footer info
		identityInfo,
	);
}
