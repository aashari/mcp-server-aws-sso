import { z } from 'zod';

/**
 * AWS SSO type definitions
 */

/**
 * Zod schema for AWS SSO configuration
 */
export const AwsSsoConfigSchema = z.object({
	/**
	 * The SSO start URL
	 */
	startUrl: z.string(),

	/**
	 * The AWS region
	 */
	region: z.string(),
});

/**
 * AWS SSO configuration type inferred from Zod schema
 */
export type AwsSsoConfig = z.infer<typeof AwsSsoConfigSchema>;

/**
 * Zod schema for SSO token data
 */
export const SsoTokenSchema = z.object({
	/**
	 * The access token for SSO
	 */
	accessToken: z.string(),

	/**
	 * The expiration time in seconds
	 */
	expiresIn: z.number(),

	/**
	 * The refresh token for SSO
	 */
	refreshToken: z.string().optional().default(''),

	/**
	 * The token type
	 */
	tokenType: z.string(),

	/**
	 * The time the token was retrieved
	 */
	retrievedAt: z.number(),

	/**
	 * The time the token expires
	 */
	expiresAt: z.number(),

	/**
	 * The AWS region for the token
	 */
	region: z.string().optional(),
});

/**
 * SSO token data type inferred from Zod schema
 */
export type SsoToken = z.infer<typeof SsoTokenSchema>;

/**
 * Zod schema for AWS SSO auth result
 */
export const AwsSsoAuthResultSchema = z.object({
	/**
	 * The access token for SSO
	 */
	accessToken: z.string(),

	/**
	 * The time the token expires
	 */
	expiresAt: z.number(),

	/**
	 * The AWS region for the token
	 */
	region: z.string().optional(),
});

/**
 * AWS SSO auth result type inferred from Zod schema
 */
export type AwsSsoAuthResult = z.infer<typeof AwsSsoAuthResultSchema>;

/**
 * Zod schema for AWS SSO Role
 */
export const AwsSsoRoleSchema = z.object({
	/**
	 * The name of the role
	 */
	roleName: z.string(),

	/**
	 * The ARN of the role
	 */
	roleArn: z.string(),

	/**
	 * The account ID the role belongs to
	 */
	accountId: z.string(),
});

/**
 * AWS SSO Role type inferred from Zod schema
 */
export type AwsSsoRole = z.infer<typeof AwsSsoRoleSchema>;

/**
 * Zod schema for AWS SSO Account
 */
const AwsSsoAccountSchema = z.object({
	/**
	 * The account ID
	 */
	accountId: z.string(),

	/**
	 * The account name
	 */
	accountName: z.string(),

	/**
	 * The account email
	 */
	accountEmail: z.string().optional(),
});

/**
 * Zod schema for AWS SSO Account with roles
 */
export const AwsSsoAccountWithRolesSchema = AwsSsoAccountSchema.extend({
	/**
	 * The roles in the account
	 */
	roles: z.array(AwsSsoRoleSchema),
});

/**
 * AWS SSO Account with roles type inferred from Zod schema
 */
export type AwsSsoAccountWithRoles = z.infer<
	typeof AwsSsoAccountWithRolesSchema
>;

/**
 * Zod schema for AWS credentials
 */
export const AwsCredentialsSchema = z.object({
	/**
	 * The access key ID
	 */
	accessKeyId: z.string(),

	/**
	 * The secret access key
	 */
	secretAccessKey: z.string(),

	/**
	 * The session token
	 */
	sessionToken: z.string(),

	/**
	 * The expiration time
	 */
	expiration: z.union([
		z.date(),
		z.number().transform((n) => new Date(n * 1000)),
		z.string().transform((s) => new Date(s)),
	]),

	/**
	 * Optional region override
	 */
	region: z.string().optional(),
});

/**
 * AWS credentials type inferred from Zod schema
 */
export type AwsCredentials = z.infer<typeof AwsCredentialsSchema>;

/**
 * Zod schema for parameters for getting AWS credentials
 */
export const GetCredentialsParamsSchema = z.object({
	/**
	 * The account ID to get credentials for
	 */
	accountId: z.string(),

	/**
	 * The role name to assume
	 */
	roleName: z.string(),

	/**
	 * Optional region override
	 */
	region: z.string().optional(),
});

