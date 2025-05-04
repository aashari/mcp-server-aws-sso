import { z } from 'zod';

/**
 * Schema for the Login tool arguments
 */
export const LoginToolArgsSchema = z.object({
	launchBrowser: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'Whether to automatically launch the browser for authentication',
		),
	autoPoll: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'Whether to automatically poll for completion after browser launch',
		),
});

/**
 * Type for the Login tool arguments, inferred from Zod schema
 */
export type LoginToolArgsType = z.infer<typeof LoginToolArgsSchema>;

/**
 * Schema for the List Accounts tool arguments (currently none)
 */
export const ListAccountsArgsSchema = z.object({});

/**
 * Type for the List Accounts tool arguments, inferred from Zod schema
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
 * Type definition from the Zod schema
 */
export type ExecCommandToolArgsType = z.infer<typeof ExecCommandToolArgs>;
