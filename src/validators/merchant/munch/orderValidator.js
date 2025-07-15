'use strict';

const Joi = require('joi');
const munchConstants = require('@constants/common/munchConstants');
const { AppError } = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const processOrderSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  items: Joi.array()
    .items(
      Joi.object({
        menu_item_id: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().min(1).required(),
        customization: Joi.string().allow(null).optional(),
      }),
    )
    .min(1)
    .required(),
});

const applyDietaryPreferencesSchema = Joi.object({
  customerId: Joi.number().integer().positive().required(),
  items: Joi.array()
    .items(
      Joi.object({
        menu_item_id: Joi.number().integer().positive().required(),
      }),
    )
    .min(1)
    .required(),
});

const updateOrderStatusSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  status: Joi.string()
    .valid(...munchConstants.ORDER_CONSTANTS.ORDER_STATUSES)
    .required(),
});

const payOrderWithWalletSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  walletId: Joi.number().integer().positive().required(),
});

const validateProcessOrder = (req, res, next) => {
  const { error } = processOrderSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

const validateApplyDietaryPreferences = (req, res, next) => {
  const { error } = applyDietaryPreferencesSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

const validateUpdateOrderStatus = (req, res, next) => {
  const { error } = updateOrderStatusSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

const validatePayOrderWithWallet = (req, res, next) => {
  const { error } = payOrderWithWalletSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

module.exports = {
  validateProcessOrder,
  validateApplyDietaryPreferences,
  validateUpdateOrderStatus,
  validatePayOrderWithWallet,
};