/**
 * Types for AWS SSO EC2 command execution controller
 */

/**
 * Result of executing a shell command on an EC2 instance via SSM
 */
export interface Ec2CommandExecutionResult {
	/**
	 * Standard output from the command (may contain stdout and stderr combined)
	 */
	output: string;

	/**
	 * Status of the command execution (Success, Failed, etc.)
	 */
	status: string;

	/**
	 * Command ID from SSM
	 */
	commandId: string;

	/**
	 * Instance ID where the command was executed
	 */
	instanceId: string;

	/**
	 * Response code (typically 0 for success, non-zero for errors)
	 */
	responseCode?: number | null;
}

/**
 * Context information for EC2 command execution
 */
export interface Ec2CommandContext {
	/**
	 * EC2 instance ID
	 */
	instanceId: string;

	/**
	 * EC2 instance name (if available)
	 */
	instanceName?: string;

	/**
	 * AWS account ID
	 */
	accountId: string;

	/**
	 * AWS role name used for execution
	 */
	roleName: string;

	/**
	 * AWS region
	 */
	region?: string;

	/**
	 * Array of suggested roles if permission error occurs
	 */
	suggestedRoles?: Array<{
		roleName: string;
	}>;
}
