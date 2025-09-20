import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { buildErrorContext } from '../utils/error-types.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { getCachedSsoToken } from '../services/vendor.aws.sso.auth.core.service.js';
import {
	startSsoLogin,
	pollForSsoToken,
} from '../services/vendor.aws.sso.auth.service.js';
import {
	getAwsCredentials,
	getCachedCredentials,
} from '../services/vendor.aws.sso.accounts.service.js';
import {
	formatAlreadyLoggedIn,
	formatLoginWithBrowserLaunch,
	formatLoginManual,
	formatCredentials,
	formatAuthRequired,
} from './aws.sso.auth.formatter.js';
import { LoginToolArgsType } from '../tools/aws.sso.types.js';
import { formatDate } from '../utils/formatter.util.js';

/**
 * AWS SSO Authentication Controller Module
 *
 * Provides functionality for authenticating with AWS SSO, initiating the login flow,
 * and retrieving temporary credentials. Handles browser-based authentication,
 * token management, and credential retrieval.
 */

// Create a module logger
const controllerLogger = Logger.forContext(
	'controllers/aws.sso.auth.controller.ts',
);

// Log module initialization
controllerLogger.debug('AWS SSO authentication controller initialized');

/**
 * Start the AWS SSO login process
 *
 * Initiates the device authorization flow, displays verification instructions,
 * and starts background polling for authentication completion.
 *
 * @async
 * @param {Object} [params] - Optional parameters for login
 * @param {boolean} [params.launchBrowser=true] - Whether to automatically launch a browser with the verification URI
 * @returns {Promise<ControllerResponse>} Response with login instructions and background polling started
 * @throws {Error} If login initialization fails
 * @example
 * // Start login with automatic browser launch and background polling
 * const result = await startLogin();
 *
 * // Start login without browser launch but with background polling
 * const result = await startLogin({ launchBrowser: false });
 */
