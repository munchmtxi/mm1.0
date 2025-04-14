'use strict';
const logger = require('@utils/logger');

module.exports = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      logger.error('catchAsync caught error', { error: err.message, stack: err.stack });
      next(err); // Pass the error to the next middleware (errorHandler)
    });
  };
};