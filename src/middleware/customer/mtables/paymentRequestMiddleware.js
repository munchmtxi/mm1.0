// src/middleware/customer/mtables/paymentRequestMiddleware.js
'use strict';

const { paymentRequestSchema, preOrderPaymentRequestSchema } = require('@validators/customer/mtables/paymentRequestValidator');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');

const validatePaymentRequest = async (req, res, next) => {
  try {
    await paymentRequestSchema.validateAsync(req.body);
    next();
  } catch (error) {
    next({
      status: 400,
      message: formatMessage('customer', 'errors', req.user?.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'INVALID_INPUT', {}),
      errorCode: customerConstants.ERROR_CODES[0], // INVALID_INPUT
    });
  }
};

const validatePreOrderPaymentRequest = async (req, res, next) => {
  try {
    await preOrderPaymentRequestSchema.validateAsync(req.body);
    next();
  } catch (error) {
    next({
      status: 400,
      message: formatMessage('customer', 'errors', req.user?.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'INVALID_INPUT', {}),
      errorCode: customerConstants.ERROR_CODES[0], // INVALID_INPUT
    });
  }
};

module.exports = {
  validatePaymentRequest,
  validatePreOrderPaymentRequest,
};