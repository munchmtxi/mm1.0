'use strict';

const Joi = require('joi');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');

const restaurantIdSchema = Joi.object({
  restaurantId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.invalid_booking_details'),
      'number.integer': formatMessage('error.invalid_booking_details'),
      'number.positive': formatMessage('error.invalid_booking_details'),
      'any.required': formatMessage('error.invalid_booking_details'),
    }),
});

const tableRulesSchema = Joi.object({
  autoAssign: Joi.boolean().optional(),
  minCapacity: Joi.number().integer().positive().optional(),
  maxCapacity: Joi.number().integer().positive().optional(),
  preferredLocation: Joi.string()
    .valid(...mtablesConstants.TABLE_MANAGEMENT.LOCATION_TYPES)
    .optional()
    .messages({
      'any.only': formatMessage('error.invalid_location_type'),
    }),
}).min(1);

const gamificationRulesSchema = Joi.object().pattern(
  Joi.string(),
  Joi.object({
    points: Joi.number().min(0).required(),
    walletCredit: Joi.number().min(0).required(),
  })
).min(1);

const waitlistSettingsSchema = Joi.object({
  maxWaitlist: Joi.number().integer().positive().optional(),
  notificationInterval: Joi.number().integer().min(5).max(60).optional().messages({
    'number.min': formatMessage('error.invalid_notification_interval'),
    'number.max': formatMessage('error.invalid_notification_interval'),
  }),
}).min(1);

const pricingModelsSchema = Joi.object({
  depositPercentage: Joi.number()
    .min(mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE)
    .max(mtablesConstants.BOOKING_POLICIES.MAX_DEPOSIT_PERCENTAGE)
    .optional()
    .messages({
      'number.min': formatMessage('error.invalid_deposit_percentage', {
        min: mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE,
        max: mtablesConstants.BOOKING_POLICIES.MAX_DEPOSIT_PERCENTAGE,
      }),
      'number.max': formatMessage('error.invalid_deposit_percentage', {
        min: mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE,
        max: mtablesConstants.BOOKING_POLICIES.MAX_DEPOSIT_PERCENTAGE,
      }),
    }),
  serviceFee: Joi.number().min(0).max(100).optional().messages({
    'number.min': formatMessage('error.invalid_service_fee'),
    'number.max': formatMessage('error.invalid_service_fee'),
  }),
}).min(1);

module.exports = {
  setTableRules: {
    params: restaurantIdSchema,
    body: tableRulesSchema,
  },
  configureGamificationRules: {
    params: restaurantIdSchema,
    body: gamificationRulesSchema,
  },
  updateWaitlistSettings: {
    params: restaurantIdSchema,
    body: waitlistSettingsSchema,
  },
  configurePricingModels: {
    params: restaurantIdSchema,
    body: pricingModelsSchema,
  },
};