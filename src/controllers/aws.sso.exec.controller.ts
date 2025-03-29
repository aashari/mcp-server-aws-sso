import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { executeCommand } from '../services/vendor.aws.sso.exec.service.js';
import { ExecuteCommandOptions } from './aws.sso.exec.types.js';
import {
	formatAuthRequired,
	formatCommandOutput,
} from './aws.sso.exec.formatter.js';
import { checkSsoAuthStatus } from '../services/vendor.aws.sso.auth.service.js';

/**
 * AWS SSO Execution Controller Module
 *
 * Provides functionality for executing AWS CLI commands with temporary credentials
 * obtained via AWS SSO. Handles credential retrieval, environment setup, and
 * command execution with proper output formatting.
 */

// Create a module logger
const moduleLogger = Logger.forContext(
	'controllers/aws.sso.exec.controller.ts',
);

// Log module initialization
moduleLogger.debug('AWS SSO execution controller initialized');

/**
 * Execute an AWS CLI command with temporary credentials from SSO
 *
 * Gets temporary AWS credentials for the specified account and role via SSO,
 * then executes the AWS CLI command with those credentials in the environment.
 * Handles authentication verification, command execution, and result formatting.
 *
 * @async
 * @param {ExecuteCommandOptions} options - Command execution options
 * @param {string} options.accountId - AWS account ID to get credentials for
 * @param {string} options.roleName - AWS role name to assume via SSO
 * @param {string} [options.region] - AWS region to use for the command (optional)
 * @param {string[]} options.command - AWS CLI command to execute as array of strings
 * @returns {Promise<ControllerResponse>} - Formatted command execution result
 * @throws {Error} If authentication fails, command execution fails, or parameters are invalid
 * @example
 * // Execute an S3 list command
 * const result = await executeAwsCommand({
 *   accountId: "123456789012",
 *   roleName: "AdminAccess",
 *   region: "us-east-1",
 *   command: ["aws", "s3", "ls"]
 * });
 */
async function executeAwsCommand(
	options: ExecuteCommandOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/aws.sso.exec.controller.ts',
		'executeAwsCommand',
	);
	methodLogger.debug('Executing AWS CLI command', options);

	try {
		// Check if user is authenticated
		const authStatus = await checkSsoAuthStatus();
		if (!authStatus.isAuthenticated) {
			methodLogger.debug('User is not authenticated', {
				errorMessage: authStatus.errorMessage,
			});

			// Return formatted auth required message
			return {
				content: formatAuthRequired(),
			};
		}

		// Validate command options
		if (
			!options.accountId ||
			!options.roleName ||
			!options.command?.length
		) {
			throw new Error(
				'Missing required parameters: accountId, roleName, and command are required',
			);
		}

		// Log region usage
		if (options.region) {
			methodLogger.debug('Using explicitly provided region', {
				region: options.region,
			});
		}

		// Execute the command
		methodLogger.debug('Executing command with environment', {
			command: options.command.join(' '),
			env: {
				AWS_REGION: options.region,
				AWS_DEFAULT_REGION: options.region,
			},
		});

		const result = await executeCommand(
			options.accountId,
			options.roleName,
			options.command,
			options.region,
		);

		methodLogger.debug('Command execution completed', {
			exitCode: result.exitCode,
			stdoutLength: result.stdout.length,
			stderrLength: result.stderr.length,
		});

		// Format the result
		const commandStr = Array.isArray(options.command)
			? options.command.join(' ')
			: options.command;

		const formattedOutput = formatCommandOutput(
			commandStr,
			result.stdout,
			result.stderr,
			result.exitCode,
		);

		return {
			content: formattedOutput,
		};
	} catch (error) {
		// Handle errors using standard pattern
		return handleControllerError(error, {
			entityType: 'AWS Command',
			operation: 'executing',
			source: 'controllers/aws.sso.exec.controller.ts@executeAwsCommand',
			additionalInfo: {
				accountId: options.accountId,
				roleName: options.roleName,
				command: options.command,
			},
		});
	}
}

export default {
	executeCommand: executeAwsCommand,
};
