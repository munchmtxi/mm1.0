'use strict';

const { Customer } = require('@models');
const AppError = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');

/**
 * Verify if user is a customer
 */
const verifyCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.user.id);
    if (!customer) {
      return next(
        new AppError(
          formatMessage('customer', 'party', req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE, 'INVALID_CUSTOMER_ID'),
          400,
          'INVALID_CUSTOMER_ID'
        )
      );
    }
    req.customer = customer;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { verifyCustomer };