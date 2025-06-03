'use strict';

const Joi = require('joi');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const mtablesConstants = require('@constants/mtablesConstants');

const redeemPromotionSchema = Joi.object({
  promotionId: Joi.number().integer().positive().required().messages({
    'number.base': 'Promotion ID must be a number',
    'number.integer': 'Promotion ID must be an integer',
    'number.positive': 'Promotion ID must be positive',
    'any.required': 'Promotion ID is required',
  }),
  orderId: Joi.number().integer().positive().required().messages({
    'number.base': 'Order ID must be a number',
    'number.integer': 'Order ID must be an integer',
    'number.positive': 'Order ID must be positive',
    'any.required': 'Order ID is required',
  }),
  couponCode: Joi.string().max(50).optional().allow('').messages({
    'string.base': 'Coupon code must be a string',
    'string.max': 'Coupon code too long',
  }),
});

const validateRedeemPromotion = (req, res, next) => {
  logger.info('Validating redeem promotion request', { requestId: req.id });
  const { error } = redeemPromotionSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = errorMessages.map(detail => detail.message);
    logger.warn('Validation error', { requestId: req.id, errors });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.find(c => c === 'PROMOTION_REDEMPTION_FAILED') || 'PROMOTION_REDEMPTION_FAILED'));
  }
  next();
};

module.exports = {
  validateRedeemPromotion,
};