async function startLogin(
	params?: LoginToolArgsType,
): Promise<ControllerResponse> {
	const loginLogger = Logger.forContext(
		'controllers/aws.sso.auth.controller.ts',
		'startLogin',
	);

	loginLogger.debug('Starting AWS SSO login process');
	loginLogger.info('Initiating device authorization flow for AWS SSO');

	// Get browser launch preference
	const launchBrowser = params?.launchBrowser ?? true;

	try {
		// Forcibly clear any existing authorization data to ensure a fresh start
		loginLogger.debug('Clearing any existing device authorization data');
		try {
			// Import the cache utility to directly clear the auth data
			const ssoCache = await import('../utils/aws.sso.cache.util.js');
			await ssoCache.clearDeviceAuthorizationInfo();
			loginLogger.debug(
				'Successfully cleared device authorization cache',
			);
		} catch (clearError) {
			loginLogger.warn(
				'Error clearing device authorization data',
				clearError,
			);
			// Continue even if clearing fails
		}

		// Check if we already have a valid token
		const cachedToken = await getCachedSsoToken();
		if (cachedToken) {
			loginLogger.debug('Found valid token in cache');

			// Format expiration date for display
			let expiresDate = 'Unknown';
			try {
				if (cachedToken.expiresAt) {
					const expirationDate = new Date(
						cachedToken.expiresAt * 1000,
					);
					expiresDate = expirationDate.toLocaleString();
				}
			} catch (error) {
				loginLogger.error('Error formatting expiration date', error);
			}

			// Don't try to list accounts, which might fail - just show that we're already logged in
			return {
				content: formatAlreadyLoggedIn(expiresDate),
			};
		}

		// Start the login flow
		loginLogger.debug('No valid token found, initiating new login flow');
		const deviceAuth = await startSsoLogin();

		// Launch browser if enabled
		let browserLaunched = false;
		if (launchBrowser) {
			try {
				// AWS SSO provides a complete URI that includes the user code
				// This is the preferred URL to launch in the browser
				const verificationUrl = deviceAuth.verificationUriComplete;

				if (!verificationUrl) {
					loginLogger.debug(
						'No verificationUriComplete provided, browser launch might not work properly',
					);
				}

				loginLogger.debug('Attempting to launch browser', {
					verificationUri:
						verificationUrl || deviceAuth.verificationUri,
					userCode: deviceAuth.userCode,
				});

				// Use dynamic import for 'open' package
				const openModule = await import('open');
				const open = openModule.default;

				// Try to open the browser with the verification URI
				// Important: Use the complete URI that includes the user code if available
				await open(verificationUrl || deviceAuth.verificationUri);
				browserLaunched = true;
				loginLogger.debug(
					'Browser launched successfully with URL:',
					verificationUrl || deviceAuth.verificationUri,
				);
			} catch (browserError) {
				loginLogger.error('Failed to launch browser', browserError);
				// Browser launch failed, but continue with manual instructions
				browserLaunched = false;
			}
		} else {
			loginLogger.debug('Browser launch disabled');
		}

		// Build initial response based on whether browser was launched
		let initialContent: string;

		if (browserLaunched) {
			// Even when browser is launched, still include manual instructions
			// so users have the information if they need it
			initialContent =
				formatLoginWithBrowserLaunch(
					deviceAuth.verificationUri,
					deviceAuth.userCode,
				) +
				'\n\n' +
				formatLoginManual(
					deviceAuth.verificationUri,
					deviceAuth.userCode,
				);
		} else {
			initialContent = formatLoginManual(
				deviceAuth.verificationUri,
				deviceAuth.userCode,
			);
		}

		// Display the login instructions
		loginLogger.info(initialContent);

		// Start background polling (non-blocking)
		loginLogger.debug('Starting background polling for authentication');
		loginLogger.info('Background polling started - authentication will be processed automatically');

		// Start polling in the background without blocking the response
		// Use setImmediate to ensure this runs after the response is sent
		setImmediate(async () => {
			try {
				loginLogger.debug('Background polling: Starting token polling');
				const authResult = await pollForSsoToken();
				loginLogger.info('Background polling: Authentication successful, token received', {
					expiresAt: authResult.expiresAt,
				});
			} catch (error) {
				loginLogger.error('Background polling: Authentication failed', error);
				// In background mode, we just log the error and don't throw
				// The user can check status using aws_sso_status tool
			}
		});

		// Add device info to the content for clarity
		const deviceInfoContent = `
## Authentication Details
- Verification Code: **${deviceAuth.userCode}**
- Browser ${browserLaunched ? 'Launched' : 'Not Launched'}: ${browserLaunched ? 'Yes' : 'No'}
- Verification URL: ${deviceAuth.verificationUri}
- Code Expires In: ${Math.floor(deviceAuth.expiresIn / 60)} minutes
- Background Polling: **Active** (credentials will be collected automatically)

Complete the authentication in your browser. Use 'aws_sso_status' to check completion status, or proceed with other AWS commands once authenticated.`;

		// Return instructions immediately with background polling active
		return {
			content: initialContent + deviceInfoContent,
		};
	} catch (error) {
		// Handle startup errors - throw directly without retry
		const errorContext = buildErrorContext(
			'AWS SSO Authentication',
			'login',
			'controllers/aws.sso.auth.controller.ts@startLogin',
			undefined,
			{
				launchBrowser,
			},
		);
		throw handleControllerError(error, errorContext);
	}
}

/**
 * Get AWS credentials for a specific role
 *
 * Retrieves temporary AWS credentials for a specific account and role
 * that can be used for AWS API calls. Uses cached credentials if available.
 *
 * @async
 * @param {Object} params - Credential parameters
 * @param {string} params.accessToken - AWS SSO access token
 * @param {string} params.accountId - AWS account ID
 * @param {string} params.roleName - IAM role name to get credentials for
 * @returns {Promise<ControllerResponse>} Response with credential status and formatted output
 * @throws {Error} If credential retrieval fails or authentication is invalid
 * @example
 * // Get credentials for role AdminAccess in account 123456789012
 * const result = await getCredentials({
 *   accessToken: "token-value",
 *   accountId: "123456789012",
 *   roleName: "AdminAccess"
 * });
 */
