'use strict';

const Joi = require('joi');
const mtablesConstants = require('@constants/common/mtablesConstants');
const AppError = require('@utils/AppError');

const cartItemSchema = Joi.object({
  menuItemId: Joi.string().required().messages({
    'string.empty': mtablesConstants.ERROR_TYPES[0],
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': mtablesConstants.ERROR_TYPES[0],
    'number.min': mtablesConstants.ERROR_TYPES[0],
  }),
  customizations: Joi.array().items(
    Joi.object({
      modifierId: Joi.string().required(),
      value: Joi.string().required(),
    })
  ).optional(),
});

module.exports = {
  validateAddToCart(req, res, next) {
    const schema = Joi.object({
      customerId: Joi.string().required().messages({
        'string.empty': mtablesConstants.ERROR_TYPES[10],
      }),
      branchId: Joi.string().required().messages({
        'string.empty': mtablesConstants.ERROR_TYPES[21],
      }),
      items: Joi.array().items(cartItemSchema).min(1).required().messages({
        'array.min': mtablesConstants.ERROR_TYPES[0],
      }),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return next(new AppError(error.message, 400, mtablesConstants.ERROR_TYPES[0]));
    }
    next();
  },

  validateUpdateCart(req, res, next) {
    const schema = Joi.object({
      items: Joi.array().items(cartItemSchema).min(1).required().messages({
        'array.min': mtablesConstants.ERROR_TYPES[0],
      }),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return next(new AppError(error.message, 400, mtablesConstants.ERROR_TYPES[0]));
    }
    next();
  },
};