/**
 * Parameters for getting AWS credentials type inferred from Zod schema
 */
export type GetCredentialsParams = z.infer<typeof GetCredentialsParamsSchema>;

/**
 * Zod schema for parameters for listing AWS SSO accounts
 */
export const ListAccountsParamsSchema = z.object({
	/**
	 * Optional maximum number of accounts to return
	 */
	maxResults: z.number().optional(),

	/**
	 * Optional pagination token
	 */
	nextToken: z.string().optional(),
});

/**
 * Parameters for listing AWS SSO accounts type inferred from Zod schema
 */
export type ListAccountsParams = z.infer<typeof ListAccountsParamsSchema>;

/**
 * Zod schema for AWS SSO account info from SDK
 */
const AccountInfoSchema = z.object({
	/**
	 * The account ID
	 */
	accountId: z.string().optional(),

	/**
	 * The account name
	 */
	accountName: z.string().optional(),

	/**
	 * The account email
	 */
	emailAddress: z.string().optional(),
});

/**
 * Zod schema for response for listing AWS SSO accounts
 */
export const ListAccountsResponseSchema = z.object({
	/**
	 * The accounts returned
	 */
	accountList: z.array(AccountInfoSchema),

	/**
	 * Token for paginated results, if more are available
	 */
	nextToken: z.string().optional(),
});

/**
 * Response for listing AWS SSO accounts type inferred from Zod schema
 */
export type ListAccountsResponse = z.infer<typeof ListAccountsResponseSchema>;

/**
 * Zod schema for parameters for listing account roles
 */
export const ListAccountRolesParamsSchema = z.object({
	/**
	 * The account ID to list roles for
	 */
	accountId: z.string(),

	/**
	 * Optional maximum number of roles to return
	 */
	maxResults: z.number().optional(),

	/**
	 * Optional pagination token
	 */
	nextToken: z.string().optional(),
});

/**
 * Parameters for listing account roles type inferred from Zod schema
 */
export type ListAccountRolesParams = z.infer<
	typeof ListAccountRolesParamsSchema
>;

/**
 * Zod schema for role information from AWS SSO API
 */
export const RoleInfoSchema = z.object({
	/**
	 * The name of the role
	 */
	roleName: z.string().optional(),

	/**
	 * The ARN of the role (might not be present in all responses)
	 */
	roleArn: z.string().optional(),
});

/**
 * Role information from AWS SSO API type inferred from Zod schema
 */
export type RoleInfo = z.infer<typeof RoleInfoSchema>;

/**
 * Zod schema for response for listing account roles
 */
export const ListAccountRolesResponseSchema = z.object({
	/**
	 * The roles returned
	 */
	roleList: z.array(RoleInfoSchema),

	/**
	 * Token for paginated results, if more are available
	 */
	nextToken: z.string().optional(),
});

/**
 * Response for listing account roles type inferred from Zod schema
 */
export type ListAccountRolesResponse = z.infer<
	typeof ListAccountRolesResponseSchema
>;

/**
 * Zod schema for device authorization information
 */
export const DeviceAuthorizationInfoSchema = z.object({
	/**
	 * The client ID for SSO
	 */
	clientId: z.string(),

	/**
	 * The client secret for SSO
	 */
	clientSecret: z.string(),

	/**
	 * The device code for SSO
	 */
	deviceCode: z.string(),

	/**
	 * The verification URI
	 */
	verificationUri: z.string().optional(),

	/**
	 * The complete verification URI including user code
	 */
	verificationUriComplete: z.string().optional(),

	/**
	 * The user code
	 */
	userCode: z.string().optional(),

	/**
	 * The expiration time in seconds
	 */
	expiresIn: z.number(),

	/**
	 * The polling interval in seconds
	 */
	interval: z.number().optional(),

	/**
	 * The AWS region for SSO
	 */
	region: z.string(),
});

/**
 * Device authorization information type inferred from Zod schema
 */
export type DeviceAuthorizationInfo = z.infer<
	typeof DeviceAuthorizationInfoSchema
>;