async function getCredentials(params: {
	accessToken: string;
	accountId: string;
	roleName: string;
}): Promise<ControllerResponse> {
	const credentialsLogger = Logger.forContext(
		'controllers/aws.sso.auth.controller.ts',
		'getCredentials',
	);
	credentialsLogger.debug(
		`Getting credentials for role ${params.roleName} in account ${params.accountId}`,
	);

	try {
		// Check if we have valid cached credentials
		let credentials = await getCachedCredentials(
			params.accountId,
			params.roleName,
		);
		let fromCache = false;

		if (credentials) {
			credentialsLogger.debug('Using cached credentials');
			fromCache = true;
		} else {
			// Get fresh credentials
			credentialsLogger.debug('Getting fresh credentials');
			credentials = await getAwsCredentials({
				accountId: params.accountId,
				roleName: params.roleName,
				// Vendor implementation doesn't use accessToken parameter directly
				// It will get the token from the cache
			});
		}

		// Convert AWS SDK credentials to the format expected by the formatter
		const convertedCredentials = {
			accessKeyId: credentials.accessKeyId,
			secretAccessKey: credentials.secretAccessKey,
			sessionToken: credentials.sessionToken,
			expiration:
				typeof credentials.expiration === 'object'
					? credentials.expiration.getTime() / 1000 // Convert Date to unix timestamp
					: credentials.expiration,
			region: credentials.region,
		};

		return {
			content: formatCredentials(
				fromCache,
				params.accountId,
				params.roleName,
				convertedCredentials,
			),
		};
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'AWS Credentials',
				'retrieving',
				'controllers/aws.sso.auth.controller.ts@getCredentials',
				`${params.accountId}/${params.roleName}`,
				{
					accountId: params.accountId,
					roleName: params.roleName,
				},
			),
		);
	}
}

/**
 * Check if user is authenticated to AWS SSO
 *
 * @returns Promise<{ isAuthenticated: boolean, errorMessage?: string }>
 */
async function checkSsoAuthStatus(): Promise<{
	isAuthenticated: boolean;
	errorMessage?: string;
}> {
	const statusLogger = Logger.forContext(
		'controllers/aws.sso.auth.controller.ts',
		'checkSsoAuthStatus',
	);
	statusLogger.debug('Checking AWS SSO authentication status');

	try {
		const token = await getCachedSsoToken();
		if (!token) {
			statusLogger.debug('No SSO token found');
			return {
				isAuthenticated: false,
				errorMessage:
					'No AWS SSO session found. Please authenticate using login.',
			};
		}

		// Check if token is expired
		const now = Math.floor(Date.now() / 1000); // Current time in seconds
		if (token.expiresAt <= now) {
			statusLogger.debug('SSO token is expired');
			return {
				isAuthenticated: false,
				errorMessage:
					'AWS SSO session has expired. Please authenticate again using login.',
			};
		}

		statusLogger.debug('User is authenticated with valid token');
		return { isAuthenticated: true };
	} catch (error) {
		statusLogger.error('Error checking authentication status', error);
		return {
			isAuthenticated: false,
			errorMessage: `Error checking authentication: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}

/**
 * Get the current AWS SSO authentication status
 *
 * Checks if the user is currently authenticated to AWS SSO
 * and returns the status information
 *
 * @returns {Promise<ControllerResponse>} Response with authentication status
 */
async function getAuthStatus(): Promise<ControllerResponse> {
	const statusLogger = Logger.forContext(
		'controllers/aws.sso.auth.controller.ts',
		'getAuthStatus',
	);
	statusLogger.debug('Getting authentication status');

	try {
		// Use existing checkSsoAuthStatus method
		const status = await checkSsoAuthStatus();

		if (status.isAuthenticated) {
			// Get token directly to check expiration
			const token = await getCachedSsoToken();

			// Format expiration date for display
			let expiresDate = 'Unknown';
			try {
				if (token && token.expiresAt) {
					const expirationDate = new Date(token.expiresAt * 1000);
					expiresDate = formatDate(expirationDate);
				}
			} catch (error) {
				statusLogger.error('Error formatting expiration date', error);
			}

			return {
				content: formatAlreadyLoggedIn(expiresDate),
			};
		} else {
			return {
				content: formatAuthRequired(),
			};
		}
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'AWS SSO Session',
				'checking status',
				'controllers/aws.sso.auth.controller.ts@getAuthStatus',
				undefined,
				{},
			),
		);
	}
}

export default {
	startLogin,
	getCredentials,
	checkSsoAuthStatus,
	getAuthStatus,
};
