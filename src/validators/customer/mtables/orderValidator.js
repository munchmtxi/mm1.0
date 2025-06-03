'use strict';

const Joi = require('joi');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const mtablesConstants = require('@constants/mtablesConstants');

const itemSchema = Joi.object({
  menu_item_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Menu item ID must be a number',
    'number.integer': 'Menu item ID must be an integer',
    'number.positive': 'Menu item ID must be positive',
    'any.required': 'Menu item ID is required',
  }),
  quantity: Joi.number().integer().positive().required().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'number.positive': 'Quantity must be positive',
    'any.required': 'Quantity is required',
  }),
  customizations: Joi.array().items(Joi.object({
    modifier_id: Joi.number().integer().positive().required().messages({
      'number.base': 'Modifier ID must be a number',
      'number.integer': 'Modifier ID must be an integer',
      'number.positive': 'Modifier ID must be positive',
      'any.required': 'Modifier ID is required',
    }),
  })).optional(),
});

const addToCartSchema = Joi.object({
  branchId: Joi.number().integer().positive().required().messages({
    'number.base': 'Branch ID must be a number',
    'number.integer': 'Branch ID must be an integer',
    'number.positive': 'Branch ID must be positive',
    'any.required': 'Branch ID is required',
  }),
  items: Joi.array().items(itemSchema).min(1).required().messages({
    'array.min': 'At least one item is required',
    'any.required': 'Items are required',
  }),
});

const createOrderSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required().messages({
    'number.base': 'Booking ID must be a number',
    'number.integer': 'Booking ID must be an integer',
    'number.positive': 'Booking ID must be positive',
    'any.required': 'Booking ID is required',
  }),
  items: Joi.array().items(itemSchema).optional(),
  isPreOrder: Joi.boolean().optional(),
  cartId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Cart ID must be a number',
    'number.integer': 'Cart ID must be an integer',
    'number.positive': 'Cart ID must be positive',
  }),
  dietaryPreferences: Joi.array().items(Joi.string().valid(...mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS)).optional(),
  paymentMethodId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Payment method ID must be a number',
    'number.integer': 'Payment method ID must be an integer',
    'number.positive': 'Payment method ID must be positive',
  }),
  recommendationData: Joi.object({
    productIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    type: Joi.string().optional(),
    sessionId: Joi.string().optional(),
  }).optional(),
}).xor('items', 'cartId').messages({
  'object.xor': 'Either items or cartId must be provided',
});

const updateOrderSchema = Joi.object({
  orderId: Joi.number().integer().positive().required().messages({
    'number.base': 'Order ID must be a number',
    'number.integer': 'Order ID must be an integer',
    'number.positive': 'Order ID must be positive',
    'any.required': 'Order ID is required',
  }),
  items: Joi.array().items(itemSchema).optional(),
  dietaryPreferences: Joi.array().items(Joi.string().valid(...mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS)).optional(),
});

const orderIdSchema = Joi.object({
  orderId: Joi.number().integer().positive().required().messages({
    'number.base': 'Order ID must be a number',
    'number.integer': 'Order ID must be an integer',
    'number.positive': 'Order ID must be positive',
    'any.required': 'Order ID is required',
  }),
});

const submitFeedbackSchema = Joi.object({
  orderId: Joi.number().integer().positive().required().messages({
    'number.base': 'Order ID must be a number',
    'number.integer': 'Order ID must be an integer',
    'number.positive': 'Order ID must be positive',
    'any.required': 'Order ID is required',
  }),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.integer': 'Rating must be an integer',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating must be at most 5',
    'any.required': 'Rating is required',
  }),
  comment: Joi.string().max(500).optional().messages({
    'string.base': 'Comment must be a string',
    'string.max': 'Comment too long',
  }),
  staffId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Staff ID must be a number',
    'number.integer': 'Staff ID must be an integer',
    'number.positive': 'Staff ID must be positive',
  }),
});

const validateAddToCart = (req, res, next) => {
  logger.info('Validating add to cart request', { requestId: req.id });
  const { error } = addToCartSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.find(c => c === 'CART_UPDATE_FAILED') || 'CART_UPDATE_FAILED'));
  }
  next();
};

const validateCreateOrder = (req, res, next) => {
  logger.info('Validating create order request', { requestId: req.id });
  const { error } = createOrderSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.find(c => c === 'ORDER_CREATION_FAILED') || 'ORDER_CREATION_FAILED'));
  }
  next();
};

const validateUpdateOrder = (req, res, next) => {
  logger.info('Validating update order request', { requestId: req.id });
  const { error } = updateOrderSchema.validate({ orderId: req.params.orderId, ...req.body }, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.find(c => c === 'ORDER_UPDATE_FAILED') || 'ORDER_UPDATE_FAILED'));
  }
  next();
};

const validateOrderId = (req, res, next) => {
  logger.info('Validating order ID', { requestId: req.id });
  const { error } = orderIdSchema.validate({ orderId: req.params.orderId }, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.find(c => c === 'ORDER_NOT_FOUND') || 'ORDER_NOT_FOUND'));
  }
  next();
};

const validateSubmitFeedback = (req, res, next) => {
  logger.info('Validating submit feedback request', { requestId: req.id });
  const { error } = submitFeedbackSchema.validate({ orderId: req.params.orderId, ...req.body }, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.find(c => c === 'FEEDBACK_SUBMISSION_FAILED') || 'FEEDBACK_SUBMISSION_FAILED'));
  }
  next();
};

module.exports = {
  validateAddToCart,
  validateCreateOrder,
  validateUpdateOrder,
  validateOrderId,
  validateSubmitFeedback,
};