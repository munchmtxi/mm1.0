'use strict';

const Joi = require('joi');
const munchConstants = require('@constants/common/munchConstants');
const { AppError } = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const assignDeliverySchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  driverId: Joi.number().integer().positive().required(),
});

const trackDeliveryStatusSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
});

const communicateWithDriverSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  message: Joi.string().trim().min(1).required(),
});

const validateAssignDelivery = (req, res, next) => {
  const { error } = assignDeliverySchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

const validateTrackDeliveryStatus = (req, res, next) => {
  const { error } = trackDeliveryStatusSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

const validateCommunicateWithDriver = (req, res, next) => {
  const { error } = communicateWithDriverSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

module.exports = {
  validateAssignDelivery,
  validateTrackDeliveryStatus,
  validateCommunicateWithDriver,
};