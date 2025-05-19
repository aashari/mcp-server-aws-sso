// import { Logger } from './logger.util.js'; // Keep Logger if used elsewhere, e.g., in formatPagination if added
// import { ResponsePagination } from '../types/common.types.js'; // Remove as formatPagination is not needed here

/**
 * Format a date in a standardized way: YYYY-MM-DD HH:MM:SS UTC
 * @param dateInput - ISO date string, Date object, or timestamp number
 * @returns Formatted date string
 */
export function formatDate(dateInput?: string | Date | number): string {
	if (dateInput === undefined || dateInput === null) {
		return 'Not available';
	}

	try {
		const date =
			dateInput instanceof Date ? dateInput : new Date(dateInput);

		if (isNaN(date.getTime())) {
			return 'Invalid date input';
		}

		return date
			.toISOString()
			.replace('T', ' ')
			.replace(/\.\d+Z$/, ' UTC');
	} catch {
		return 'Invalid date';
	}
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
 * Format a separator line
 * @returns Separator line
 */
export function formatSeparator(): string {
	return '---';
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
 * Format a value based on its type (internal helper)
 * @param value - Value to format
 * @returns Formatted value string
 */
function formatValue(value: unknown): string {
	if (value === undefined || value === null) {
		return 'Not available';
	}
	if (value instanceof Date) {
		return formatDate(value);
	}
	if (typeof value === 'object' && 'url' in value) {
		const urlObj = value as { url: string; title?: string };
		if (typeof urlObj.url === 'string') {
			return formatUrl(urlObj.url, urlObj.title);
		}
	}
	if (typeof value === 'string') {
		if (value.startsWith('http://') || value.startsWith('https://')) {
			return formatUrl(value);
		}
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
 * Base formatter for command execution results
 * Creates a standard Markdown format for command output
 *
 * @param title Title for the output (e.g., "AWS SSO: Command Output")
 * @param contextProps Properties to display in the context section
 * @param outputSections Array of sections to add (each with heading and content)
 * @param footerInfo Additional footer information before the timestamp
 * @returns Formatted Markdown string
 */
export function baseCommandFormatter(
	title: string,
	contextProps: Record<string, unknown>,
	outputSections: Array<{
		heading: string;
		level?: number;
		content: string | string[];
		isCodeBlock?: boolean;
		language?: string;
	}>,
	footerInfo?: string | string[],
): string {
	const lines: string[] = [];

	// Title
	lines.push(formatHeading(title, 1));
	lines.push('');

	// Context section
	if (Object.keys(contextProps).length > 0) {
		lines.push(formatHeading('Execution Context', 2));
		lines.push(formatBulletList(contextProps));
		lines.push('');
	}

	// Output sections
	for (const section of outputSections) {
		lines.push(formatHeading(section.heading, section.level || 2));

		if (typeof section.content === 'string') {
			if (section.isCodeBlock) {
				lines.push(formatCodeBlock(section.content, section.language));
			} else {
				lines.push(section.content);
			}
		} else if (Array.isArray(section.content)) {
			lines.push(...section.content);
		}

		lines.push('');
	}

	// Footer
	lines.push(formatSeparator());

	if (footerInfo) {
		if (typeof footerInfo === 'string') {
			lines.push(footerInfo);
		} else if (Array.isArray(footerInfo)) {
			lines.push(...footerInfo);
		}
	}

	lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);

	return lines.join('\n');
}
