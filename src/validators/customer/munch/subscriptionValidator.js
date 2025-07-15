'use strict';

const Joi = require('joi');
const customerConstants = require('@constants/customer/customerConstants');
const munchConstants = require('@constants/common/munchConstants');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');

/**
 * Validates subscription enrollment request
 */
const enrollSubscriptionSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  planId: Joi.number().integer().positive().required(),
  serviceType: Joi.string().valid(...customerConstants.SUBSCRIPTION_CONSTANTS.SERVICE_TYPES).default('munch'),
  menuItemId: Joi.number().integer().positive().optional(),
}).messages({
  'any.required': formatMessage('customer', 'subscription', localizationConstants.DEFAULT_LANGUAGE, 'error.validation_failed', { errors: '{#label} is required' }),
  'string.valid': formatMessage('customer', 'subscription', localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_subscription_plan'),
});

/**
 * Validates subscription management request
 */
const manageSubscriptionSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  action: Joi.string().valid('UPGRADE', 'DOWNGRADE', 'PAUSE', 'CANCEL').required(),
  newPlanId: Joi.number().integer().positive().when('action', { is: Joi.valid('UPGRADE', 'DOWNGRADE'), then: Joi.required(), otherwise: Joi.forbidden() }),
  pauseDurationDays: Joi.number().integer().min(1).max(90).when('action', { is: 'PAUSE', then: Joi.required(), otherwise: Joi.forbidden() }),
  menuItemId: Joi.number().integer().positive().optional(),
}).messages({
  'any.required': formatMessage('customer', 'subscription', localizationConstants.DEFAULT_LANGUAGE, 'error.validation_failed', { errors: '{#label} is required' }),
  'string.valid': formatMessage('customer', 'subscription', localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_subscription_action'),
  'number.min': formatMessage('customer', 'subscription', localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_pause_duration'),
  'number.max': formatMessage('customer', 'subscription', localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_pause_duration'),
});

/**
 * Validates subscription tracking request
 */
const trackSubscriptionTiersSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
}).messages({
  'any.required': formatMessage('customer', 'subscription', localizationConstants.DEFAULT_LANGUAGE, 'error.validation_failed', { errors: '{#label} is required' }),
});

/**
 * Validates subscription renewal request
 */
const renewSubscriptionSchema = Joi.object({
  subscriptionId: Joi.number().integer().positive().required(),
  userId: Joi.number().integer().positive().required(),
}).messages({
  'any.required': formatMessage('customer', 'subscription', localizationConstants.DEFAULT_LANGUAGE, 'error.validation_failed', { errors: '{#label} is required' }),
});

module.exports = {
  enrollSubscription: (req, res, next) => {
    const { error } = enrollSubscriptionSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return next({
        status: 400,
        message: formatMessage('customer', 'subscription', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.validation_failed', { errors: error.details.map(d => d.message).join(', ') }),
        errorCode: munchConstants.ERROR_CODES.VALIDATION_FAILED,
      });
    }
    next();
  },
  manageSubscription: (req, res, next) => {
    const { error } = manageSubscriptionSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return next({
        status: 400,
        message: formatMessage('customer', 'subscription', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.validation_failed', { errors: error.details.map(d => d.message).join(', ') }),
        errorCode: munchConstants.ERROR_CODES.VALIDATION_FAILED,
      });
    }
    next();
  },
  trackSubscriptionTiers: (req, res, next) => {
    const { error } = trackSubscriptionTiersSchema.validate(req.params, { abortEarly: false });
    if (error) {
      return next({
        status: 400,
        message: formatMessage('customer', 'subscription', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.validation_failed', { errors: error.details.map(d => d.message).join(', ') }),
        errorCode: munchConstants.ERROR_CODES.VALIDATION_FAILED,
      });
    }
    next();
  },
  renewSubscription: (req, res, next) => {
    const { error } = renewSubscriptionSchema.validate({ ...req.params, ...req.body }, { abortEarly: false });
    if (error) {
      return next({
        status: 400,
        message: formatMessage('customer', 'subscription', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.validation_failed', { errors: error.details.map(d => d.message).join(', ') }),
        errorCode: munchConstants.ERROR_CODES.VALIDATION_FAILED,
      });
    }
    next();
  },
};