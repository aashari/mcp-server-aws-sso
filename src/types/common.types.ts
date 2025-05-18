/**
 * Common type definitions shared across controllers.
 * These types provide a standard interface for controller interactions.
 * Centralized here to ensure consistency across the codebase.
 */

/**
 * Common pagination information for API responses.
 * This is used for providing consistent pagination details to clients.
 */
export interface ResponsePagination {
	/**
	 * Number of items returned in the current response
	 */
	count?: number;

	/**
	 * Indicates if there are more items available
	 */
	hasMore?: boolean;

	/**
	 * Optional cursor for fetching the next page of results
	 */
	nextCursor?: string;

	/**
	 * Optional total number of items available
	 */
	total?: number;
}

/**
 * Standard controller response format
 */
export interface ControllerResponse {
	/**
	 * Content string (usually Markdown) for display to the user
	 * Contains all information including previously separate metadata
	 */
	content: string;
}
