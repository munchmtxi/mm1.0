'use strict';

const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

module.exports = (err, req, res, next) => {
  if (err instanceof AppError) {
    logger.logErrorEvent('Application error', err.toJSON());
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errorCode: err.errorCode,
      details: err.details,
      timestamp: err.timestamp,
    });
  }

  logger.logErrorEvent('Unexpected error', {
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
    timestamp: new Date(),
  });
};