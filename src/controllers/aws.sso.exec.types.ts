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
	 */
	command: string[];
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

/**
 * Metadata returned with command execution response
 */
export interface CommandExecutionMetadata {
	/**
	 * Whether the command was successful (exit code 0)
	 */
	success: boolean;

	/**
	 * Exit code from the command
	 */
	exitCode?: number;

	/**
	 * Standard output from the command
	 */
	stdout?: string;

	/**
	 * Standard error from the command
	 */
	stderr?: string;

	/**
	 * The command that was executed
	 */
	command?: string;

	/**
	 * AWS account ID used for credentials
	 */
	accountId?: string;

	/**
	 * AWS role name used for credentials
	 */
	roleName?: string;

	/**
	 * AWS region used for the command
	 */
	region?: string;

	/**
	 * Whether the user is authenticated
	 */
	authenticated?: boolean;

	/**
	 * Error message if authentication failed
	 */
	error?: string;
}
