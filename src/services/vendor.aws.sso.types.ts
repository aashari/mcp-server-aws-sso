/**
 * AWS SSO type definitions
 */

/**
 * AWS SSO configuration
 */
export interface AwsSsoConfig {
	/**
	 * The SSO start URL
	 */
	startUrl: string;

	/**
	 * The AWS region
	 */
	region: string;
}

/**
 * SSO token data
 */
export interface SsoToken {
	/**
	 * The access token for SSO
	 */
	accessToken: string;

	/**
	 * The expiration time in seconds
	 */
	expiresIn: number;

	/**
	 * The refresh token for SSO
	 */
	refreshToken: string;

	/**
	 * The token type
	 */
	tokenType: string;

	/**
	 * The time the token was retrieved
	 */
	retrievedAt: number;

	/**
	 * The time the token expires
	 */
	expiresAt: number;

	/**
	 * The AWS region for the token
	 */
	region?: string;
}

/**
 * AWS SSO auth result
 */
export interface AwsSsoAuthResult {
	/**
	 * The access token for SSO
	 */
	accessToken: string;

	/**
	 * The time the token expires
	 */
	expiresAt: number;

	/**
	 * The AWS region for the token
	 */
	region?: string;
}

/**
 * AWS SSO Role
 */
export interface AwsSsoRole {
	/**
	 * The name of the role
	 */
	roleName: string;

	/**
	 * The ARN of the role
	 */
	roleArn: string;

	/**
	 * The account ID the role belongs to
	 */
	accountId: string;
}

/**
 * AWS SSO Account
 */
export interface AwsSsoAccount {
	/**
	 * The account ID
	 */
	accountId: string;

	/**
	 * The account name
	 */
	accountName: string;

	/**
	 * The account email
	 */
	accountEmail?: string;
}

/**
 * AWS SSO Account with roles
 */
export interface AwsSsoAccountWithRoles extends AwsSsoAccount {
	/**
	 * The roles in the account
	 */
	roles: AwsSsoRole[];
}

/**
 * AWS credentials
 */
export interface AwsCredentials {
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
	 * The expiration time
	 */
	expiration: Date;

	/**
	 * Optional region override
	 */
	region?: string;
}

/**
 * Parameters for getting AWS credentials
 */
export interface GetCredentialsParams {
	/**
	 * The account ID to get credentials for
	 */
	accountId: string;

	/**
	 * The role name to assume
	 */
	roleName: string;

	/**
	 * Optional region override
	 */
	region?: string;
}

/**
 * Parameters for listing AWS SSO accounts
 */
export interface ListAccountsParams {
	/**
	 * Optional maximum number of accounts to return
	 */
	maxResults?: number;

	/**
	 * Optional pagination token
	 */
	nextToken?: string;
}

/**
 * Response for listing AWS SSO accounts
 */
export interface ListAccountsResponse {
	/**
	 * The accounts returned
	 */
	accountList: AwsSsoAccount[];

	/**
	 * Token for paginated results, if more are available
	 */
	nextToken?: string;
}

/**
 * Parameters for listing account roles
 */
export interface ListAccountRolesParams {
	/**
	 * The account ID to list roles for
	 */
	accountId: string;

	/**
	 * Optional maximum number of roles to return
	 */
	maxResults?: number;

	/**
	 * Optional pagination token
	 */
	nextToken?: string;
}

/**
 * Role information from AWS SSO API
 */
export interface RoleInfo {
	/**
	 * The name of the role
	 */
	roleName?: string;

	/**
	 * The ARN of the role (might not be present in all responses)
	 */
	roleArn?: string;
}

/**
 * Response for listing account roles
 */
export interface ListAccountRolesResponse {
	/**
	 * The roles returned
	 */
	roleList: RoleInfo[];

	/**
	 * Token for paginated results, if more are available
	 */
	nextToken?: string;
}

/**
 * Represents the standard result of executing a command.
 */
export interface CommandExecutionResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
}
