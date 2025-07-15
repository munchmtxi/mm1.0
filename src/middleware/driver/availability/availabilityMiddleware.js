'use strict';

const Joi = require('joi');
const { validateInput } = require('@utils/security');
const driverConstants = require('@constants/driver/driverConstants');
const AppError = require('@utils/AppError');

const validateRequest = (schema) => async (req, res, next) => {
  try {
    const { error } = schema.validate({ driverId: req.user.driverId, ...req.body });
    if (error) {
      throw new AppError(`Validation failed: ${error.details[0].message}`, 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateSetAvailability: validateRequest(require('@validators/driver/availability/availabilityValidator').setAvailability),
  validateGetAvailability: validateRequest(require('@validators/driver/availability/availabilityValidator').getAvailability),
  validateToggleAvailability: validateRequest(require('@validators/driver/availability/availabilityValidator').toggleAvailability),
};