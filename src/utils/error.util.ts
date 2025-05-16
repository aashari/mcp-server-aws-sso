import { Logger } from './logger.util.js';

/**
 * Error types for classification
 */
export enum ErrorType {
	AUTH_MISSING = 'AUTH_MISSING',
	AUTH_INVALID = 'AUTH_INVALID',
	API_ERROR = 'API_ERROR',
	UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
}

/**
 * Custom error class with type classification
 */
export class McpError extends Error {
	type: ErrorType;
	statusCode?: number;
	originalError?: unknown;

	constructor(
		message: string,
		type: ErrorType,
		statusCode?: number,
		originalError?: unknown,
	) {
		super(message);
		this.name = 'McpError';
		this.type = type;
		this.statusCode = statusCode;
		this.originalError = originalError;
	}
}

/**
 * Create an authentication missing error
 */
export function createAuthMissingError(
	message: string = 'Authentication credentials are missing',
): McpError {
	return new McpError(message, ErrorType.AUTH_MISSING);
}

/**
 * Create an authentication invalid error
 */
export function createAuthInvalidError(
	message: string = 'Authentication credentials are invalid',
): McpError {
	return new McpError(message, ErrorType.AUTH_INVALID, 401);
}

/**
 * Create an authentication timeout error
 */
export function createAuthTimeoutError(
	message: string = 'Authentication timed out',
): McpError {
	return new McpError(message, ErrorType.AUTH_INVALID, 408);
}

/**
 * Create an API error
 */
export function createApiError(
	message: string,
	statusCode?: number,
	originalError?: unknown,
): McpError {
	return new McpError(
		message,
		ErrorType.API_ERROR,
		statusCode,
		originalError,
	);
}

/**
 * Create an unexpected error
 */
export function createUnexpectedError(
	message: string = 'An unexpected error occurred',
	originalError?: unknown,
): McpError {
	return new McpError(
		message,
		ErrorType.UNEXPECTED_ERROR,
		undefined,
		originalError,
	);
}

/**
 * Create a not found error
 */
export function createNotFoundError(
	message: string = 'Resource not found',
	originalError?: unknown,
): McpError {
	return new McpError(message, ErrorType.API_ERROR, 404, originalError);
}

/**
 * Ensure an error is an McpError
 */
export function ensureMcpError(error: unknown): McpError {
	if (error instanceof McpError) {
		return error;
	}

	if (error instanceof Error) {
		return createUnexpectedError(error.message, error);
	}

	return createUnexpectedError(String(error));
}

/**
 * Get the deepest original error from an error chain
 * @param error The error to extract the original cause from
 * @returns The deepest original error or the error itself
 */
export function getDeepOriginalError(error: unknown): unknown {
	if (!error) {
		return error;
	}

	let current = error;
	let depth = 0;
	const maxDepth = 10; // Prevent infinite recursion

	while (
		depth < maxDepth &&
		current instanceof Error &&
		'originalError' in current &&
		current.originalError
	) {
		current = current.originalError;
		depth++;
	}

	return current;
}

/**
 * Format error for MCP tool response
 */
export function formatErrorForMcpTool(error: unknown): {
	content: Array<{ type: 'text'; text: string }>;
	metadata?: {
		errorType: ErrorType;
		statusCode?: number;
		errorDetails?: unknown;
	};
} {
	const methodLogger = Logger.forContext(
		'utils/error.util.ts',
		'formatErrorForMcpTool',
	);
	const mcpError = ensureMcpError(error);
	methodLogger.error(`${mcpError.type} error`, mcpError);

	// Get the deep original error for additional context
	const originalError = getDeepOriginalError(mcpError.originalError);

	// Safely extract details from the original error
	const errorDetails =
		originalError instanceof Error
			? { message: originalError.message }
			: originalError;

	return {
		content: [
			{
				type: 'text' as const,
				text: `Error: ${mcpError.message}`,
			},
		],
		metadata: {
			errorType: mcpError.type,
			statusCode: mcpError.statusCode,
			errorDetails,
		},
	};
}

/**
 * Handle error in CLI context with improved user feedback
 */
export function handleCliError(error: unknown): never {
	const methodLogger = Logger.forContext(
		'utils/error.util.ts',
		'handleCliError',
	);
	const mcpError = ensureMcpError(error);
	methodLogger.error(`${mcpError.type} error`, mcpError);

	// Get the deep original error for more context
	const originalError = getDeepOriginalError(mcpError.originalError);

	// Print the error message
	console.error(`Error: ${mcpError.message}`);

	// Provide helpful context based on error type
	if (mcpError.type === ErrorType.AUTH_MISSING) {
		console.error(
			'\nTip: Run "mcp-aws-sso login" to authenticate with AWS SSO.',
		);
	} else if (mcpError.type === ErrorType.AUTH_INVALID) {
		console.error(
			'\nTip: Your AWS SSO session may have expired. Run "mcp-aws-sso login" to re-authenticate.',
		);
	} else if (mcpError.type === ErrorType.API_ERROR) {
		if (mcpError.statusCode === 429) {
			console.error(
				'\nTip: You may have exceeded AWS API rate limits. Try again later with fewer concurrent requests.',
			);
		}

		// Add AWS SSO specific context if available
		if (originalError && typeof originalError === 'object') {
			const origErr = originalError as Record<string, unknown>;
			if (origErr.error === 'authorization_pending') {
				console.error(
					'\nThe AWS SSO authorization is still pending. Please complete the authorization in your browser.',
				);
			} else if (origErr.error === 'access_denied') {
				console.error(
					'\nThe AWS SSO authorization was denied. Please try again and approve the access request.',
				);
			} else if (origErr.error === 'expired_token') {
				console.error(
					'\nThe AWS SSO token has expired. Please run "mcp-aws-sso login" to get a new token.',
				);
			} else if (origErr.error === 'slow_down') {
				console.error(
					'\nYou are polling too frequently. Please wait longer between authorization checks.',
				);
			}
		}
	}

	// Display DEBUG tip
	if (process.env.DEBUG !== 'true') {
		console.error(
			'\nFor more detailed error information, run with DEBUG=true environment variable.',
		);
	}

	process.exit(1);
}
