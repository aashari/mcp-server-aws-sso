import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { buildErrorContext } from '../utils/error-types.util.js';
import { detectErrorType } from '../utils/error-detection.util.js';
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
	formatLoginSuccess,
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
 * and optionally waits for authentication completion.
 *
 * @async
 * @param {Object} [params] - Optional parameters for login
 * @param {boolean} [params.autoPoll=true] - Whether to automatically poll for token completion
 * @param {boolean} [params.launchBrowser=true] - Whether to automatically launch a browser with the verification URI
 * @returns {Promise<ControllerResponse>} Response with login result, including accounts if successful
 * @throws {Error} If login initialization fails or polling times out
 * @example
 * // Start login with automatic polling and browser launch
 * const result = await startLogin();
 *
 * // Start login without automatic polling or browser launch
 * const result = await startLogin({ autoPoll: false, launchBrowser: false });
 */
async function startLogin(
	params?: LoginToolArgsType,
): Promise<ControllerResponse> {
	const loginLogger = Logger.forContext(
		'controllers/aws.sso.auth.controller.ts',
		'startLogin',
	);

	loginLogger.debug('Starting AWS SSO login process');

	// Directly use the provided boolean values, defaulting to true if undefined
	const autoPoll = params?.autoPoll ?? true;
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

		// If autoPoll is disabled, just return instructions
		if (!autoPoll) {
			loginLogger.info('Complete the authentication in your browser.');
			loginLogger.info(
				"You can then use 'list-accounts' to verify authentication and view available accounts.",
			);

			// Add device info to the content for clarity
			const deviceInfoContent = `
## Authentication Details
- Verification Code: **${deviceAuth.userCode}**
- Browser ${browserLaunched ? 'Launched' : 'Not Launched'}: ${browserLaunched ? 'Yes' : 'No'}
- Verification URL: ${deviceAuth.verificationUri}
- Code Expires In: ${Math.floor(deviceAuth.expiresIn / 60)} minutes

Complete the authentication in your browser. You can then use 'list-accounts' to verify authentication and view available accounts.`;

			// Return instructions without automatic polling
			return {
				content: initialContent + deviceInfoContent,
			};
		}

		// With automatic polling enabled, wait for authentication to complete
		loginLogger.debug(
			'Automatic polling enabled, waiting for authentication',
		);

		loginLogger.info(
			'Waiting for you to complete authentication in your browser...',
		);

		// Now poll for the token - this will continuously poll until success or timeout
		try {
			const authResult = await pollForSsoToken();
			loginLogger.debug('Authentication successful, token received', {
				expiresAt: authResult.expiresAt,
			});

			// Format expiration date
			let expiresDate = 'Unknown';
			try {
				if (authResult.expiresAt) {
					const expirationDate = new Date(
						authResult.expiresAt * 1000,
					);
					expiresDate = expirationDate.toLocaleString();
				}
			} catch (error) {
				loginLogger.error('Error formatting expiration date', error);
			}

			// Return success response
			return {
				content: formatLoginSuccess(expiresDate),
			};
		} catch (error) {
			// Just throw the error without any retry attempts
			const { code } = detectErrorType(error);

			// Re-throw with improved context
			const errorContext = buildErrorContext(
				'AWS SSO Authentication',
				'login',
				'controllers/aws.sso.auth.controller.ts@startLogin',
				undefined,
				{
					autoPoll,
					launchBrowser,
					errorCode: code,
				},
			);
			throw handleControllerError(error, errorContext);
		}
	} catch (error) {
		// Handle startup errors - throw directly without retry
		const errorContext = buildErrorContext(
			'AWS SSO Authentication',
			'login',
			'controllers/aws.sso.auth.controller.ts@startLogin',
			undefined,
			{
				autoPoll,
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
