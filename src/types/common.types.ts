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
}

/**
 * Common pagination options for API requests.
 * These options control how many results are returned and which page is retrieved.
 */
export interface PaginationOptions {
	/**
	 * Maximum number of results to return per page.
	 * Valid range: 1-100
	 * If not specified, the default page size (typically 25) will be used.
	 */
	limit?: number;

	/**
	 * Pagination cursor for retrieving a specific page of results.
	 * Obtain this value from the previous response's pagination information.
	 */
	cursor?: string;
}

/**
 * Base interface for entity identifiers.
 * Used to standardize parameter patterns across controllers.
 * Each entity-specific identifier should extend this interface.
 */
export interface EntityIdentifier {
	/**
	 * Allows for dynamic keys with string values.
	 * Entity-specific identifiers will add strongly-typed properties.
	 */
	[key: string]: string;
}

/**
 * Standard controller response format
 */
export interface ControllerResponse {
	/**
	 * Content string (usually Markdown) for display to the user
	 */
	content: string;

	/**
	 * Optional metadata to include in the response
	 * This can be used to pass additional information to tools
	 */
	metadata?: Record<string, unknown>;

	/**
	 * Optional pagination information
	 */
	pagination?: ResponsePagination;
}
