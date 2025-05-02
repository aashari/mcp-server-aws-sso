/**
 * Standardized formatting utilities for consistent output across all CLI and Tool interfaces.
 * These functions should be used by all formatters to ensure consistent formatting.
 */

import { Logger } from './logger.util.js'; // Ensure logger is imported

const formatterLogger = Logger.forContext('utils/formatter.util.ts'); // Define logger instance

/**
 * Format a date in a standardized way: YYYY-MM-DD HH:MM:SS UTC
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string
 */
export function formatDate(dateString?: string | Date): string {
	if (!dateString) {
		return 'Not available';
	}

	try {
		const date =
			typeof dateString === 'string' ? new Date(dateString) : dateString;

		// Format: YYYY-MM-DD HH:MM:SS UTC
		return date
			.toISOString()
			.replace('T', ' ')
			.replace(/\.\d+Z$/, ' UTC');
	} catch {
		return 'Invalid date';
	}
}

/**
 * Format a URL as a markdown link
 * @param url - URL to format
 * @param title - Link title
 * @returns Formatted markdown link
 */
export function formatUrl(url?: string, title?: string): string {
	if (!url) {
		return 'Not available';
	}

	const linkTitle = title || url;
	return `[${linkTitle}](${url})`;
}

/**
 * Format a heading with consistent style
 * @param text - Heading text
 * @param level - Heading level (1-6)
 * @returns Formatted heading
 */
export function formatHeading(text: string, level: number = 1): string {
	const validLevel = Math.min(Math.max(level, 1), 6);
	const prefix = '#'.repeat(validLevel);
	return `${prefix} ${text}`;
}

/**
 * Format a list of key-value pairs as a bullet list
 * @param items - Object with key-value pairs
 * @param keyFormatter - Optional function to format keys
 * @returns Formatted bullet list
 */
export function formatBulletList(
	items: Record<string, unknown>,
	keyFormatter?: (key: string) => string,
): string {
	const lines: string[] = [];

	for (const [key, value] of Object.entries(items)) {
		if (value === undefined || value === null) {
			continue;
		}

		const formattedKey = keyFormatter ? keyFormatter(key) : key;
		const formattedValue = formatValue(value);
		lines.push(`- **${formattedKey}**: ${formattedValue}`);
	}

	return lines.join('\n');
}

/**
 * Format a value based on its type
 * @param value - Value to format
 * @returns Formatted value
 */
function formatValue(value: unknown): string {
	if (value === undefined || value === null) {
		return 'Not available';
	}

	if (value instanceof Date) {
		return formatDate(value);
	}

	// Handle URL objects with url and title properties
	if (typeof value === 'object' && value !== null && 'url' in value) {
		const urlObj = value as { url: string; title?: string };
		if (typeof urlObj.url === 'string') {
			return formatUrl(urlObj.url, urlObj.title);
		}
	}

	if (typeof value === 'string') {
		// Check if it's a URL
		if (value.startsWith('http://') || value.startsWith('https://')) {
			return formatUrl(value);
		}

		// Check if it might be a date
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
			return formatDate(value);
		}

		return value;
	}

	if (typeof value === 'boolean') {
		return value ? 'Yes' : 'No';
	}

	return String(value);
}

/**
 * Format a separator line
 * @returns Separator line
 */
export function formatSeparator(): string {
	return '---';
}

/**
 * Format a code block with the given content
 * @param content Code content
 * @param language Optional language for syntax highlighting
 * @returns Formatted code block
 */
export function formatCodeBlock(
	content: string,
	language: string = '',
): string {
	return '```' + language + '\n' + content.trim() + '\n```';
}

/**
 * Format pagination information consistently
 * @param count Number of items shown
 * @param hasMore Whether there are more items available
 * @param nextCursor The cursor/token for the next page, if applicable
 * @param total Optional total count of items
 * @returns Formatted pagination string
 */
export function formatPagination(
	count: number,
	hasMore: boolean,
	nextCursor?: string,
	total?: number,
): string {
	const methodLogger = formatterLogger.forMethod('formatPagination');
	const parts: string[] = [];

	// Showing count and potentially total
	if (total !== undefined && total > 0) {
		parts.push(`*Showing ${count} of ${total} total items.*`);
	} else if (count > 0) {
		parts.push(`*Showing ${count} item${count !== 1 ? 's' : ''}.*`);
	} else if (total === 0) {
		parts.push('*Showing 0 of 0 total items.*'); // Handle zero total case
	} else {
		// If count is 0 and total is undefined, perhaps don't show count message
		// parts.push('*Showing 0 items.*');
	}

	// More results availability
	if (hasMore) {
		parts.push('More results are available.');
	}

	// Prompt for next cursor
	if (hasMore && nextCursor) {
		parts.push(`\nTo see more results, use --cursor "${nextCursor}"`);
	}

	const result = parts.join(' ').trim(); // Join with space, trim ends
	methodLogger.debug(`Formatted pagination: ${result}`);
	return result;
}
