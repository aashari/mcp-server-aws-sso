/**
 * AWS SSO Service
 * Main entry point for all AWS SSO related functionality
 */
import { Logger } from '../utils/logger.util.js';

// Import functions from specialized services
import {
	getAwsSsoConfig,
	startSsoLogin,
	pollForSsoToken,
	getCachedSsoToken,
	getCachedDeviceAuthorizationInfo,
} from './vendor.aws.sso.auth.service.js';

import {
	listSsoAccounts,
	listAccountRoles,
	getAwsCredentials,
	getAccountsWithRoles,
	getCachedCredentials,
} from './aws.sso.accounts.service.js';

// Import additional utility functions
import { clearSsoToken } from '../utils/aws.sso.cache.util.js';

// Create logger instance for the file
const logger = Logger.forContext('services/aws.sso.service.ts');

// First log to indicate service initialization
logger.debug('AWS SSO service initialized');

// Export functions as a default export object, matching Atlassian pattern
const awsSsoService = {
	// Auth-related functions
	getAwsSsoConfig,
	startSsoLogin,
	pollForSsoToken,
	getCachedSsoToken,
	getCachedDeviceAuthorizationInfo,
	clearSsoToken,

	// Account and role-related functions
	listSsoAccounts,
	listAccountRoles,
	getAwsCredentials,
	getAccountsWithRoles,
	getCachedCredentials,
};

export default awsSsoService;
