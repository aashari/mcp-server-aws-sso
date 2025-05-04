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
			'Whether to launch the browser automatically for authentication',
		),

	/**
	 * Whether to automatically poll for authentication completion
	 */
	autoPoll: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'Whether to automatically poll for authentication completion',
		),
});

/**
 * Type definition from the LoginToolArgsSchema Zod schema
 */
export type LoginToolArgsType = z.infer<typeof LoginToolArgsSchema>;

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
 * Type definition from the ExecCommandToolArgs Zod schema
 */
export type ExecCommandToolArgsType = z.infer<typeof ExecCommandToolArgs>;
