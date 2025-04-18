import { z } from 'zod';

/**
 * Schema for the login tool
 */
export const LoginArgs = z.object({
	launchBrowser: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'Whether to automatically launch a browser for authentication (default: true)',
		),
});

/**
 * Type for the login tool arguments
 */
export type LoginToolArgsType = z.infer<typeof LoginArgs>;

/**
 * Schema for the list accounts tool
 */
export const ListAccountsArgs = z.object({
	// No parameters - always list all accounts with all roles
});

/**
 * Type for the list accounts tool arguments
 */
export type ListAccountsToolArgsType = z.infer<typeof ListAccountsArgs>;

/**
 * Schema for the Execute Command tool arguments
 */
export const ExecToolArgs = z.object({
	/**
	 * AWS account ID (12-digit number)
	 */
	accountId: z.string().min(12).describe('AWS account ID (12-digit number)'),

	/**
	 * AWS role name to assume via SSO
	 */
	roleName: z.string().min(1).describe('AWS role name to assume via SSO'),

	/**
	 * AWS region to use (optional)
	 */
	region: z.string().optional().describe('AWS region to use (optional)'),

	/**
	 * AWS CLI command to execute (e.g., "aws s3 ls")
	 */
	command: z
		.string()
		.min(1)
		.describe('AWS CLI command to execute (e.g., "aws s3 ls")'),
});

/**
 * Type definition from the Zod schema
 */
export type ExecToolArgsType = z.infer<typeof ExecToolArgs>;
