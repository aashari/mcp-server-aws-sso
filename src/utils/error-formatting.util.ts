import { Logger } from './logger.util.js';
import { ErrorCode, ErrorContext } from './error-types.util.js';
import { baseCommandFormatter } from './formatter.util.js';
import { getDefaultAwsRegion } from './aws.sso.util.js';
import { ensureMcpError } from './error.util.js';
import { detectErrorType } from './error-detection.util.js';

/**
 * Create user-friendly error messages based on error type and context
 * @param code The error code
 * @param context Context information for better error messages
 * @param originalMessage The original error message
 * @returns User-friendly error message
 */
export function createUserFriendlyErrorMessage(
	code: ErrorCode,
	context: ErrorContext = {},
	originalMessage?: string,
): string {
	const methodLogger = Logger.forContext(
		'utils/error-formatting.util.ts',
		'createUserFriendlyErrorMessage',
	);
	const { entityType, entityId, operation } = context;

	// Format entity ID for display
	let entityIdStr = '';
	if (entityId) {
		if (typeof entityId === 'string') {
			entityIdStr = entityId;
		} else {
			// Handle object entityId
			entityIdStr = Object.values(entityId).join('/');
		}
	}

	// Determine entity display name
	const entity = entityType
		? `${entityType}${entityIdStr ? ` ${entityIdStr}` : ''}`
		: 'Resource';

	let message = '';

	switch (code) {
		case ErrorCode.NOT_FOUND:
		case ErrorCode.AWS_SDK_RESOURCE_NOT_FOUND:
			message = `${entity} not found${entityIdStr ? `: ${entityIdStr}` : ''}. Verify the ID is correct and that you have access to this ${entityType?.toLowerCase() || 'resource'}.`;
			break;

		case ErrorCode.ACCESS_DENIED:
		case ErrorCode.AWS_SDK_PERMISSION_DENIED:
			message = `Access denied for ${entity.toLowerCase()}${entityIdStr ? ` ${entityIdStr}` : ''}. Verify your credentials and permissions.`;
			break;

		case ErrorCode.INVALID_CURSOR:
			message = `Invalid pagination cursor. Use the exact cursor string returned from previous results.`;
			break;

		case ErrorCode.VALIDATION_ERROR:
		case ErrorCode.AWS_SDK_INVALID_REQUEST:
			message =
				originalMessage ||
				`Invalid data provided for ${operation || 'operation'} ${entity.toLowerCase()}.`;
			break;

		case ErrorCode.NETWORK_ERROR:
			message = `Network error while ${operation || 'connecting to'} the service. Please check your internet connection and try again.`;
			break;

		case ErrorCode.RATE_LIMIT_ERROR:
		case ErrorCode.AWS_SDK_THROTTLING:
			message = `Rate limit exceeded. Please wait a moment and try again, or reduce the frequency of requests.`;
			break;

		case ErrorCode.AWS_SSO_DEVICE_AUTH_TIMEOUT:
			message = `AWS SSO authentication timed out. Please run 'login' again and complete the authorization in your browser.`;
			break;

		case ErrorCode.AWS_SSO_TOKEN_EXPIRED:
			message = `AWS SSO token has expired. Please run 'login' to get a new token.`;
			break;

		case ErrorCode.AWS_SSO_AUTH_PENDING:
			message = `AWS SSO authorization is pending. Please complete the authorization in your browser.`;
			break;

		case ErrorCode.AWS_SSO_AUTH_DENIED:
			message = `AWS SSO authorization was denied. Please run 'login' and approve the access request.`;
			break;

		default:
			message = `An unexpected error occurred while ${operation || 'processing'} ${entity.toLowerCase()}.`;
	}

	// Include original message details if appropriate
	if (
		originalMessage &&
		code !== ErrorCode.NOT_FOUND &&
		code !== ErrorCode.ACCESS_DENIED &&
		code !== ErrorCode.AWS_SDK_RESOURCE_NOT_FOUND &&
		code !== ErrorCode.AWS_SDK_PERMISSION_DENIED
	) {
		message += ` Error details: ${originalMessage}`;
	}

	methodLogger.debug(`Created user-friendly message: ${message}`, {
		code,
		context,
	});
	return message;
}

