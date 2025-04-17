'use strict';
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

module.exports = (fn) => {
  return async (...args) => {
    try {
      await Promise.resolve(fn(...args));
    } catch (err) {
      logger.error('catchAsyncSocket caught error', { error: err.message, stack: err.stack });
      const socket = args[0]; // The first argument is typically the socket
      // Emit an error event to the client
      socket.emit('error', {
        status: 'error',
        message: err.message || 'Something went wrong',
        code: err.statusCode || 500,
        errors: err.errors || [],
      });
    }
  };
};