import { Logger } from '../utils/logger.util.js';
import { getAwsCredentials } from './vendor.aws.sso.accounts.service.js';
import { Ec2CommandExecutionResult } from '../controllers/aws.sso.ec2.types.js';
import { createApiError } from '../utils/error.util.js';
import { withRetry } from '../utils/retry.util.js';
import {
	SSMClient,
	SendCommandCommand,
	GetCommandInvocationCommand,
} from '@aws-sdk/client-ssm';

const logger = Logger.forContext('services/vendor.aws.sso.ec2.service.ts');

// Default timeout for polling command completion (in milliseconds)
const DEFAULT_COMMAND_TIMEOUT_MS = 20000;
// Poll interval (in milliseconds)
const POLL_INTERVAL_MS = 1000;

/**
 * Interface for parameters to execute an EC2 command via SSM
 */
export interface ExecuteEc2CommandParams {
	/**
	 * EC2 instance ID
	 */
	instanceId: string;

	/**
	 * AWS account ID
	 */
	accountId: string;

	/**
	 * AWS role name
	 */
	roleName: string;

	/**
	 * Shell command to execute
	 */
	command: string;

	/**
	 * AWS region
	 */
	region?: string;

	/**
	 * Command execution timeout in milliseconds
	 */
	timeout?: number;

	/**
	 * Whether to force refresh credentials
	 */
	forceRefresh?: boolean;
}

/**
 * Execute a shell command on an EC2 instance via SSM
 *
 * @param params Parameters for command execution
 * @returns Command execution result
 * @throws Error if the command execution fails
 */
export async function executeEc2Command(
	params: ExecuteEc2CommandParams,
): Promise<Ec2CommandExecutionResult> {
	const methodLogger = logger.forMethod('executeEc2Command');
	methodLogger.debug('Executing EC2 command via SSM', params);

	// Validate parameters
	if (
		!params.instanceId ||
		!params.accountId ||
		!params.roleName ||
		!params.command
	) {
		throw new Error(
			'Instance ID, account ID, role name, and command are required',
		);
	}

	try {
		// Get AWS credentials for the specified account and role
		const credentials = await getAwsCredentials({
			accountId: params.accountId,
			roleName: params.roleName,
			forceRefresh: params.forceRefresh,
		});

		methodLogger.debug('Obtained temporary credentials', {
			accountId: params.accountId,
			roleName: params.roleName,
			expiration: credentials.expiration,
			region: params.region,
		});

		// Create SSM client with credentials
		const ssmClient = new SSMClient({
			credentials: {
				accessKeyId: credentials.accessKeyId,
				secretAccessKey: credentials.secretAccessKey,
				sessionToken: credentials.sessionToken,
			},
			region: params.region, // Use the explicitly provided region
		});

		// Send the command to the instance
		methodLogger.debug('Sending command to EC2 instance', {
			instanceId: params.instanceId,
			command: params.command,
		});

		const sendCommand = new SendCommandCommand({
			InstanceIds: [params.instanceId],
			DocumentName: 'AWS-RunShellScript',
			Parameters: {
				commands: [params.command],
			},
		});

		const sendResult = await withRetry(() => ssmClient.send(sendCommand), {
			maxRetries: 3,
			initialDelayMs: 1000,
			backoffFactor: 2.0,
			retryCondition: (error: unknown) => {
				// Retry on throttling or temporary errors
				const errorName =
					error && typeof error === 'object' && 'name' in error
						? String(error.name)
						: '';
				return (
					errorName === 'ThrottlingException' ||
					errorName === 'InternalServerError' ||
					errorName === 'ServiceUnavailableException'
				);
			},
		});

		if (!sendResult.Command?.CommandId) {
			throw createApiError(
				'Failed to send command: No command ID returned',
			);
		}

		const commandId = sendResult.Command.CommandId;
		methodLogger.debug('Command sent successfully', { commandId });

		// Poll for command completion
		return await pollCommandCompletion(
			ssmClient,
			commandId,
			params.instanceId,
			params.timeout || DEFAULT_COMMAND_TIMEOUT_MS,
		);
	} catch (error: unknown) {
		methodLogger.error('Failed to execute EC2 command', error);

		// Handle specific error cases with more helpful messages
		if (error && typeof error === 'object' && 'name' in error) {
			const errorName = String(error.name);

			if (errorName === 'InvalidInstanceId') {
				throw createApiError(
					`Instance ${params.instanceId} not found or not connected to SSM. Ensure the instance is running and has the SSM Agent installed.`,
					undefined,
					error,
				);
			} else if (errorName === 'AccessDeniedException') {
				throw createApiError(
					`Access denied. The role "${params.roleName}" does not have permission to execute SSM commands on instance ${params.instanceId}.`,
					undefined,
					error,
				);
			}

			// Generic error
			throw createApiError(
				`Failed to execute command on instance ${params.instanceId}: ${
					error && typeof error === 'object' && 'message' in error
						? String(error.message)
						: String(error)
				}`,
				undefined,
				error,
			);
		}

		// Generic case if error doesn't have a name
		throw createApiError(
			`Failed to execute command on instance ${params.instanceId}: ${String(error)}`,
			undefined,
			error,
		);
	}
}

