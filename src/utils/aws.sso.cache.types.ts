/**
 * AWS SSO cache related types
 */
import { AwsSsoAccount, AwsSsoAccountRole } from '../services/aws.sso.types.js';

/**
 * AWS SSO cache
 */
export interface AwsSsoCache {
	[key: string]: AwsSsoCredentialsCacheEntry;
}

/**
 * AWS SSO credentials cache entry
 */
export interface AwsSsoCredentialsCacheEntry {
	/**
	 * The accounts cache
	 */
	accounts?: {
		expiresAt: number;
		accounts: AwsSsoAccount[];
	};

	/**
	 * The roles cache by account ID
	 */
	roles?: {
		[accountId: string]: {
			expiresAt: number;
			roles: AwsSsoAccountRole[];
		};
	};
}

/**
 * AWS profile
 */
export interface AwsProfile {
	/**
	 * The AWS region
	 */
	region?: string;

	/**
	 * The AWS output format
	 */
	output?: string;

	/**
	 * The SSO start URL
	 */
	ssoStartUrl?: string;

	/**
	 * The SSO account ID
	 */
	ssoAccountId?: string;

	/**
	 * The SSO role name
	 */
	ssoRoleName?: string;

	/**
	 * The SSO region
	 */
	ssoRegion?: string;
}

/**
 * AWS CLI config data
 */
export interface CliConfigData {
	/**
	 * Profiles in the config file
	 */
	profiles: Record<string, AwsProfile>;
}

/**
 * AWS role credentials
 */
export interface AwsRoleCredentials {
	/**
	 * The AWS access key ID
	 */
	accessKeyId: string;

	/**
	 * The AWS secret access key
	 */
	secretAccessKey: string;

	/**
	 * The AWS session token
	 */
	sessionToken: string;

	/**
	 * The expiration time
	 */
	expiration: number;
}

/**
 * AWS SSO registration
 */
export interface AwsSsoRegistration {
	/**
	 * The client ID
	 */
	clientId: string;

	/**
	 * The client secret
	 */
	clientSecret: string;

	/**
	 * The expiration time
	 */
	expiresAt: string;
}

/**
 * AWS SSO token
 */
export interface AwsSsoToken {
	/**
	 * The access token
	 */
	accessToken: string;

	/**
	 * The expiration time in seconds
	 */
	expiresIn: number;

	/**
	 * The token refresh token
	 */
	refreshToken: string;

	/**
	 * The token type
	 */
	tokenType: string;
}

/**
 * AWS SSO session
 */
export interface AwsSsoSession {
	/**
	 * The session name
	 */
	name: string;

	/**
	 * The session start URL
	 */
	startUrl: string;

	/**
	 * The session region
	 */
	region: string;
}

/**
 * AWS SSO credentials
 */
export interface AwsSsoCredentials {
	/**
	 * The access key ID
	 */
	accessKeyId: string;

	/**
	 * The secret access key
	 */
	secretAccessKey: string;

	/**
	 * The session token
	 */
	sessionToken: string;

	/**
	 * The role ARN
	 */
	roleArn?: string;

	/**
	 * The region
	 */
	region?: string;

	/**
	 * The expiration time
	 */
	expiration: number;
}
