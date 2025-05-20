/**
 * Retry utility with exponential backoff
 *
 * This module provides functions to handle retries with exponential backoff for AWS API requests
 * that might return 429 (Too Many Requests) responses.
 */
import { Logger } from './logger.util.js';

const logger = Logger.forContext('utils/retry.util.ts');

/**
 * Interface for retry options
 */
export interface RetryOptions {
	/** Maximum number of retry attempts (default: 5) */
	maxRetries?: number;
	/** Initial delay in milliseconds (default: 1000) */
	initialDelayMs?: number;
	/** Maximum delay in milliseconds (default: 30000) */
	maxDelayMs?: number;
	/** Backoff factor - multiplier for each retry (default: 2.0) */
	backoffFactor?: number;
	/** Optional condition function to determine if retry should happen */
	retryCondition?: (error: unknown) => boolean;
}

/**
 * Default retry options
 */
const defaultRetryOptions: Required<RetryOptions> = {
	maxRetries: 5,
	initialDelayMs: 1000,
	maxDelayMs: 30000,
	backoffFactor: 2.0,
	retryCondition: (error: unknown) => {
		// Default condition checks for 429 (TooManyRequests) errors
		if (error && typeof error === 'object') {
			if ('$metadata' in error && typeof error.$metadata === 'object') {
				const metadata = error.$metadata as { httpStatusCode?: number };
				return metadata.httpStatusCode === 429;
			}

			if ('name' in error && error.name === 'TooManyRequestsException') {
				return true;
			}
		}
		return false;
	},
};

/**
 * Sleep for a specified number of milliseconds
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for the next retry using exponential backoff with jitter
 * @param attempt Current attempt number (0-based)
 * @param options Retry options
 * @returns Delay in milliseconds
 */
function calculateBackoff(
	attempt: number,
	options: Required<RetryOptions>,
): number {
	// Calculate exponential backoff: initialDelay * (backoffFactor ^ attempt)
	const exponentialDelay =
		options.initialDelayMs * Math.pow(options.backoffFactor, attempt);

	// Apply jitter (±20%) to prevent thundering herd issues
	const jitterFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

	// Cap the delay at maxDelayMs
	return Math.min(exponentialDelay * jitterFactor, options.maxDelayMs);
}

/**
 * Execute an async operation with retry logic
 * @param operation Async function to execute
 * @param options Retry options
 * @returns Promise resolving to the operation result
 * @throws The last error encountered after all retries are exhausted
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	options?: RetryOptions,
): Promise<T> {
	const methodLogger = logger.forMethod('withRetry');
	const mergedOptions: Required<RetryOptions> = {
		...defaultRetryOptions,
		...options,
	};

	let lastError: unknown;
	let attempt = 0;

	while (attempt <= mergedOptions.maxRetries) {
		try {
			if (attempt > 0) {
				methodLogger.debug(
					`Retry attempt ${attempt} of ${mergedOptions.maxRetries}`,
				);
			}

			// Execute the operation
			return await operation();
		} catch (error) {
			lastError = error;
			attempt++;

			// Check if this is an authorization_pending error, which is expected during OAuth device flow
			const isAuthorizationPending =
				error &&
				typeof error === 'object' &&
				'error' in error &&
				error.error === 'authorization_pending';

			// Check if we should retry based on error and max retries
			if (
				attempt > mergedOptions.maxRetries ||
				!mergedOptions.retryCondition(error)
			) {
				// Either we're out of retries or this error doesn't qualify for retry
				if (attempt > mergedOptions.maxRetries) {
					methodLogger.warn(
						`Max retry attempts (${mergedOptions.maxRetries}) reached. Giving up.`,
					);
				} else {
					// Only log as debug for expected errors like authorization_pending
					if (isAuthorizationPending) {
						methodLogger.debug(
							'Authorization pending, not a retry condition.',
						);
					} else {
						methodLogger.debug(
							'Error does not match retry conditions. Not retrying.',
						);
					}
				}
				throw error;
			}

			// Calculate delay for next retry
			const delayMs = calculateBackoff(attempt - 1, mergedOptions);

			// Don't log authorization_pending as errors since they're expected
			if (isAuthorizationPending) {
				methodLogger.debug(
					`Authorization pending. Retrying in ${(delayMs / 1000).toFixed(2)}s (attempt ${attempt}/${mergedOptions.maxRetries})`,
				);
			} else {
				methodLogger.info(
					`Request failed with retriable error. Retrying in ${(delayMs / 1000).toFixed(2)}s (attempt ${attempt}/${mergedOptions.maxRetries})`,
					{ error },
				);
			}

			// Wait before next retry
			await sleep(delayMs);
		}
	}

	// This should never be reached because the last failed attempt will throw
	throw lastError;
}
