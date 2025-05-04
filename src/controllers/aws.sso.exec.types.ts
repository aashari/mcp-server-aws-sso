/**
 * Types for AWS SSO command execution controller
 */

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
