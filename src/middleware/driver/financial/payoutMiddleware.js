'use strict';

const Joi = require('joi');
const { validateInput } = require('@utils/security');
const driverConstants = require('@constants/driver/driverConstants');
const AppError = require('@utils/AppError');

const validateRequest = (schema) => async (req, res, next) => {
  try {
    const { error } = schema.validate({
      driverId: req.user.driverId,
      ...req.query,
      ...req.body,
    });
    if (error) {
      throw new AppError(`Validation failed: ${error.details[0].message}`, 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateRequestPayout: validateRequest(require('@validators/driver/financial/payoutValidator').requestPayout),
  validateGetPayoutHistory: validateRequest(require('@validators/driver/financial/payoutValidator').getPayoutHistory),
  validateVerifyPayoutMethod: validateRequest(require('@validators/driver/financial/payoutValidator').verifyPayoutMethod),
  validateScheduleRecurringPayout: validateRequest(require('@validators/driver/financial/payoutValidator').scheduleRecurringPayout),
};