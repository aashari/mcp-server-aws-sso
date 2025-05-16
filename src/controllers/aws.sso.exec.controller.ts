import { Logger } from '../utils/logger.util.js';
import {
	handleControllerError,
	buildErrorContext,
} from '../utils/error-handler.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { checkSsoAuthStatus } from '../services/vendor.aws.sso.auth.service.js';
import { formatAuthRequired } from './aws.sso.auth.formatter.js';
import { executeCommand as executeServiceCommand } from '../services/vendor.aws.sso.exec.service.js';
import { listAccountRoles } from '../services/vendor.aws.sso.accounts.service.js';
import { ExecCommandToolArgsType } from '../tools/aws.sso.types.js';
import { formatCommandResult } from './aws.sso.exec.formatter.js';
import { RoleInfo } from '../services/vendor.aws.sso.types.js';
import { CommandExecutionResult } from './aws.sso.exec.types.js';

/**
 * AWS SSO Execution Controller Module
 *
 * Provides functionality for executing AWS CLI commands with temporary credentials
 * obtained via AWS SSO. Handles credential retrieval, environment setup, and
 * command execution with proper output formatting.
 */

// Create a module logger
const controllerLogger = Logger.forContext(
	'controllers/aws.sso.exec.controller.ts',
);

// Log module initialization
controllerLogger.debug('AWS SSO execution controller initialized');

/**
 * Execute an AWS CLI command with temporary credentials from SSO
 *
 * Gets temporary AWS credentials for the specified account and role via SSO,
 * then executes the AWS CLI command with those credentials in the environment.
 * Handles authentication verification, command execution, and result formatting.
 *
 * @async
 * @param {ExecCommandToolArgsType} options - Command execution options
 * @param {string} options.accountId - AWS account ID to get credentials for
 * @param {string} options.roleName - AWS role name to assume via SSO
 * @param {string} [options.region] - AWS region to use for the command (optional)
 * @param {string} options.command - AWS CLI command to execute as string
 * @returns {Promise<ControllerResponse>} - Formatted command execution result
 * @throws {Error} If authentication fails, command execution fails, or parameters are invalid
 * @example
 * // Execute an S3 list command
 * const result = await executeCommand({
 *   accountId: "123456789012",
 *   roleName: "AdminAccess",
 *   region: "us-east-1",
 *   command: "aws s3 ls"
 * });
 */
async function executeCommand(
	options: ExecCommandToolArgsType,
): Promise<ControllerResponse> {
	const execCommandLogger = Logger.forContext(
		'controllers/aws.sso.exec.controller.ts',
		'executeCommand',
	);
	execCommandLogger.debug('Executing AWS CLI command', options);

	try {
		// Check if user is authenticated
		const authStatus = await checkSsoAuthStatus();
		if (!authStatus.isAuthenticated) {
			execCommandLogger.debug('User is not authenticated', {
				errorMessage: authStatus.errorMessage,
			});

			// Return formatted auth required message
			return {
				content: formatAuthRequired(),
			};
		}

		// Validate command options
		if (!options.accountId || !options.roleName || !options.command) {
			throw new Error(
				'Missing required parameters: accountId, roleName, and command are required',
			);
		}

		// Log region usage
		if (options.region) {
			execCommandLogger.debug('Using explicitly provided region', {
				region: options.region,
			});
		}

		// Execute the command
		execCommandLogger.debug('Executing command with environment', {
			command: options.command,
			env: {
				AWS_REGION: options.region,
				AWS_DEFAULT_REGION: options.region,
			},
		});

		let result: CommandExecutionResult;
		let suggestedRoles: RoleInfo[] | undefined;

		try {
			// Execute the command via the service
			result = await executeServiceCommand(
				options.accountId,
				options.roleName,
				options.command,
				options.region,
			);

			execCommandLogger.debug('Command execution completed by service', {
				exitCode: result.exitCode,
				stdoutLength: result.stdout.length,
				stderrLength: result.stderr.length,
			});

			// Explicitly check for non-zero exit code even if service doesn't throw
			if (result.exitCode !== 0) {
				// Check for permission error indicators in stderr or stdout
				const errorOutput =
					(result.stderr || '') + (result.stdout || ''); // Combine outputs as errors can be in stdout
				const isPermissionError =
					/AccessDenied|UnauthorizedOperation|permission|denied/i.test(
						errorOutput,
					);

				if (isPermissionError) {
					execCommandLogger.debug(
						'Potential permission error detected based on output/exit code.',
						{
							accountId: options.accountId,
							exitCode: result.exitCode,
							errorOutputSnippet: errorOutput.substring(0, 100),
						},
					);
					try {
						// Attempt to fetch roles for this account
						const rolesResponse = await listAccountRoles({
							accountId: options.accountId,
						});
						suggestedRoles = rolesResponse.roleList;
						execCommandLogger.debug(
							`Found ${suggestedRoles?.length ?? 0} alternative roles for account ${options.accountId}.`,
						);
					} catch (roleError) {
						execCommandLogger.warn(
							'Failed to fetch alternative roles after permission error',
							roleError,
						);
						// Continue without suggested roles
						suggestedRoles = []; // Indicate that we tried but failed
					}
				}
				// Note: We don't throw here; the formatter will handle displaying the error
			}
		} catch (error) {
			// Handle errors thrown by executeServiceCommand itself
			execCommandLogger.error(
				'Error during command execution service call',
				error,
			);
			// Check if this underlying error is a permission error
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const isPermissionError =
				/AccessDenied|UnauthorizedOperation|permission|denied/i.test(
					errorMessage,
				);

			if (isPermissionError) {
				execCommandLogger.debug(
					'Potential permission error detected from service error.',
					{ accountId: options.accountId },
				);
				try {
					const rolesResponse = await listAccountRoles({
						accountId: options.accountId,
					});
					suggestedRoles = rolesResponse.roleList;
					execCommandLogger.debug(
						`Found ${suggestedRoles?.length ?? 0} alternative roles for account ${options.accountId}.`,
					);
				} catch (roleError) {
					execCommandLogger.warn(
						'Failed to fetch alternative roles after permission service error',
						roleError,
					);
					suggestedRoles = [];
				}
				// Construct a result object similar to what executeServiceCommand would return on failure
				result = {
					stdout: '',
					stderr: errorMessage,
					exitCode: 1, // Assume exit code 1 for service errors
				};
			} else {
				// If it's not a permission error caught here, re-throw for general handling
				throw error;
			}
		}

		// Format the result, passing suggestedRoles if available
		const formattedContent = formatCommandResult(options.command, result, {
			accountId: options.accountId,
			roleName: options.roleName,
			region: options.region,
			suggestedRoles: suggestedRoles,
		});

		return {
			content: formattedContent,
			metadata: {
				stdout: result.stdout,
				stderr: result.stderr,
				exitCode: result.exitCode ?? -1,
				accountId: options.accountId,
				roleName: options.roleName,
				region: options.region,
			},
		};
	} catch (error) {
		// Use throw instead of return
		throw handleControllerError(
			error,
			buildErrorContext(
				'AWS Command',
				'executing',
				'controllers/aws.sso.exec.controller.ts@executeCommand',
				`${options.accountId}/${options.roleName}`,
				{
					accountId: options.accountId,
					roleName: options.roleName,
					command: options.command,
					region: options.region,
				},
			),
		);
	}
}

export default {
	executeCommand,
};
