/**
 * AWS SSO service types
 * Defines the interfaces used for AWS SSO authentication and credential management
 */

/**
 * AWS SSO Credentials
 * Contains the temporary AWS credentials retrieved after SSO authentication
 */
export interface AwsSsoCredentials {
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken: string;
	expiration: number; // Unix timestamp in milliseconds
	region?: string; // Optional region override
}

/**
 * AWS SSO Account
 * Represents an AWS account accessible via SSO
 */
export interface AwsSsoAccount {
	accountId: string;
	accountName: string;
	emailAddress?: string;
}

/**
 * AWS SSO Account Role
 * Role within an AWS account that can be assumed via SSO
 */
export interface AwsSsoAccountRole {
	accountId: string;
	roleName: string;
	roleArn?: string;
}
