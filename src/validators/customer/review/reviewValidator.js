'use strict';

/**
 * Review Validator
 * Validates request bodies for review-related endpoints.
 */

const Joi = require('joi');
const AppError = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');
const customerConstants = require('@constants/customer/customerConstants');

/**
 * Validates review submission request body.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateSubmitReview = (req, res, next) => {
  const languageCode = req.user?.languageCode || customerConstants.DEFAULT_LANGUAGE;

  const schema = Joi.object({
    serviceType: Joi.string().valid('mtables', 'munch', 'mtxi').required(),
    serviceId: Joi.string().uuid().required(),
    targetType: Joi.string().valid('merchant', 'staff', 'driver').required(),
    targetId: Joi.string().uuid().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(500).allow('').optional(),
    title: Joi.string().max(100).allow('').optional(),
    photos: Joi.array().items(Joi.string().uri()).optional(),
    anonymous: Joi.boolean().default(false),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return next(new AppError(
      formatMessage('customer', 'reviews', languageCode, `error.${error.details[0].context.key.toUpperCase()}` || 'error.generic'),
      400,
      error.details[0].context.key.toUpperCase()
    ));
  }
  next();
};

/**
 * Validates review update request body.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateUpdateReview = (req, res, next) => {
  const languageCode = req.user?.languageCode || customerConstants.DEFAULT_LANGUAGE;

  const schema = Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    comment: Joi.string().max(500).allow('').optional(),
    title: Joi.string().max(100).allow('').optional(),
    photos: Joi.array().items(Joi.string().uri()).optional(),
    anonymous: Joi.boolean().optional(),
  }).min(1);

  const { error } = schema.validate(req.body);
  if (error) {
    return next(new AppError(
      formatMessage('customer', 'reviews', languageCode, `error.${error.details[0].context.key.toUpperCase()}` || 'error.generic'),
      400,
      error.details[0].context.key.toUpperCase()
    ));
  }
  next();
};

/**
 * Validates community interaction request body.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateCommunityInteraction = (req, res, next) => {
  const languageCode = req.user?.languageCode || customerConstants.DEFAULT_LANGUAGE;

  const schema = Joi.object({
    action: Joi.string().valid('UPVOTE', 'COMMENT').required(),
    comment: Joi.string().max(500).when('action', {
      is: 'COMMENT',
      then: Joi.required(),
      otherwise: Joi.allow(null).optional(),
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return next(new AppError(
      formatMessage('customer', 'reviews', languageCode, `error.${error.details[0].context.key.toUpperCase()}` || 'error.INVALID_INTERACTION_TYPE'),
      400,
      error.details[0].context.key.toUpperCase() || 'INVALID_INTERACTION_TYPE'
    ));
  }
  next();
};

module.exports = {
  validateSubmitReview,
  validateUpdateReview,
  validateCommunityInteraction,
};