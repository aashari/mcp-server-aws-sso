/**
 * Format a timestamp for logging
 * @returns Formatted timestamp [HH:MM:SS]
 */
function getTimestamp(): string {
	const now = new Date();
	return `[${now.toISOString().split('T')[1].split('.')[0]}]`;
}

/**
 * Safely convert object to string with size limits
 * @param obj Object to stringify
 * @param maxLength Maximum length of the resulting string
 * @returns Safely stringified object
 */
function safeStringify(obj: unknown, maxLength = 1000): string {
	try {
		const str = JSON.stringify(obj);
		if (str.length <= maxLength) {
			return str;
		}
		return `${str.substring(0, maxLength)}... (truncated, ${str.length} chars total)`;
	} catch {
		return '[Object cannot be stringified]';
	}
}

/**
 * Format source path consistently using the standardized format:
 * [module/file.ts@function] or [module/file.ts]
 *
 * @param filePath File path (with or without src/ prefix)
 * @param functionName Optional function name
 * @returns Formatted source path according to standard pattern
 */
function formatSourcePath(filePath: string, functionName?: string): string {
	// Always strip 'src/' prefix for consistency
	const normalizedPath = filePath.replace(/^src\//, '');

	return functionName
		? `[${normalizedPath}@${functionName}]`
		: `[${normalizedPath}]`;
}

/**
 * Check if debug logging is enabled for a specific module
 *
 * This function parses the DEBUG environment variable to determine if a specific
 * module should have debug logging enabled. The DEBUG variable can be:
 * - 'true' or '1': Enable all debug logging
 * - Comma-separated list of modules: Enable debug only for those modules
 * - Module patterns with wildcards: e.g., 'controllers/*' enables all controllers
 *
 * Examples:
 * - DEBUG=true
 * - DEBUG=controllers/*,services/aws.sso.auth.service.ts
 * - DEBUG=transport,utils/formatter*
 *
 * @param modulePath The module path to check against DEBUG patterns
 * @returns true if debug is enabled for this module, false otherwise
 */
function isDebugEnabledForModule(modulePath: string): boolean {
	const debugEnv = process.env.DEBUG;

	if (!debugEnv) {
		return false;
	}

	// If debug is set to true or 1, enable all debug logging
	if (debugEnv === 'true' || debugEnv === '1') {
		return true;
	}

	// Parse comma-separated debug patterns
	const debugPatterns = debugEnv.split(',').map((p) => p.trim());

	// Check if the module matches any pattern
	return debugPatterns.some((pattern) => {
		// Convert glob-like patterns to regex
		// * matches anything within a path segment
		// ** matches across path segments
		const regexPattern = pattern
			.replace(/\*/g, '.*') // Convert * to regex .*
			.replace(/\?/g, '.'); // Convert ? to regex .

		const regex = new RegExp(`^${regexPattern}$`);
		return (
			regex.test(modulePath) ||
			// Check for pattern matches without the 'src/' prefix
			regex.test(modulePath.replace(/^src\//, ''))
		);
	});
}

/**
 * Logger class for consistent logging across the application.
 *
 * RECOMMENDED USAGE:
 *
 * 1. Create a file-level logger using the static forContext method:
 *    ```
 *    const logger = Logger.forContext('controllers/myController.ts');
 *    ```
 *
 * 2. For method-specific logging, create a method logger:
 *    ```
 *    const methodLogger = Logger.forContext('controllers/myController.ts', 'myMethod');
 *    ```
 *
 * 3. Avoid using raw string prefixes in log messages. Instead, use contextualized loggers.
 *
 * 4. Set DEBUG environment variable to control which modules show debug logs:
 *    - DEBUG=true (enable all debug logs)
 *    - DEBUG=controllers/*,services/* (enable for specific module groups)
 *    - DEBUG=transport,utils/formatter* (enable specific modules, supports wildcards)
 */
class Logger {
	private context?: string;
	private modulePath: string;

	constructor(context?: string, modulePath: string = '') {
		this.context = context;
		this.modulePath = modulePath;
	}

	/**
	 * Create a contextualized logger for a specific file or component.
	 * This is the preferred method for creating loggers.
	 *
	 * @param filePath The file path (e.g., 'controllers/aws.sso.auth.controller.ts')
	 * @param functionName Optional function name for more specific context
	 * @returns A new Logger instance with the specified context
	 *
	 * @example
	 * // File-level logger
	 * const logger = Logger.forContext('controllers/myController.ts');
	 *
	 * // Method-level logger
	 * const methodLogger = Logger.forContext('controllers/myController.ts', 'myMethod');
	 */
	static forContext(filePath: string, functionName?: string): Logger {
		return new Logger(formatSourcePath(filePath, functionName), filePath);
	}

	/**
	 * Create a method level logger from a context logger
	 * @param method Method name
	 * @returns A new logger with the method context
	 */
	forMethod(method: string): Logger {
		return Logger.forContext(`${this.context}@${method}`);
	}

	private _formatMessage(message: string): string {
		return this.context ? `${this.context} ${message}` : message;
	}

	private _formatArgs(args: unknown[]): unknown[] {
		// If the first argument is an object and not an Error, safely stringify it
		if (
			args.length > 0 &&
			typeof args[0] === 'object' &&
			args[0] !== null &&
			!(args[0] instanceof Error)
		) {
			args[0] = safeStringify(args[0]);
		}
		return args;
	}

	_log(
		level: 'info' | 'warn' | 'error' | 'debug',
		message: string,
		...args: unknown[]
	) {
		// Skip debug messages if not enabled for this module
		if (level === 'debug' && !isDebugEnabledForModule(this.modulePath)) {
			return;
		}

		const timestamp = getTimestamp();
		const prefix = `${timestamp} [${level.toUpperCase()}]`;
		let logMessage = `${prefix} ${this._formatMessage(message)}`;

		const formattedArgs = this._formatArgs(args);
		if (formattedArgs.length > 0) {
			// Handle errors specifically
			if (formattedArgs[0] instanceof Error) {
				const error = formattedArgs[0] as Error;
				logMessage += ` Error: ${error.message}`;
				if (error.stack) {
					logMessage += `\n${error.stack}`;
				}
				// If there are more args, add them after the error
				if (formattedArgs.length > 1) {
					logMessage += ` ${formattedArgs
						.slice(1)
						.map((arg) =>
							typeof arg === 'string' ? arg : safeStringify(arg),
						)
						.join(' ')}`;
				}
			} else {
				logMessage += ` ${formattedArgs
					.map((arg) =>
						typeof arg === 'string' ? arg : safeStringify(arg),
					)
					.join(' ')}`;
			}
		}

		if (process.env.NODE_ENV === 'test') {
			console[level](logMessage);
		} else {
			console.error(logMessage);
		}
	}

	info(message: string, ...args: unknown[]) {
		this._log('info', message, ...args);
	}

	warn(message: string, ...args: unknown[]) {
		this._log('warn', message, ...args);
	}

	error(message: string, ...args: unknown[]) {
		this._log('error', message, ...args);
	}

	debug(message: string, ...args: unknown[]) {
		this._log('debug', message, ...args);
	}
}

export { Logger };
