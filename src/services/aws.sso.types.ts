import { z } from 'zod';

/**
 * AWS SSO service types
 * Defines the interfaces used for AWS SSO authentication and credential management
 */

/**
 * Zod schema for AWS SSO Credentials
 * Contains the temporary AWS credentials retrieved after SSO authentication
 */
export const AwsSsoCredentialsSchema = z.object({
	/**
	 * The access key ID for AWS credentials
	 */
	accessKeyId: z.string(),

	/**
	 * The secret access key for AWS credentials
	 */
	secretAccessKey: z.string(),

	/**
	 * The session token for AWS credentials
	 */
	sessionToken: z.string(),

	/**
	 * The expiration time as a Unix timestamp in milliseconds
	 */
	expiration: z.number(),

	/**
	 * Optional region override for AWS credentials
	 */
	region: z.string().optional(),
});

/**
 * AWS SSO Credentials type inferred from Zod schema
 */
export type AwsSsoCredentials = z.infer<typeof AwsSsoCredentialsSchema>;

/**
 * Zod schema for AWS SSO Account
 * Represents an AWS account accessible via SSO
 */
export const AwsSsoAccountSchema = z.object({
	/**
	 * The AWS account ID
	 */
	accountId: z.string(),

	/**
	 * The AWS account name
	 */
	accountName: z.string(),

	/**
	 * Optional email address associated with the AWS account
	 */
	emailAddress: z.string().optional(),
});

/**
 * AWS SSO Account type inferred from Zod schema
 */
export type AwsSsoAccount = z.infer<typeof AwsSsoAccountSchema>;

/**
 * Zod schema for AWS SSO Account Role
 * Role within an AWS account that can be assumed via SSO
 */
export const AwsSsoAccountRoleSchema = z.object({
	/**
	 * The AWS account ID
	 */
	accountId: z.string(),

	/**
	 * The AWS role name
	 */
	roleName: z.string(),

	/**
	 * Optional AWS role ARN
	 */
	roleArn: z.string().optional(),
});

/**
 * AWS SSO Account Role type inferred from Zod schema
 */
export type AwsSsoAccountRole = z.infer<typeof AwsSsoAccountRoleSchema>;
