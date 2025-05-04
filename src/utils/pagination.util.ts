import { Logger } from './logger.util.js';

// Create a contextualized logger for this file
const paginationLogger = Logger.forContext('utils/pagination.util.ts');

// Log pagination utility initialization
paginationLogger.debug('Pagination utility initialized');
