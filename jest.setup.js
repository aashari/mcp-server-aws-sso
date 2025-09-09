/**
 * Jest setup file to handle console output in tests
 * This file configures Jest to suppress expected warnings while preserving errors
 */

// Store original console methods
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;
const originalInfo = console.info;
const originalDebug = console.debug;

// Mock console.warn to suppress expected test warnings
console.warn = jest.fn((message, ...args) => {
  const messageStr = typeof message === 'string' ? message : String(message);
  
  // Suppress expected test skip warnings
  if (
    messageStr.includes('SKIPPING TEST:') ||
    messageStr.includes('Skipping test -') ||
    messageStr.includes('Skipping auth check') ||
    messageStr.includes('Not authenticated, checking')
  ) {
    return;
  }
  
  // For all other warnings, call the original warn function
  originalWarn.call(console, message, ...args);
});

// Keep console.error as is - we want to see actual errors
console.error = jest.fn((message, ...args) => {
  originalError.call(console, message, ...args);
});

// Suppress info and debug logging during tests to reduce noise
console.info = jest.fn();
console.debug = jest.fn();

// Mock console.log to suppress specific messages but allow test output
console.log = jest.fn((message, ...args) => {
  const messageStr = typeof message === 'string' ? message : String(message);
  
  // Suppress dotenv informational messages
  if (messageStr.includes('[dotenv@') && messageStr.includes('injecting env')) {
    return;
  }
  
  // Allow test-specific log messages through
  if (
    messageStr.includes('Running CLI command:') ||
    messageStr.includes('STDOUT chunk:') ||
    messageStr.includes('Command completed') ||
    messageStr.includes('====') ||
    messageStr.includes('Total STDOUT') ||
    messageStr.includes('STDOUT excerpt')
  ) {
    originalLog.call(console, message, ...args);
  }
});

// Cleanup function to restore original console methods if needed
global.restoreConsole = () => {
  console.warn = originalWarn;
  console.error = originalError;
  console.log = originalLog;
  console.info = originalInfo;
  console.debug = originalDebug;
};