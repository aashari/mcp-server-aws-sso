import { z } from 'zod';

/**
 * Schema for the login tool arguments
 */
export const LoginToolArgsSchema = z.object({
	/**
	 * Whether to launch the browser automatically
	 */
	launchBrowser: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'Whether to launch the browser automatically for the AWS SSO authentication flow. Defaults to true. If set to false, you will need to manually open the authentication URL and enter the provided verification code. This may be necessary in environments where automatic browser launch is not possible or when running on a remote server without display access.',
		),

	/**
	 * Whether to automatically poll for authentication completion
	 */
	autoPoll: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'Whether to automatically poll the AWS SSO service to wait for authentication completion. Defaults to true. If set to false, the tool will only initiate the login process but not wait for it to complete, and you will need to check status separately using the aws_sso_status tool. This is useful when you want to start authentication but handle completion checking through separate calls.',
		),
});

/**
 * Type definition from the LoginToolArgsSchema Zod schema
 */
export type LoginToolArgsType = z.infer<typeof LoginToolArgsSchema>;

/**
 * Schema for the status tool arguments (empty object as it takes no arguments)
 */
export const StatusToolArgsSchema = z.object({});

/**
 * Type definition from the StatusToolArgsSchema Zod schema
 */
export type StatusToolArgsType = z.infer<typeof StatusToolArgsSchema>;

/**
 * Schema for the List Accounts tool arguments (empty object as it takes no arguments)
 */
export const ListAccountsArgsSchema = z.object({});

/**
 * Type definition from the ListAccountsArgsSchema Zod schema
 */
export type ListAccountsArgsType = z.infer<typeof ListAccountsArgsSchema>;

/**
 * Schema for the Execute Command tool arguments
 */
export const ExecCommandToolArgs = z.object({
	/**
	 * AWS account ID (12-digit number)
	 */
	accountId: z
		.string()
		.min(12)
		.describe(
			'AWS account ID (12-digit number, e.g., "123456789012"). This identifies the specific AWS account where the command will be executed. The account must be accessible to you through AWS SSO. You can obtain a list of available account IDs and their associated roles by first using the aws_sso_ls_accounts tool.',
		),

	/**
	 * AWS role name to assume via SSO
	 */
	roleName: z
		.string()
		.min(1)
		.describe(
			'AWS IAM role name to assume via SSO (e.g., "AdministratorAccess", "ReadOnlyAccess"). Specify only the role name, not the full ARN. This role must be available to you through AWS SSO for the specified account. You can find available roles by first using the aws_sso_ls_accounts tool to list accounts and their associated roles.',
		),

	/**
	 * AWS region to use (optional)
	 */
	region: z
		.string()
		.optional()
		.describe(
			'AWS region to use for the command (e.g., "us-east-1", "eu-west-1"). If not provided, the default region from your AWS SSO configuration or AWS config will be used. Some AWS services may be region-specific, so specifying the region can be important for certain commands.',
		),

	/**
	 * AWS CLI command to execute (e.g., "aws s3 ls")
	 */
	command: z
		.string()
		.min(1)
		.describe(
			'AWS CLI command to execute (e.g., "aws s3 ls", "aws ec2 describe-instances"). Include the full command string exactly as you would type it in a terminal. For complex commands with quotes, ensure proper escaping (e.g., "aws ec2 run-instances --image-id ami-12345 --tag-specifications \'ResourceType=instance,Tags=[{Key=Name,Value=TestInstance}]\'"). The AWS CLI must be installed on the system where the MCP server is running.',
		),
});

/**
 * Type definition from the ExecCommandToolArgs Zod schema
 */
export type ExecCommandToolArgsType = z.infer<typeof ExecCommandToolArgs>;
