/**
 * Types for AWS SSO command execution controller
 */

/**
 * Options for executing AWS CLI commands
 */
export interface ExecuteCommandOptions {
	/**
	 * AWS account ID to get credentials for
	 */
	accountId: string;

	/**
	 * AWS role name to assume via SSO
	 */
	roleName: string;

	/**
	 * AWS region to use (overrides default region)
	 */
	region?: string;

	/**
	 * AWS CLI command to execute as an array of command and arguments
	 * AWS CLI command string to execute
	 */
	command: string;
}

/**
 * Result of executing an AWS CLI command
 */
export interface CommandExecutionResult {
	/**
	 * Standard output from the command
	 */
	stdout: string;

	/**
	 * Standard error from the command
	 */
	stderr: string;

	/**
	 * Exit code from the command
	 */
	exitCode: number | null;
}
