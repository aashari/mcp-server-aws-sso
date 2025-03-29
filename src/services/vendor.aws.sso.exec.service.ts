import { Logger } from '../utils/logger.util.js';
import { spawn } from 'child_process';
import { getAwsCredentials } from './vendor.aws.sso.accounts.service.js';
import { CommandExecutionResult } from '../controllers/aws.sso.exec.types.js';

const logger = Logger.forContext('services/vendor.aws.sso.exec.service.ts');

/**
 * Execute AWS CLI command with temporary credentials
 *
 * Gets temporary credentials for the specified account and role, then executes
 * the AWS CLI command with those credentials in the environment.
 *
 * @param {string} accountId - AWS account ID to get credentials for
 * @param {string} roleName - AWS role name to assume via SSO
 * @param {string[]} command - AWS CLI command and arguments as array
 * @param {string} [region] - Optional AWS region override
 * @returns {Promise<CommandExecutionResult>} Command execution result with stdout, stderr, and exit code
 * @throws {Error} If credentials cannot be obtained or command execution fails
 */
async function executeCommand(
	accountId: string,
	roleName: string,
	command: string[],
	region?: string,
): Promise<CommandExecutionResult> {
	const methodLogger = logger.forMethod('executeCommand');
	methodLogger.debug('Executing AWS CLI command', {
		accountId,
		roleName,
		command,
		region,
	});

	// Validate parameters
	if (!accountId || !roleName) {
		throw new Error('Account ID and role name are required');
	}

	if (!command || command.length === 0) {
		throw new Error('Command is required');
	}

	try {
		// Get credentials for the account and role
		const credentials = await getAwsCredentials({
			accountId,
			roleName,
			region,
		});

		methodLogger.debug('Obtained temporary credentials', {
			accountId,
			roleName,
			expiration: credentials.expiration.toISOString(),
		});

		// Set up environment variables for the command
		const processEnv = { ...process.env };

		// Add AWS credentials to the environment
		processEnv.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
		processEnv.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
		processEnv.AWS_SESSION_TOKEN = credentials.sessionToken;

		// Set region if provided
		if (region) {
			processEnv.AWS_REGION = region;
			processEnv.AWS_DEFAULT_REGION = region;
		}

		// Execute the command
		const result = await executeChildProcess(
			command[0],
			command.slice(1),
			processEnv,
		);
		methodLogger.debug('Command execution completed', {
			exitCode: result.exitCode,
			stdoutBytes: result.stdout.length,
			stderrBytes: result.stderr.length,
		});

		return result;
	} catch (error) {
		methodLogger.error('Failed to execute command', error);
		throw error;
	}
}

/**
 * Execute child process with the given command and arguments
 *
 * Helper function to spawn a child process and collect its output.
 *
 * @param {string} command - Command to execute
 * @param {string[]} args - Command arguments
 * @param {NodeJS.ProcessEnv} env - Environment variables for the process
 * @returns {Promise<CommandExecutionResult>} Command execution result
 */
async function executeChildProcess(
	command: string,
	args: string[],
	env: NodeJS.ProcessEnv,
): Promise<CommandExecutionResult> {
	const methodLogger = logger.forMethod('executeChildProcess');
	methodLogger.debug('Executing child process', {
		command,
		args,
	});

	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			env,
			stdio: 'pipe',
			shell: false,
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (data) => {
			stdout += data.toString();
		});

		child.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		child.on('error', (error) => {
			methodLogger.error('Child process error', error);
			reject(error);
		});

		child.on('close', (exitCode) => {
			methodLogger.debug('Child process completed', {
				exitCode,
				stdoutLength: stdout.length,
				stderrLength: stderr.length,
			});

			resolve({
				stdout,
				stderr,
				exitCode: exitCode ?? 1,
			});
		});
	});
}

export { executeCommand };
