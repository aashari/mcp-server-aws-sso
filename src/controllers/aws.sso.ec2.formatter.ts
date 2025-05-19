import {
	Ec2CommandExecutionResult,
	Ec2CommandContext,
} from './aws.sso.ec2.types.js';
import {
	formatHeading,
	formatCodeBlock,
	baseCommandFormatter,
} from '../utils/formatter.util.js';

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
	// Build context properties
	const contextProps: Record<string, unknown> = {
		'Instance ID': context.instanceId,
		Account: context.accountId,
		Role: context.roleName,
		Region: context.region || 'default',
	};

	// Generate output sections based on command result
	const outputSections = [];

	// Always add the command that was executed
	outputSections.push({
		heading: 'Command',
		content: command,
		isCodeBlock: true,
		language: 'bash',
	});

	// Success or Error output
	if (
		result.status === 'Success' &&
		(!result.responseCode || result.responseCode === 0)
	) {
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
		// Error case
		const isPermissionError =
			context.suggestedRoles && context.suggestedRoles.length > 0;

		if (isPermissionError) {
			outputSections.push({
				heading: 'Error: Permission Denied',
				content: `The command failed due to insufficient permissions for the role \`${context.roleName}\` in account \`${context.accountId}\`.`,
			});
		} else {
			outputSections.push({
				heading: 'Error',
				content: `The command failed to execute. Status: ${result.status}`,
			});
		}

		// Add response code if available
		const errorDetails = [];
		if (result.responseCode !== undefined && result.responseCode !== null) {
			errorDetails.push(`**Response Code**: ${result.responseCode}`);
			errorDetails.push('');
		}

		// Add command output if any
		errorDetails.push(formatHeading('Output', 3));
		if (result.output && result.output.trim()) {
			errorDetails.push(formatCodeBlock(result.output));
		} else {
			errorDetails.push('*Command failed with no specific output.*');
		}

		outputSections.push({
			heading: 'Error Details',
			level: 3,
			content: errorDetails,
		});

		// Add troubleshooting section for specific failures
		if (
			result.status === 'Failed' ||
			result.status === 'DeliveryTimedOut'
		) {
			outputSections.push({
				heading: 'Troubleshooting',
				level: 3,
				content: [
					'Possible issues:',
					'- SSM Agent is not installed or running on the instance',
					'- Instance does not have an IAM role with SSM permissions',
					'- Instance is not in a running state',
					'',
					'To check the SSM Agent status on the instance:',
					formatCodeBlock(
						'sudo systemctl status amazon-ssm-agent',
						'bash',
					),
				],
			});
		}

		// Add suggested roles section only on permission error
		if (
			isPermissionError &&
			context.suggestedRoles &&
			context.suggestedRoles.length > 0
		) {
			const roleContent = [
				...context.suggestedRoles.map((role) => `- ${role.roleName}`),
				'',
				'Try executing the command again using one of the roles listed above.',
			];

			outputSections.push({
				heading: `Available Roles for Account ${context.accountId}`,
				level: 3,
				content: roleContent,
			});
		}
	}

	// Add footer with command ID
	const footerInfo = [`*Command ID: ${result.commandId}*`];

	return baseCommandFormatter(
		'AWS SSO: EC2 Command Output',
		contextProps,
		outputSections,
		footerInfo,
	);
}
