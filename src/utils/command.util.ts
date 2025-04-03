import { Logger } from './logger.util.js';

/**
 * Command Parsing Utility Module
 *
 * Provides functionality for parsing command strings into argument arrays,
 * with proper handling of quoted arguments. This ensures commands with
 * complex arguments are correctly processed.
 */

// Create a file-level logger for this module
const utilLogger = Logger.forContext('utils/command.util.ts');

// Log module initialization
utilLogger.debug('Command utility initialized');

/**
 * Parse a command string into an array of arguments, properly handling quoted strings
 *
 * This function splits a command string into an array of arguments while preserving
 * quoted sections as single arguments. Both single and double quotes are supported.
 *
 * Examples:
 * - parseCommand('aws s3 ls') => ['aws', 's3', 'ls']
 * - parseCommand('aws s3 cp "file with spaces.txt" s3://bucket/') => ['aws', 's3', 'cp', 'file with spaces.txt', 's3://bucket/']
 * - parseCommand("aws ec2 run-instances --image-id 'ami-12345' --count 1") => ['aws', 'ec2', 'run-instances', '--image-id', 'ami-12345', '--count', '1']
 *
 * @param commandString The command string to parse
 * @returns Array of command arguments
 */
export function parseCommand(commandString: string): string[] {
	if (!commandString || commandString.trim() === '') {
		utilLogger.debug('Empty command string provided');
		return [];
	}

	utilLogger.debug(`Parsing command: ${commandString}`);

	const args: string[] = [];
	let currentArg = '';
	let inQuotes = false;
	let quoteChar = '';

	// Process each character in the command
	for (let i = 0; i < commandString.length; i++) {
		const char = commandString[i];
		const nextChar =
			i < commandString.length - 1 ? commandString[i + 1] : '';

		// Handle escaped quotes within quotes
		if (
			char === '\\' &&
			(nextChar === '"' || nextChar === "'") &&
			inQuotes &&
			nextChar === quoteChar
		) {
			currentArg += nextChar;
			i++; // Skip the next character as we've already processed it
			continue;
		}

		// Handle quote characters
		if (char === '"' || char === "'") {
			if (!inQuotes) {
				// Starting a quoted section
				inQuotes = true;
				quoteChar = char;
			} else if (char === quoteChar) {
				// Ending a quoted section with matching quote
				inQuotes = false;
				quoteChar = '';
			} else {
				// This is a different quote character inside quotes, treat as literal
				currentArg += char;
			}
			continue;
		}

		// Handle spaces (only split on spaces outside of quotes)
		if (char === ' ' && !inQuotes) {
			if (currentArg) {
				args.push(currentArg);
				currentArg = '';
			}
			continue;
		}

		// Add the character to the current argument
		currentArg += char;
	}

	// Add the last argument if there is one
	if (currentArg) {
		args.push(currentArg);
	}

	// Warning if we end with unclosed quotes
	if (inQuotes) {
		utilLogger.warn(
			`Unclosed ${quoteChar} quote in command: ${commandString}`,
		);
	}

	utilLogger.debug(
		`Parsed into ${args.length} arguments: ${JSON.stringify(args)}`,
	);
	return args;
}
