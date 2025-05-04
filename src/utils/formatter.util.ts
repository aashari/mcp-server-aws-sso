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
