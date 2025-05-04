/**
 * AWS SSO service types
 * Defines the interfaces used for AWS SSO authentication and credential management
 */

/**
 * Type definition for AWS SSO Credentials
 * Contains the temporary AWS credentials retrieved after SSO authentication
 */
export type AwsSsoCredentials = {
	/**
	 * The access key ID for AWS credentials
	 */
	accessKeyId: string;

	/**
	 * The secret access key for AWS credentials
	 */
	secretAccessKey: string;

	/**
	 * The session token for AWS credentials
	 */
	sessionToken: string;

	/**
	 * The expiration time as a Unix timestamp in milliseconds
	 */
	expiration: number;

	/**
	 * Optional region override for AWS credentials
	 */
	region?: string;
};

/**
 * Type definition for AWS SSO Account
 * Represents an AWS account accessible via SSO
 */
export type AwsSsoAccount = {
	/**
	 * The AWS account ID
	 */
	accountId: string;

	/**
	 * The AWS account name
	 */
	accountName: string;

	/**
	 * Optional email address associated with the AWS account
	 */
	emailAddress?: string;
};

/**
 * Type definition for AWS SSO Account Role
 * Role within an AWS account that can be assumed via SSO
 */
export type AwsSsoAccountRole = {
	/**
	 * The AWS account ID
	 */
	accountId: string;

	/**
	 * The AWS role name
	 */
	roleName: string;

	/**
	 * Optional AWS role ARN
	 */
	roleArn?: string;
};
