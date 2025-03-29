/**
 * AWS SSO Service
 *
 * Main entry point for all AWS SSO related functionality.
 * Re-exports all AWS SSO services for easier access.
 */
import { Logger } from '../utils/logger.util.js';

// Import functions from specialized services
import {
	getAwsSsoConfig,
	startSsoLogin,
	pollForSsoToken,
	checkSsoAuthStatus,
	getCachedSsoToken,
} from './vendor.aws.sso.auth.service.js';

import {
	listSsoAccounts,
	listAccountRoles,
	getAwsCredentials,
	getAccountsWithRoles,
	getCachedCredentials,
} from './vendor.aws.sso.accounts.service.js';

import { executeCommand } from './vendor.aws.sso.exec.service.js';

// Create logger instance for the file
const serviceLogger = Logger.forContext('services/vendor.aws.sso.service.ts');

// First log to indicate service initialization
serviceLogger.debug('AWS SSO service initialized');

/**
 * AWS SSO Service
 *
 * Provides functions for authentication, account management, and command execution.
 */
export const awsSsoService = {
	// Auth-related functions
	getAwsSsoConfig,
	startSsoLogin,
	pollForSsoToken,
	checkSsoAuthStatus,
	getCachedSsoToken,

	// Account and role-related functions
	listSsoAccounts,
	listAccountRoles,
	getAwsCredentials,
	getAccountsWithRoles,
	getCachedCredentials,

	// Command execution functions
	executeCommand,
};
