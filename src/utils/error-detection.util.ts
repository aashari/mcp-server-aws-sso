import { Logger } from './logger.util.js';
import { ErrorCode, ErrorContext } from './error-types.util.js';

/**
 * Detect specific error types from raw errors
 * @param error The error to analyze
 * @param context Context information for better error detection
 * @returns Object containing the error code and status code
 */
export function detectErrorType(
	error: unknown,
	context: ErrorContext = {},
): { code: ErrorCode; statusCode: number } {
	const methodLogger = Logger.forContext(
		'utils/error-detection.util.ts',
		'detectErrorType',
	);
	methodLogger.debug(`Detecting error type`, { error, context });

	const errorMessage = error instanceof Error ? error.message : String(error);
	const statusCode =
		error instanceof Error && 'statusCode' in error
			? (error as { statusCode: number }).statusCode
			: undefined;

	// AWS SSO OIDC API Error Detection
	// Check for specific OIDC error codes in error or originalError
	if (error instanceof Error) {
		// Check for OIDC errors directly in the error object
		if ('error' in error && typeof error.error === 'string') {
			const oidcErrorCode = error.error;

			if (oidcErrorCode === 'authorization_pending') {
				return {
					code: ErrorCode.AWS_SSO_AUTH_PENDING,
					statusCode: 202,
				};
			}
			if (oidcErrorCode === 'access_denied') {
				return { code: ErrorCode.AWS_SSO_AUTH_DENIED, statusCode: 403 };
			}
			if (
				oidcErrorCode === 'expired_token' ||
				oidcErrorCode === 'invalid_token' ||
				oidcErrorCode === 'invalid_grant'
			) {
				return {
					code: ErrorCode.AWS_SSO_TOKEN_EXPIRED,
					statusCode: 401,
				};
			}
			if (oidcErrorCode === 'slow_down') {
				return { code: ErrorCode.RATE_LIMIT_ERROR, statusCode: 429 };
			}
		}

		// Check error message for auth-related patterns
		if (typeof errorMessage === 'string') {
			if (
				errorMessage.includes('expired') &&
				(errorMessage.includes('token') ||
					errorMessage.includes('credential'))
			) {
				return {
					code: ErrorCode.AWS_SSO_TOKEN_EXPIRED,
					statusCode: 401,
				};
			}

			if (
				errorMessage.includes('authentication') &&
				(errorMessage.includes('pending') ||
					errorMessage.includes('not complete'))
			) {
				return {
					code: ErrorCode.AWS_SSO_AUTH_PENDING,
					statusCode: 202,
				};
			}

			if (
				errorMessage.includes('authentication') &&
				(errorMessage.includes('denied') ||
					errorMessage.includes('rejected'))
			) {
				return {
					code: ErrorCode.AWS_SSO_AUTH_DENIED,
					statusCode: 403,
				};
			}
		}

		// Check for OIDC error codes in originalError
		if ('originalError' in error && error.originalError) {
			const originalError = error.originalError as Record<
				string,
				unknown
			>;

			// OIDC-specific errors in originalError
			if (typeof originalError === 'object') {
				// Check for error code directly in originalError
				if (
					originalError.error &&
					typeof originalError.error === 'string'
				) {
					const oidcErrorCode = originalError.error;

					if (oidcErrorCode === 'authorization_pending') {
						return {
							code: ErrorCode.AWS_SSO_AUTH_PENDING,
							statusCode: 202,
						};
					}
					if (oidcErrorCode === 'access_denied') {
						return {
							code: ErrorCode.AWS_SSO_AUTH_DENIED,
							statusCode: 403,
						};
					}
					if (
						oidcErrorCode === 'expired_token' ||
						oidcErrorCode === 'invalid_token' ||
						oidcErrorCode === 'invalid_grant'
					) {
						return {
							code: ErrorCode.AWS_SSO_TOKEN_EXPIRED,
							statusCode: 401,
						};
					}
					if (oidcErrorCode === 'slow_down') {
						return {
							code: ErrorCode.RATE_LIMIT_ERROR,
							statusCode: 429,
						};
					}
					if (oidcErrorCode === 'invalid_request') {
						return {
							code: ErrorCode.VALIDATION_ERROR,
							statusCode: 400,
						};
					}
				}

				// Check for error_description in originalError for more context
				if (
					originalError.error_description &&
					typeof originalError.error_description === 'string'
				) {
					const errorDesc = originalError.error_description;

					if (
						errorDesc.includes('expired') ||
						errorDesc.includes('invalid token')
					) {
						return {
							code: ErrorCode.AWS_SSO_TOKEN_EXPIRED,
							statusCode: 401,
						};
					}

					if (
						errorDesc.includes('authorization') &&
						(errorDesc.includes('pending') ||
							errorDesc.includes('not complete'))
					) {
						return {
							code: ErrorCode.AWS_SSO_AUTH_PENDING,
							statusCode: 202,
						};
					}
				}

				// AWS SDK Error Detection
				if (
					originalError.name &&
					typeof originalError.name === 'string'
				) {
					const awsSdkErrorName = originalError.name;
					const httpStatusCode =
						originalError.$metadata &&
						typeof originalError.$metadata === 'object'
							? (
									originalError.$metadata as {
										httpStatusCode?: number;
									}
								).httpStatusCode
							: undefined;

					if (
						awsSdkErrorName === 'UnauthorizedException' ||
						awsSdkErrorName.includes('Unauthorized')
					) {
						return {
							code: ErrorCode.AWS_SDK_PERMISSION_DENIED,
							statusCode: httpStatusCode || 403,
						};
					}
					if (
						awsSdkErrorName === 'ResourceNotFoundException' ||
						awsSdkErrorName.includes('NotFound')
					) {
						return {
							code: ErrorCode.AWS_SDK_RESOURCE_NOT_FOUND,
							statusCode: httpStatusCode || 404,
						};
					}
					if (
						awsSdkErrorName === 'TooManyRequestsException' ||
						awsSdkErrorName.includes('Throttling')
					) {
						return {
							code: ErrorCode.AWS_SDK_THROTTLING,
							statusCode: httpStatusCode || 429,
						};
					}
					if (
						awsSdkErrorName === 'InvalidRequestException' ||
						awsSdkErrorName.includes('Invalid')
					) {
						return {
							code: ErrorCode.AWS_SDK_INVALID_REQUEST,
							statusCode: httpStatusCode || 400,
						};
					}
				}
			}
		}
	}

	// Network error detection
	if (
		errorMessage.includes('network error') ||
		errorMessage.includes('fetch failed') ||
		errorMessage.includes('ECONNREFUSED') ||
		errorMessage.includes('ENOTFOUND') ||
		errorMessage.includes('Failed to fetch') ||
		errorMessage.includes('Network request failed')
	) {
		return { code: ErrorCode.NETWORK_ERROR, statusCode: 500 };
	}

	// Rate limiting detection
	if (
		errorMessage.includes('rate limit') ||
		errorMessage.includes('too many requests') ||
		statusCode === 429
	) {
		return { code: ErrorCode.RATE_LIMIT_ERROR, statusCode: 429 };
	}

	// AWS SSO Auth timeout
	if (errorMessage.includes('timed out') && errorMessage.includes('SSO')) {
		return { code: ErrorCode.AWS_SSO_DEVICE_AUTH_TIMEOUT, statusCode: 408 };
	}

	// Not Found detection
	if (
		errorMessage.includes('not found') ||
		errorMessage.includes('does not exist') ||
		statusCode === 404
	) {
		return { code: ErrorCode.NOT_FOUND, statusCode: 404 };
	}

	// Access Denied detection
	if (
		errorMessage.includes('access') ||
		errorMessage.includes('permission') ||
		errorMessage.includes('authorize') ||
		errorMessage.includes('authentication') ||
		errorMessage.includes('token is invalid') ||
		errorMessage.includes('credentials') ||
		statusCode === 401 ||
		statusCode === 403
	) {
		return { code: ErrorCode.ACCESS_DENIED, statusCode: statusCode || 403 };
	}

	// Invalid Cursor detection
	if (
		(errorMessage.includes('cursor') ||
			errorMessage.includes('startAt') ||
			errorMessage.includes('page')) &&
		(errorMessage.includes('invalid') || errorMessage.includes('not valid'))
	) {
		return { code: ErrorCode.INVALID_CURSOR, statusCode: 400 };
	}

	// Validation Error detection
	if (
		errorMessage.includes('validation') ||
		errorMessage.includes('invalid') ||
		errorMessage.includes('required') ||
		statusCode === 400 ||
		statusCode === 422
	) {
		return {
			code: ErrorCode.VALIDATION_ERROR,
			statusCode: statusCode || 400,
		};
	}

	// Default to unexpected error
	return {
		code: ErrorCode.UNEXPECTED_ERROR,
		statusCode: statusCode || 500,
	};
}
