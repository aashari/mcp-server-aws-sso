import {
	Ec2CommandExecutionResult,
	Ec2CommandContext,
} from './aws.sso.ec2.types.js';
import { baseCommandFormatter, formatDate } from '../utils/formatter.util.js';
import { getDefaultAwsRegion } from '../utils/aws.sso.util.js';

/**
 * Formats the result of an executed EC2 command into Markdown
 *
 * @param command The shell command that was executed
 * @param result The execution result from SSM
 * @param context Context information including instance ID, account, role, region, and suggested roles
 * @returns Formatted Markdown string
 */
export function formatEc2CommandResult(
	command: string,
	result: Ec2CommandExecutionResult,
	context: Ec2CommandContext,
): string {
	const defaultRegion = getDefaultAwsRegion();
	const isSuccess =
		result.status === 'Success' &&
		(!result.responseCode || result.responseCode === 0);
	const isPermissionError =
		context.suggestedRoles && context.suggestedRoles.length > 0;

	// Title with error indicator if needed
	const title = isSuccess
		? 'AWS SSO: EC2 Command Result'
		: '❌ AWS SSO: EC2 Command Error';

	// Build context properties as a single string per line
	const contextProps: Record<string, unknown> = {};

	// Instance line with name if available
	contextProps['Instance'] = context.instanceName
		? `${context.instanceId} (${context.instanceName})`
		: context.instanceId;

	// Account/Role line
	contextProps['Account/Role'] = `${context.accountId}/${context.roleName}`;

	// Region line with default if different
	if (context.region || defaultRegion) {
		contextProps['Region'] = context.region || defaultRegion;
		// Add default region info if different
		if (
			context.region &&
			defaultRegion &&
			context.region !== defaultRegion
		) {
			contextProps['Region'] =
				`${context.region} (Default: ${defaultRegion})`;
		}
	}

	// Generate output sections based on command result
	const outputSections = [];

	// Always add the command that was executed
	outputSections.push({
		heading: 'Command',
		content: command,
		isCodeBlock: true,
		language: 'bash',
	});

	if (isSuccess) {
		// Success case
		outputSections.push({
			heading: 'Output',
			content:
				result.output && result.output.trim()
					? result.output
					: '*Command completed successfully with no output.*',
			isCodeBlock: !!(result.output && result.output.trim()),
		});
	} else {
		// Error case - Customize error title based on the specific error
		let errorTitle = 'Error';
		let errorDescription = 'The command failed to execute.';

		if (isPermissionError) {
			errorTitle = 'Error: Permission Denied';
			errorDescription = `The role \`${context.roleName}\` does not have permission to execute this command on the instance.`;
		} else if (result.status === 'DeliveryTimedOut') {
			errorTitle = 'Error: Connection Timeout';
			errorDescription =
				'Could not connect to the instance via SSM. Ensure the SSM Agent is running.';
		} else if (result.status === 'Failed') {
			if (result.output && result.output.includes('not found')) {
				errorTitle = 'Error: Instance not found';
				errorDescription = `Instance ${context.instanceId} not found or not connected to SSM. Ensure the instance is running and has the SSM Agent installed.`;
			} else {
				errorTitle = 'Error: Command Failed';
				if (result.responseCode) {
					errorTitle += ` (Code ${result.responseCode})`;
				}
			}
		}

		outputSections.push({
			heading: errorTitle,
			content: errorDescription,
		});

		// Add output as error details if available
		if (result.output && result.output.trim()) {
			outputSections.push({
				heading: 'Error Details',
				content: result.output,
				isCodeBlock: true,
			});
		}

		// Add troubleshooting section
		if (
			result.status === 'Failed' ||
			result.status === 'DeliveryTimedOut'
		) {
			outputSections.push({
				heading: 'Troubleshooting',
				content: [
					'- Check if the instance exists in the specified region',
					'- Verify the instance is in a running state',
					'- Confirm SSM Agent is installed and running',
					'- Ensure your role has permission to use SSM',
				],
			});
		}

		// Add suggested roles section if permission error
		if (
			isPermissionError &&
			context.suggestedRoles &&
			context.suggestedRoles.length > 0
		) {
			outputSections.push({
				heading: 'Available Roles',
				content: [
					...context.suggestedRoles.map(
						(role) => `- ${role.roleName}`,
					),
					'',
					'Try executing the command with one of these roles instead.',
				],
			});
		}
	}

	// Footer with command ID and timestamp
	const footerInfo = [
		`*Command ID: ${result.commandId}*`,
		`*Executed: ${formatDate(new Date())}*`,
	];

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
