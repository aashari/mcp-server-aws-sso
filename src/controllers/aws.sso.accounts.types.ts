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
