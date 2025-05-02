/**
 * AWS SSO Accounts Controller Types
 *
 * Type definitions for AWS SSO accounts controller operations, including
 * request parameters, response data, and intermediate data structures.
 */

/**
 * Options for listing AWS account roles
 */
export interface ListRolesOptions {
	/**
	 * AWS SSO access token
	 */
	accessToken: string;

	/**
	 * AWS account ID to list roles for
	 */
	accountId: string;
}

/**
 * AWS account information
 */
export interface AwsAccount {
	/**
	 * AWS account ID (12-digit number)
	 */
	accountId: string;

	/**
	 * Human-readable account name
	 */
	accountName: string;

	/**
	 * Email address associated with the account
	 */
	email?: string;
}

/**
 * AWS role information
 */
export interface AwsRole {
	/**
	 * Role name (e.g., "AWSAdministratorAccess")
	 */
	roleName: string;

	/**
	 * Role ARN (Amazon Resource Name)
	 */
	roleArn?: string;

	/**
	 * Creation date for the role
	 */
	createdDate?: string;
}

/**
 * Account with associated roles
 */
export interface AccountWithRoles {
	/**
	 * Account information
	 */
	account: AwsAccount;

	/**
	 * Roles available in this account
	 */
	roles: AwsRole[];

	/**
	 * Timestamp when this data was retrieved
	 */
	timestamp?: number;
}

/**
 * Options for listing AWS accounts
 * Extends common pagination options and adds search query
 */
export interface ListAccountsOptions {
	/**
	 * Optional limit for pagination
	 */
	limit?: number;

	/**
	 * Optional cursor (start index) for pagination
	 */
	cursor?: string;

	/**
	 * Optional search query
	 */
	query?: string;
}
