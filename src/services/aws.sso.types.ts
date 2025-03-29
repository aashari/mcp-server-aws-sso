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
 * AWS SSO Auth Result
 * Result of a successful AWS SSO authentication
 */
export interface AwsSsoAuthResult {
	accessToken: string; // SSO access token
	expiresAt: number; // Unix timestamp in seconds when token expires
	region?: string; // Region used for the SSO authentication
	startUrl?: string; // SSO portal start URL used
}

/**
 * AWS SSO Configuration
 * Settings used to configure AWS SSO login
 */
export interface AwsSsoConfig {
	region: string; // AWS region for SSO service calls
	startUrl?: string; // Optional explicit SSO start URL
	profileName?: string; // Optional AWS profile name for config/credential lookup
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

/**
 * AWS SSO Account with Roles
 * Account with its assigned roles
 */
export interface AwsSsoAccountWithRoles {
	account: AwsSsoAccount;
	roles: AwsSsoAccountRole[];
	timestamp: number; // When roles were last retrieved
}

/**
 * AWS SSO Device Authorization Details
 * Details returned from the SSO OIDC device authorization flow
 */
export interface AwsSsoDeviceAuth {
	deviceCode: string;
	userCode: string;
	verificationUri: string;
	verificationUriComplete?: string;
	expiresIn: number;
	interval: number;
	clientId: string;
	clientSecret: string;
}

/**
 * AWS SSO Cache Entry
 * Structure for storing SSO data in cache file
 */
export interface AwsSsoCache {
	ssoToken?: AwsSsoAuthResult;
	credentials?: Record<string, AwsSsoCredentialsCacheEntry>;
	lastAuth?: number;
	accountRoles?: AwsSsoAccountWithRoles[]; // Cached account and role data
	accountsTimestamp?: number; // When accounts list was last retrieved
}

/**
 * AWS SSO Credentials Cache Entry
 * Structure for storing credentials in cache file
 */
export interface AwsSsoCredentialsCacheEntry extends AwsSsoCredentials {
	timestamp: number; // When credentials were obtained
	accountId: string; // AWS account ID
	roleName: string; // AWS role name
}
