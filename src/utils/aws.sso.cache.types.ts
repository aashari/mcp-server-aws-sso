/**
 * AWS SSO cache related types
 */
import { AwsSsoAccount, AwsSsoAccountRole } from '../services/aws.sso.types.js';

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
