'use strict';

const Joi = require('joi');
const munchConstants = require('@constants/common/munchConstants');
const { AppError } = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const trackStockLevelsSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
});

const updateInventorySchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  items: Joi.array()
    .items(
      Joi.object({
        menu_item_id: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().min(1).required(),
      }),
    )
    .min(1)
    .required(),
});

const sendRestockingAlertsSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
});

const validateTrackStockLevels = (req, res, next) => {
  const { error } = trackStockLevelsSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

const validateUpdateInventory = (req, res, next) => {
  const { error } = updateInventorySchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

const validateSendRestockingAlerts = (req, res, next) => {
  const { error } = sendRestockingAlertsSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

module.exports = {
  validateTrackStockLevels,
  validateUpdateInventory,
  validateSendRestockingAlerts,
};