/**
 * Polls for the completion status of a command
 *
 * @param client SSM client
 * @param commandId Command ID to poll
 * @param instanceId Instance ID where the command was executed
 * @param timeoutMs Timeout in milliseconds
 * @returns Command execution result
 * @throws Error if polling fails or times out
 */
async function pollCommandCompletion(
	client: SSMClient,
	commandId: string,
	instanceId: string,
	timeoutMs: number,
): Promise<Ec2CommandExecutionResult> {
	const pollLogger = logger.forMethod('pollCommandCompletion');
	pollLogger.debug('Polling for command completion', {
		commandId,
		instanceId,
		timeoutMs,
	});

	const startTime = Date.now();
	let elapsedTime = 0;

	while (elapsedTime < timeoutMs) {
		try {
			const result = await withRetry(
				() =>
					client.send(
						new GetCommandInvocationCommand({
							CommandId: commandId,
							InstanceId: instanceId,
						}),
					),
				{
					maxRetries: 3,
					initialDelayMs: 1000,
					backoffFactor: 2.0,
					retryCondition: (error: unknown) => {
						// Retry on throttling or temporary errors
						const errorName =
							error &&
							typeof error === 'object' &&
							'name' in error
								? String(error.name)
								: '';

						// Don't retry on InvocationDoesNotExist as this often means
						// the command has been accepted but not yet propagated in SSM
						if (errorName === 'InvocationDoesNotExist') {
							return false;
						}

						return (
							errorName === 'ThrottlingException' ||
							errorName === 'InternalServerError' ||
							errorName === 'ServiceUnavailableException'
						);
					},
				},
			);

			pollLogger.debug('Command status poll result', {
				commandId,
				instanceId,
				status: result.Status,
			});

			// Pending and InProgress statuses mean we need to keep polling
			if (result.Status === 'Pending' || result.Status === 'InProgress') {
				await new Promise((resolve) =>
					setTimeout(resolve, POLL_INTERVAL_MS),
				);
				elapsedTime = Date.now() - startTime;
				continue;
			}

			// Command has completed (success, failed, etc.)
			return {
				output: result.StandardOutputContent || '',
				status: result.Status || 'Unknown',
				commandId,
				instanceId,
				responseCode: result.ResponseCode || null,
			};
		} catch (error: unknown) {
			// Check if it's an InvocationDoesNotExist error
			const errorName =
				error && typeof error === 'object' && 'name' in error
					? String(error.name)
					: '';

			if (errorName === 'InvocationDoesNotExist') {
				// This happens when the command is still being propagated
				// Wait and then continue polling
				pollLogger.debug(
					'Command invocation not found yet, waiting...',
					{ commandId, instanceId },
				);
				await new Promise((resolve) =>
					setTimeout(resolve, POLL_INTERVAL_MS),
				);
				elapsedTime = Date.now() - startTime;
				continue;
			}

			pollLogger.error('Error polling command status', error);
			throw createApiError(
				`Failed to get command status: ${
					error && typeof error === 'object' && 'message' in error
						? String(error.message)
						: String(error)
				}`,
				undefined,
				error,
			);
		}
	}

	// If we get here, we've timed out
	throw createApiError(
		`Command execution timed out after ${timeoutMs / 1000} seconds`,
	);
}
