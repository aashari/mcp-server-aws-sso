import { Logger } from '../utils/logger.util.js';
import { spawn } from 'child_process';
import { getAwsCredentials } from './vendor.aws.sso.accounts.service.js';
import { CommandExecutionResult } from './vendor.aws.sso.types.js';

const logger = Logger.forContext('services/vendor.aws.sso.exec.service.ts');

/**
 * Execute a command with AWS credentials injected into the environment.
 *
 * Retrieves AWS credentials using the accounts service, injects them into
 * the environment, and then executes the provided command string using spawn.
 *
 * @param accountId The AWS account ID.
 * @param roleName The AWS role name.
 * @param commandString The full command string to execute.
 * @param region Optional AWS region.
 * @returns Promise resolving to CommandExecutionResult.
 */
async function executeAwsCommand(
	accountId: string,
	roleName: string,
	commandString: string,
	region?: string,
): Promise<CommandExecutionResult> {
	const methodLogger = logger.forMethod('executeAwsCommand');
	methodLogger.debug('Executing command with AWS credentials', {
		accountId,
		roleName,
		command: commandString,
		region,
	});

	// Get AWS credentials
	const credentials = await getAwsCredentials({
		accountId,
		roleName,
	});

	// Set environment variables for the command
	const env: NodeJS.ProcessEnv = {
		...process.env,
		AWS_ACCESS_KEY_ID: credentials.accessKeyId,
		AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
		AWS_SESSION_TOKEN: credentials.sessionToken,
	};

	if (region) {
		env.AWS_REGION = region;
		env.AWS_DEFAULT_REGION = region;
	}

	methodLogger.debug('Environment prepared for command execution', {
		command: commandString,
		region: env.AWS_REGION,
		hasSessionToken: !!env.AWS_SESSION_TOKEN,
	});

	// Execute the command using spawn
	return new Promise((resolve, reject) => {
		// Use shell: true to handle expansions like $(date ...)
		const child = spawn(commandString, [], {
			env,
			stdio: 'pipe',
			shell: true,
		});

		let stdout = '';
		let stderr = '';

		if (child.stdout) {
			child.stdout.on('data', (data) => {
				stdout += data.toString();
			});
		}

		if (child.stderr) {
			child.stderr.on('data', (data) => {
				stderr += data.toString();
			});
		}

		child.on('close', (code) => {
			methodLogger.debug('Command finished', { commandString, code });
			resolve({ stdout, stderr, exitCode: code });
		});

		child.on('error', (err) => {
			methodLogger.error('Command execution error', {
				commandString,
				err,
			});
			reject(err);
		});
	});
}

export { executeAwsCommand };
