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
