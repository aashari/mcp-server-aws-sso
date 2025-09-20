import { Logger } from '../utils/logger.util.js';
// Import promisify and exec statically
import { promisify } from 'node:util';
import { exec as nodeExec } from 'node:child_process';
import { getAwsCredentials } from './vendor.aws.sso.accounts.service.js';
import { CommandExecutionResult } from '../controllers/aws.sso.exec.types.js';

const logger = Logger.forContext('services/vendor.aws.sso.exec.service.ts');

// Create promisified version once
const exec = promisify(nodeExec);

// Define interface for expected exec error properties
interface ExecError extends Error {
	code?: number;
	stdout?: string;
	stderr?: string;
}

/**
 * Execute AWS CLI command with temporary credentials
 *
 * Gets temporary credentials for the specified account and role, then executes
 * the AWS CLI command with those credentials in the environment.
 *
 * @param {string} accountId - AWS account ID to get credentials for
 * @param {string} roleName - AWS role name to assume via SSO
 * @param {string} commandString - AWS CLI command as a single string
 * @param {string} [region] - Optional AWS region override
 * @param {boolean} [forceRefreshCredentials] - Force refresh credentials even if cached
 * @returns {Promise<CommandExecutionResult>} Command execution result with stdout, stderr, and exit code
 * @throws {Error} If credentials cannot be obtained or command execution fails
 */
async function executeCommand(
	accountId: string,
	roleName: string,
	commandString: string,
	region?: string,
	forceRefreshCredentials?: boolean,
): Promise<CommandExecutionResult> {
	const methodLogger = logger.forMethod('executeCommand');
	methodLogger.debug('Executing AWS CLI command', {
		accountId,
		roleName,
		command: commandString,
		region,
		forceRefresh: !!forceRefreshCredentials,
	});

	// Validate parameters
	if (!accountId || !roleName) {
		throw new Error('Account ID and role name are required');
	}

	if (!commandString) {
		throw new Error('Command is required');
	}

	try {
		// Get credentials for the account and role
		const credentials = await getAwsCredentials({
			accountId,
			roleName,
			region,
			forceRefresh: forceRefreshCredentials,
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

		// Fix PATH to prioritize working AWS CLI binary
		// Prepend /usr/local/aws-cli to PATH so the working binary is found first
		const currentPath = processEnv.PATH || '';
		processEnv.PATH = `/usr/local/aws-cli:${currentPath}`;

		methodLogger.debug('Updated PATH for AWS CLI execution', {
			awsCliPath: '/usr/local/aws-cli',
			pathPrefix: processEnv.PATH.split(':').slice(0, 3),
		});

		// Set region if provided
		if (region) {
			processEnv.AWS_REGION = region;
			processEnv.AWS_DEFAULT_REGION = region;
		}

		// Execute the command
		const result = await executeChildProcess(commandString, processEnv);
		methodLogger.debug('Command execution completed', {
			exitCode: result.exitCode,
			stdoutBytes: result.stdout.length,
			stderrBytes: result.stderr.length,
		});

		// Check for credential validation errors
		if (result.exitCode !== 0 && !forceRefreshCredentials) {
			const credentialErrorPatterns = [
				'InvalidClientTokenId',
				'security token.*invalid',
				'InvalidToken',
				'expired',
				'credential.*verification',
			];

			const hasCredentialError = credentialErrorPatterns.some((pattern) =>
				new RegExp(pattern, 'i').test(result.stderr),
			);

			if (hasCredentialError) {
				methodLogger.debug(
					'Detected credential error, retrying with force refresh',
					{
						error: result.stderr.substring(0, 100), // Only log first 100 chars
					},
				);

				// Retry with forced credential refresh
				return executeCommand(
					accountId,
					roleName,
					commandString,
					region,
					true,
				);
			}
		}

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
 * @param {string} commandString - Command string to execute via shell
 * @param {NodeJS.ProcessEnv} env - Environment variables for the process
 * @returns {Promise<CommandExecutionResult>} Command execution result
 */
async function executeChildProcess(
	commandString: string,
	env: NodeJS.ProcessEnv,
): Promise<CommandExecutionResult> {
	const methodLogger = logger.forMethod('executeChildProcess');
	methodLogger.debug('Executing child process via shell', {
		command: commandString,
	});

	try {
		// Execute using exec, which uses a shell
		const { stdout, stderr } = await exec(commandString, { env });

		methodLogger.debug('Shell command completed successfully', {
			stdoutLength: stdout.length,
			stderrLength: stderr.length,
		});

		return {
			stdout,
			stderr,
			exitCode: 0, // exec throws on non-zero exit code
		};
	} catch (error) {
		// Handle errors from exec (includes non-zero exit codes)
		methodLogger.error('Shell command execution failed', { error });

		let exitCode = 1;
		let stdout = '';
		let stderr = '';

		if (typeof error === 'object' && error !== null) {
			// Cast to check for common exec error properties
			const execError = error as ExecError;
			exitCode = typeof execError.code === 'number' ? execError.code : 1;
			stdout =
				typeof execError.stdout === 'string' ? execError.stdout : '';
			stderr =
				typeof execError.stderr === 'string' ? execError.stderr : '';
		} else if (error instanceof Error) {
			// Fallback for generic Errors
			stderr = error.message;
		}

		return {
			stdout: String(stdout),
			stderr: String(stderr),
			exitCode: Number(exitCode) || 1,
		};
	}
}

export { executeCommand };
