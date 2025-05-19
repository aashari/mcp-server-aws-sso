import { CommandExecutionResult } from './aws.sso.exec.types.js';
import { baseCommandFormatter, formatDate } from '../utils/formatter.util.js';
import { RoleInfo } from '../services/vendor.aws.sso.types.js';
import { getDefaultAwsRegion } from '../utils/aws.sso.util.js';

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
	const defaultRegion = getDefaultAwsRegion();
	const isSuccess = result.exitCode === 0;
	const isPermissionError =
		options?.suggestedRoles && options.suggestedRoles.length > 0;

	// Title with error indicator if needed
	const title = isSuccess
		? 'AWS SSO: Command Result'
		: '❌ AWS SSO: Command Error';

	// Build context properties as a single string per line
	const contextProps: Record<string, unknown> = {};

	if (options?.accountId && options?.roleName) {
		contextProps['Account/Role'] =
			`${options.accountId}/${options.roleName}`;
	}

	if (options?.region || defaultRegion) {
		contextProps['Region'] = options?.region || defaultRegion;
		// Add default region info if different
		if (
			options?.region &&
			defaultRegion &&
			options.region !== defaultRegion
		) {
			contextProps['Region'] =
				`${options.region} (Default: ${defaultRegion})`;
		}
	}

	// Generate output sections based on command result
	const outputSections = [];

	// Always add the command that was executed
	outputSections.push({
		heading: 'Command',
		content: _command,
		isCodeBlock: true,
		language: 'bash',
	});

	if (isSuccess) {
		// Success case
		outputSections.push({
			heading: 'Output',
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
		// Error case - Customize error title based on the specific error
		let errorTitle = 'Error';
		let errorDescription = 'The command failed to execute.';

		if (isPermissionError) {
			errorTitle = 'Error: Permission Denied';
			errorDescription = `The role \`${options?.roleName}\` does not have permission to execute this command.`;
		} else if (result.stderr && result.stderr.includes('not found')) {
			errorTitle = 'Error: Command Not Found';
		} else if (result.exitCode) {
			errorTitle = `Error: Command Failed (Exit Code ${result.exitCode})`;
		}

		outputSections.push({
			heading: errorTitle,
			content: errorDescription,
		});

		// Add stderr if available
		if (result.stderr && result.stderr.trim()) {
			outputSections.push({
				heading: 'Error Details',
				content: result.stderr,
				isCodeBlock: true,
			});
		} else if (result.stdout && result.stdout.trim()) {
			// Sometimes errors go to stdout
			outputSections.push({
				heading: 'Command Output',
				content: result.stdout,
				isCodeBlock: true,
			});
		}

		// Add troubleshooting section
		if (isPermissionError && options?.suggestedRoles?.length) {
			const troubleshootingContent = [
				'### Available Roles',
				...options.suggestedRoles.map((role) => `- ${role.roleName}`),
				'',
				'Try executing the command again using one of the roles listed above that has appropriate permissions.',
			];

			outputSections.push({
				heading: 'Troubleshooting',
				content: troubleshootingContent,
			});
		}
	}

	// Add simple footer with timestamp
	const footerInfo = [`*Executed: ${formatDate(new Date())}*`];

	return baseCommandFormatter(
		title,
		contextProps,
		outputSections,
		footerInfo,
		// We no longer need the identity info section as we've incorporated
		// this information directly in the contextProps
		undefined,
	);
}
