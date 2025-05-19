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
 * Extend the Error interface to include the errorType property
 */
declare global {
	interface Error {
		errorType?: string;
		$metadata?: Record<string, unknown>;
		error?: string;
		error_description?: string;
		originalResponse?: Record<string, unknown> | string;
	}
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
		typeOrOptions: ErrorType | { cause?: Error | unknown },
		statusCode?: number,
		originalError?: unknown,
	) {
		if (typeof typeOrOptions === 'object') {
			// New constructor style with options
			super(message);
			this.name = 'McpError';
			this.type = ErrorType.UNEXPECTED_ERROR; // Default type
			this.originalError = typeOrOptions.cause;
		} else {
			// Original constructor style
			super(message);
			this.name = 'McpError';
			this.type = typeOrOptions;
			this.statusCode = statusCode;
			this.originalError = originalError;
		}

		// Ensure prototype chain is properly maintained
		Object.setPrototypeOf(this, McpError.prototype);
	}
}

/**
 * Create a standardized McpError with additional properties
 * @param message Error message
 * @param options Additional error options including cause and error type
 * @returns McpError instance
 */
export function createMcpError(
	message: string,
	options?: {
		cause?: Error | unknown;
		errorType?: string;
		metadata?: Record<string, unknown>;
	},
): McpError {
	const error = new McpError(message, { cause: options?.cause });
	if (options?.errorType) {
		error.errorType = options.errorType;
	}
	if (options?.metadata) {
		error.$metadata = options.metadata;
	}
	return error;
}

/**
 * Create an authentication missing error
 * @param message Error message
 * @param cause Optional cause of the error
 * @returns McpError with authentication missing details
 */
export function createAuthMissingError(
	message: string,
	cause?: Error | unknown,
): McpError {
	const error = new McpError(message, { cause });
	error.errorType = 'AUTHENTICATION_MISSING';
	return error;
}

/**
 * Create an authentication timeout error
 * @param message Error message
 * @param cause Optional cause of the error
 * @returns McpError with authentication timeout details
 */
export function createAuthTimeoutError(
	message: string,
	cause?: Error | unknown,
): McpError {
	const error = new McpError(message, { cause });
	error.errorType = 'AUTHENTICATION_TIMEOUT';
	return error;
}

/**
 * Create an API error
 * @param message Error message
 * @param statusCode Optional HTTP status code
 * @param cause Optional cause of the error
 * @returns McpError with API error details
 */
export function createApiError(
	message: string,
	statusCode?: number,
	cause?: Error | unknown,
): McpError {
	const error = new McpError(message, { cause });
	error.errorType = 'API_ERROR';
	if (statusCode) {
		error.$metadata = {
			httpStatusCode: statusCode,
		};
	}
	return error;
}

/**
 * Create an unexpected error
 * @param message Error message
 * @param cause Optional cause of the error
 * @returns McpError with unexpected error details
 */
export function createUnexpectedError(
	message: string,
	cause?: Error | unknown,
): McpError {
	const error = new McpError(message, { cause });
	error.errorType = 'UNEXPECTED_ERROR';
	return error;
}

/**
 * Ensure an error is an McpError
 * @param error The error to convert to an McpError
 * @returns An McpError instance
 */
export function ensureMcpError(error: unknown): McpError {
	if (error instanceof McpError) {
		return error;
	}

	if (error instanceof Error) {
		return createMcpError(error.message, {
			cause: error,
			errorType: error.errorType || 'UNEXPECTED_ERROR',
		});
	}

	return createMcpError(String(error), { errorType: 'UNEXPECTED_ERROR' });
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
