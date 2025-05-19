/**
 * Standard error codes for consistent handling
 */
export enum ErrorCode {
	NOT_FOUND = 'NOT_FOUND',
	INVALID_CURSOR = 'INVALID_CURSOR',
	ACCESS_DENIED = 'ACCESS_DENIED',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
	NETWORK_ERROR = 'NETWORK_ERROR',
	RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
	// AWS SSO specific error codes
	AWS_SSO_DEVICE_AUTH_TIMEOUT = 'AWS_SSO_DEVICE_AUTH_TIMEOUT',
	AWS_SSO_TOKEN_EXPIRED = 'AWS_SSO_TOKEN_EXPIRED',
	AWS_SSO_AUTH_PENDING = 'AWS_SSO_AUTH_PENDING',
	AWS_SSO_AUTH_DENIED = 'AWS_SSO_AUTH_DENIED',
	AWS_SDK_PERMISSION_DENIED = 'AWS_SDK_PERMISSION_DENIED',
	AWS_SDK_RESOURCE_NOT_FOUND = 'AWS_SDK_RESOURCE_NOT_FOUND',
	AWS_SDK_THROTTLING = 'AWS_SDK_THROTTLING',
	AWS_SDK_INVALID_REQUEST = 'AWS_SDK_INVALID_REQUEST',
}

/**
 * Context information for error handling
 */
export interface ErrorContext {
	/**
	 * Source of the error (e.g., file path and function)
	 */
	source?: string;

	/**
	 * Type of entity being processed (e.g., 'IP Address', 'User')
	 */
	entityType?: string;

	/**
	 * Identifier of the entity being processed
	 */
	entityId?: string | Record<string, string>;

	/**
	 * Operation being performed (e.g., 'retrieving', 'searching')
	 */
	operation?: string;

	/**
	 * Additional information for debugging
	 */
	additionalInfo?: Record<string, unknown>;
}

/**
 * Helper function to create a consistent error context object
 * @param entityType Type of entity being processed
 * @param operation Operation being performed
 * @param source Source of the error (typically file path and function)
 * @param entityId Optional identifier of the entity
 * @param additionalInfo Optional additional information for debugging
 * @returns A formatted ErrorContext object
 */
export function buildErrorContext(
	entityType: string,
	operation: string,
	source: string,
	entityId?: string | Record<string, string>,
	additionalInfo?: Record<string, unknown>,
): ErrorContext {
	return {
		entityType,
		operation,
		source,
		...(entityId && { entityId }),
		...(additionalInfo && { additionalInfo }),
	};
}
