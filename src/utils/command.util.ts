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
