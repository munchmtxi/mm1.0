'use strict';

const { validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');

/**
 * Validates request data
 */
exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;
    return next(new AppError(
      formatMessage('customer', 'order', languageCode, 'validation_failed', { errors: errors.array().map(e => e.msg).join(', ') }),
      400,
      customerConstants.ERROR_CODES.VALIDATION_FAILED
    ));
  }
  next();
};

/**
 * Injects Socket.IO instance
 */
exports.injectSocket = (req, res, next) => {
  req.io = req.app.get('io');
  next();
};