/**
 * Format an error for CLI output in the same Markdown style as successful responses
 * @param error The error to format
 * @param context Additional context for formatting
 * @returns Markdown formatted error message
 */
export function formatCliError(
	error: unknown,
	context?: {
		title?: string;
		accountId?: string;
		roleName?: string;
		region?: string;
		command?: string;
		instanceId?: string;
	},
): string {
	const methodLogger = Logger.forContext(
		'utils/error-formatting.util.ts',
		'formatCliError',
	);

	// Ensure we have an McpError to work with
	const mcpError = ensureMcpError(error);
	methodLogger.debug(`Formatting CLI error: ${mcpError.message}`, {
		error,
		context,
	});

	// Extract useful information for display
	const { code } = detectErrorType(mcpError);
	const errorMessage = createUserFriendlyErrorMessage(
		code,
		{},
		mcpError.message,
	);

	// Build context properties for the formatter
	const contextProps: Record<string, unknown> = {};
	if (context?.accountId) contextProps['Account'] = context.accountId;
	if (context?.roleName) contextProps['Role'] = context.roleName;
	if (context?.region) contextProps['Region'] = context.region;
	if (context?.instanceId) contextProps['Instance ID'] = context.instanceId;

	// Create output sections
	const outputSections = [];

	// Main error section
	outputSections.push({
		heading: 'Error',
		content: errorMessage,
	});

	// Add command if available
	if (context?.command) {
		outputSections.push({
			heading: 'Failed Command',
			content: context.command,
			isCodeBlock: true,
			language: 'bash',
		});
	}

	// Add error details if available
	const errorDetails = [];

	if (mcpError.errorType) {
		errorDetails.push(`**Error Type**: ${mcpError.errorType}`);
		errorDetails.push('');
	}

	if (mcpError.statusCode) {
		errorDetails.push(`**Status Code**: ${mcpError.statusCode}`);
		errorDetails.push('');
	}

	// Add technical details for debugging
	if (errorDetails.length > 0) {
		outputSections.push({
			heading: 'Error Details',
			level: 3,
			content: errorDetails,
		});
	}

	// Add troubleshooting section for common errors
	if (code === ErrorCode.AWS_SSO_TOKEN_EXPIRED) {
		outputSections.push({
			heading: 'Troubleshooting',
			level: 3,
			content: [
				'Your AWS SSO token has expired. Run the following command to re-authenticate:',
				'```bash',
				'mcp-aws-sso login',
				'```',
			],
		});
	} else if (code === ErrorCode.AWS_SDK_PERMISSION_DENIED) {
		outputSections.push({
			heading: 'Troubleshooting',
			level: 3,
			content: [
				'The role you are using does not have the required permissions. Try:',
				'- Using a different role with appropriate permissions',
				'- Verifying the account ID and role name are correct',
				'',
				'You can list available roles with:',
				'```bash',
				'mcp-aws-sso ls-accounts',
				'```',
			],
		});
	} else if (code === ErrorCode.AWS_SDK_INVALID_REQUEST) {
		outputSections.push({
			heading: 'Troubleshooting',
			level: 3,
			content: [
				'The request to AWS is invalid. Check:',
				'- Instance ID exists and is in a running state',
				'- The AWS region is correct',
				'- The EC2 instance has SSM Agent installed and running',
				'- The role has permission to use SSM',
			],
		});
	}

	// Get default region from utility if available
	let defaultRegion;
	try {
		defaultRegion = getDefaultAwsRegion();
	} catch {
		// Fallback to environment variables
		defaultRegion =
			process.env.AWS_REGION ||
			process.env.AWS_DEFAULT_REGION ||
			'ap-southeast-1';
	}

	// Add identity and region info
	const identityInfo = {
		defaultRegion,
		selectedRegion: context?.region,
		identity: {
			accountId: context?.accountId,
			roleName: context?.roleName,
		},
	};

	// Use baseCommandFormatter to maintain consistent structure
	return baseCommandFormatter(
		context?.title || 'AWS SSO: Error',
		contextProps,
		outputSections,
		undefined,
		identityInfo,
	);
}
