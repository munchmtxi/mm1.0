'use strict';

const Joi = require('joi');
const { validateInput } = require('@utils/security');
const driverConstants = require('@constants/driver/driverConstants');
const AppError = require('@utils/AppError');

const validateRequest = (schema) => async (req, res, next) => {
  try {
    const { error } = schema.validate({
      driverId: req.user.driverId,
      shiftId: req.params.shiftId,
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
  validateCreateShift: validateRequest(require('@validators/driver/scheduling/schedulingValidator').createShift),
  validateGetShiftDetails: validateRequest(require('@validators/driver/scheduling/schedulingValidator').getShiftDetails),
  validateUpdateShift: validateRequest(require('@validators/driver/scheduling/schedulingValidator').updateShift),
  validateNotifyHighDemand: validateRequest(require('@validators/driver/scheduling/schedulingValidator').notifyHighDemand),
};