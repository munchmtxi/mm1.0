'use strict';

/**
 * Error Handling Utility
 * Standardizes error handling for service operations.
 * Uses provided error codes from constants for specific error identification.
 */

/**
 * Handles errors thrown by service functions, logging and formatting them.
 * @param {string} functionName - Name of the function where the error occurred.
 * @param {Error} error - Original error object.
 * @param {string} errorCode - Specific error code from constants.
 * @returns {Error} Formatted error with standardized message and details.
 */
function handleServiceError(functionName, error, errorCode) {
  const formattedError = new Error(`${errorCode}: ${functionName} failed: ${error.message}`);
  formattedError.code = errorCode;
  formattedError.originalError = error;
  formattedError.stack = error.stack;

  // Log error using Winston
  const winston = require('winston');
  const logger = winston.createLogger({
    transports: [
      new winston.transports.DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d',
      }),
    ],
  });
  logger.error(`Error in ${functionName} [${errorCode}]:`, error);

  return formattedError;
}

module.exports = {
  handleServiceError,
};