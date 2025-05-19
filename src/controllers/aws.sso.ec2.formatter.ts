import {
	Ec2CommandExecutionResult,
	Ec2CommandContext,
} from './aws.sso.ec2.types.js';
import {
	formatHeading,
	formatCodeBlock,
	formatBulletList,
	formatSeparator,
	formatDate,
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
	const lines: string[] = [];

	lines.push(formatHeading('AWS SSO: EC2 Command Output', 1));
	lines.push('');

	// Context Block
	const contextProps: Record<string, unknown> = {};
	contextProps['Instance ID'] = context.instanceId;
	contextProps['Account'] = context.accountId;
	contextProps['Role'] = context.roleName;
	if (context.region) contextProps['Region'] = context.region;
	else contextProps['Region'] = 'default';

	lines.push(formatHeading('Execution Context', 2));
	lines.push(formatBulletList(contextProps));
	lines.push('');

	// Command that was executed
	lines.push(formatHeading('Command', 2));
	lines.push(formatCodeBlock(command, 'bash'));
	lines.push('');

	// Success Case
	if (
		result.status === 'Success' &&
		(!result.responseCode || result.responseCode === 0)
	) {
		lines.push(formatHeading('Output', 2));
		if (result.output && result.output.trim()) {
			lines.push(formatCodeBlock(result.output));
		} else {
			lines.push('*Command completed successfully with no output.*');
		}
	}
	// Error Case
	else {
		const isPermissionError =
			context.suggestedRoles && context.suggestedRoles.length > 0;

		if (isPermissionError) {
			lines.push(formatHeading('Error: Permission Denied', 2));
			lines.push(
				`The command failed due to insufficient permissions for the role \`${context.roleName}\` in account \`${context.accountId}\`.`,
			);
		} else {
			lines.push(formatHeading('Error', 2));
			lines.push(
				`The command failed to execute. Status: ${result.status}`,
			);
		}

		lines.push('');
		if (result.responseCode !== undefined && result.responseCode !== null) {
			lines.push(`**Response Code**: ${result.responseCode}`);
			lines.push('');
		}

		lines.push(formatHeading('Output', 3));
		if (result.output && result.output.trim()) {
			lines.push(formatCodeBlock(result.output));
		} else {
			lines.push('*Command failed with no specific output.*');
		}
		lines.push('');

		// Add instructions for SSM Agent troubleshooting
		if (
			result.status === 'Failed' ||
			result.status === 'DeliveryTimedOut'
		) {
			lines.push(formatHeading('Troubleshooting', 3));
			lines.push('Possible issues:');
			lines.push(
				'- SSM Agent is not installed or running on the instance',
			);
			lines.push(
				'- Instance does not have an IAM role with SSM permissions',
			);
			lines.push('- Instance is not in a running state');
			lines.push('');
			lines.push('To check the SSM Agent status on the instance:');
			lines.push(
				formatCodeBlock(
					'sudo systemctl status amazon-ssm-agent',
					'bash',
				),
			);
			lines.push('');
		}

		// Add suggested roles section only on permission error
		if (isPermissionError) {
			lines.push(
				formatHeading(
					`Available Roles for Account ${context.accountId}`,
					3,
				),
			);
			if (context.suggestedRoles && context.suggestedRoles.length > 0) {
				context.suggestedRoles.forEach((role) => {
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
	lines.push(`*Command ID: ${result.commandId}*`);
	lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);

	return lines.join('\n');
}
