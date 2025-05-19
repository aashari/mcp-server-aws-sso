/**
 * Common type definitions shared across controllers.
 * These types provide a standard interface for controller interactions.
 * Centralized here to ensure consistency across the codebase.
 */

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
