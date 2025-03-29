import { Logger } from './logger.util.js';

const logger = Logger.forContext('utils/command.util.ts');

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
		return [];
	}

	logger.debug(`Parsing command string: ${commandString}`);

	const args: string[] = [];
	let currentArg = '';
	let inQuotes = false;
	let quoteChar = '';

	// Process each character in the string
	for (let i = 0; i < commandString.length; i++) {
		const char = commandString[i];

		// Handle quotes (both single and double)
		if (char === '"' || char === "'") {
			if (!inQuotes) {
				// Start of quoted section
				inQuotes = true;
				quoteChar = char;
			} else if (char === quoteChar) {
				// End of quoted section
				inQuotes = false;
				quoteChar = '';
			} else {
				// Different quote character inside quotes, treat as normal character
				currentArg += char;
			}
		}
		// Handle spaces (outside quotes)
		else if (char === ' ' && !inQuotes) {
			// End of argument
			if (currentArg) {
				args.push(currentArg);
				currentArg = '';
			}
		}
		// Any other character
		else {
			currentArg += char;
		}
	}

	// Add the last argument if there is one
	if (currentArg) {
		args.push(currentArg);
	}

	// Warn if we ended with unclosed quotes
	if (inQuotes) {
		logger.debug(`Warning: Unclosed ${quoteChar} quotes in command string`);
	}

	logger.debug(`Parsed command: ${JSON.stringify(args)}`);
	return args;
}
