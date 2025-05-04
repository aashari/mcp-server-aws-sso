import { Logger } from './logger.util.js';

// Create a contextualized logger for this file
const paginationLogger = Logger.forContext('utils/pagination.util.ts');

// Log pagination utility initialization
paginationLogger.debug('Pagination utility initialized');

/**
 * Types of pagination mechanisms used by different APIs
 */
export enum PaginationType {
	/**
	 * Offset-based pagination (startAt, maxResults, total)
	 * Used by many REST APIs including Jira
	 */
	OFFSET = 'offset',

	/**
	 * Cursor-based pagination (cursor in URL)
	 * Used by many modern APIs including Confluence
	 */
	CURSOR = 'cursor',

	/**
	 * Page-based pagination (page parameter in URL)
	 * Used by many APIs including Bitbucket
	 */
	PAGE = 'page',

	/**
	 * NextToken-based pagination (nextToken parameter)
	 * Used by AWS APIs
	 */
	NEXT_TOKEN = 'next_token',
}

/**
 * Structure for offset-based pagination data
 */
export interface OffsetPaginationData {
	startAt?: number;
	maxResults?: number;
	total?: number;
	nextPage?: string;
	values?: unknown[];
}

/**
 * Structure for cursor-based pagination data
 */
export interface CursorPaginationData {
	_links: {
		next?: string;
	};
	results?: unknown[];
}

/**
 * Structure for page-based pagination data
 */
export interface PagePaginationData {
	next?: string;
	values?: unknown[];
}

/**
 * Structure for nextToken-based pagination data (AWS style)
 */
export interface NextTokenPaginationData {
	nextToken?: string;
	accountList?: unknown[];
	roleList?: unknown[];
}

/**
 * Response pagination information
 */
export interface ResponsePagination {
	/** The next cursor value (if applicable) */
	nextCursor?: string;
	/** Whether there are more results available */
	hasMore: boolean;
	/** Count of items in the current batch */
	count?: number;
}
