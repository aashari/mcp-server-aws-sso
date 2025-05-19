import { Logger } from '../utils/logger.util.js';
import {
	handleControllerError,
	buildErrorContext,
} from '../utils/error-handler.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { checkSsoAuthStatus } from '../services/vendor.aws.sso.auth.service.js';
import { formatAuthRequired } from './aws.sso.auth.formatter.js';
import * as ec2Service from '../services/vendor.aws.sso.ec2.service.js';
import { listAccountRoles } from '../services/vendor.aws.sso.accounts.service.js';
import { formatEc2CommandResult } from './aws.sso.ec2.formatter.js';
import { Ec2CommandContext } from './aws.sso.ec2.types.js';

/**
 * AWS SSO EC2 Execution Controller Module
 *
 * Provides functionality for executing shell commands on EC2 instances via SSM
 * using temporary credentials obtained via AWS SSO. Handles authentication verification,
 * command execution, and result formatting.
 */

// Create a module logger
const logger = Logger.forContext('controllers/aws.sso.ec2.controller.ts');

// Log module initialization
logger.debug('AWS SSO EC2 execution controller initialized');

/**
 * Execute a shell command on an EC2 instance via SSM
 *
 * @param options Command execution options
 * @returns Controller response containing the formatted command output
 * @throws Error if the command execution fails
 */
export async function executeEc2Command(options: {
	instanceId: string;
	accountId: string;
	roleName: string;
	command: string;
	region?: string;
}): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('executeEc2Command');
	methodLogger.debug('Executing EC2 command via SSM', options);

	try {
		// Check authentication status first
		const authStatus = await checkSsoAuthStatus();
		if (!authStatus.isAuthenticated) {
			return {
				content: formatAuthRequired(),
			};
		}

		// Determine region to use
		let region = options.region;
		if (!region) {
			// Use AWS_REGION environment variable if set, otherwise default to ap-southeast-1
			region = process.env.AWS_REGION || 'ap-southeast-1';
		}
		methodLogger.debug(
			options.region
				? 'Using explicitly provided region'
				: 'Using default region',
			{ region },
		);

		// Execute the command on the EC2 instance
		methodLogger.debug('Executing command on EC2 instance', {
			instanceId: options.instanceId,
			command: options.command,
			env: { AWS_REGION: region },
		});

		// Call the service to execute the command
		const commandResult = await ec2Service.executeEc2Command({
			instanceId: options.instanceId,
			accountId: options.accountId,
			roleName: options.roleName,
			command: options.command,
			region: region,
		});

		// Get available roles for this account to suggest context
		let suggestedRoles: Array<{ roleName: string }> = [];
		try {
			const rolesResult = await listAccountRoles({
				accountId: options.accountId,
			});

			// Map role list to the expected format for suggestedRoles
			suggestedRoles = rolesResult.roleList
				.map((role) => ({
					roleName: role.roleName || '',
				}))
				.filter((role) => role.roleName);
		} catch (error) {
			// Just log the error but continue
			methodLogger.warn(
				'Could not retrieve suggested roles for context',
				error,
			);
		}

		// Create context for formatter
		const context: Ec2CommandContext = {
			instanceId: options.instanceId,
			instanceName: commandResult.instanceName,
			accountId: options.accountId,
			roleName: options.roleName,
			region: region,
			suggestedRoles,
		};

		// Log the full context for debugging
		methodLogger.debug('Created formatter context', context);

		// Format the result
		const formattedOutput = formatEc2CommandResult(
			options.command,
			commandResult,
			context,
		);

		return {
			content: formattedOutput,
		};
	} catch (error) {
		methodLogger.error(
			'Error during command execution service call',
			error,
		);

		// Build error context for standardized error handling
		const errorContext = buildErrorContext(
			'EC2 Command',
			'executing',
			'controllers/aws.sso.ec2.controller.ts@executeEc2Command',
			`${options.instanceId}/${options.accountId}/${options.roleName}`,
			options,
		);

		throw handleControllerError(error, errorContext);
	}
}

export default {
	executeEc2Command,
};
