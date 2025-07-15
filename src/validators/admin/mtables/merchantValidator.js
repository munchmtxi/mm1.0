'use strict';

const Joi = require('joi');
const merchantConstants = require('@constants/merchantConstants');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');

const idSchema = Joi.object({
  merchantId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.merchant_id_required'),
      'number.integer': formatMessage('error.merchant_id_required'),
      'number.positive': formatMessage('error.merchant_id_required'),
      'any.required': formatMessage('error.merchant_id_required'),
    }),
});

const restaurantIdSchema = Joi.object({
  restaurantId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.restaurant_id_required'),
      'number.integer': formatMessage('error.restaurant_id_required'),
      'number.positive': formatMessage('error.restaurant_id_required'),
      'any.required': formatMessage('error.restaurant_id_required'),
    }),
});

const menuUpdatesSchema = Joi.object({
  items: Joi.array()
    .max(merchantConstants.MENU_SETTINGS.MAX_MENU_ITEMS)
    .items(
      Joi.object({
        dietaryFilters: Joi.array()
          .items(Joi.string().valid(...merchantConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS))
          .optional(),
      }).unknown(true)
    )
    .required()
    .messages({
      'array.max': formatMessage('error.menu_exceeds_max_items', { max: merchantConstants.MENU_SETTINGS.MAX_MENU_ITEMS }),
      'any.required': formatMessage('error.restaurant_id_menu_required'),
      'array.includes': formatMessage('error.invalid_dietary_filters'),
    }),
});

const reservationPoliciesSchema = Joi.object({
  minBookingHours: Joi.number()
    .min(mtablesConstants.BOOKING_HOURS.MIN_BOOKING_HOURS)
    .optional()
    .messages({
      'number.min': formatMessage('error.min_booking_hours', { min: mtablesConstants.BOOKING_HOURS.MIN_BOOKING_HOURS }),
    }),
  maxBookingHours: Joi.number()
    .max(mtablesConstants.BOOKING_HOURS.MAX_BOOKING_HOURS)
    .optional()
    .messages({
      'number.max': formatMessage('error.max_booking_hours', { max: mtablesConstants.BOOKING_HOURS.MAX_BOOKING_HOURS }),
    }),
  cancellationWindowHours: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': formatMessage('error.negative_cancellation_window'),
    }),
  depositPercentage: Joi.number()
    .min(mtablesConstants.BOOKING_POLICIES.DEFAULT_DEPOSIT_PERCENTAGE)
    .max(100)
    .optional()
    .messages({
      'number.min': formatMessage('error.invalid_deposit_percentage', {
        min: mtablesConstants.BOOKING_POLICIES.DEFAULT_DEPOSIT_PERCENTAGE,
      }),
      'number.max': formatMessage('error.invalid_deposit_percentage', {
        min: mtablesConstants.BOOKING_POLICIES.DEFAULT_DEPOSIT_PERCENTAGE,
      }),
    }),
}).required().messages({
  'any.required': formatMessage('error.restaurant_id_policies_required'),
});

module.exports = {
  approveMerchantOnboarding: {
    params: idSchema,
  },
  manageMenus: {
    params: restaurantIdSchema,
    body: menuUpdatesSchema,
  },
  configureReservationPolicies: {
    params: restaurantIdSchema,
    body: reservationPoliciesSchema,
  },
  monitorBranchPerformance: {
    params: idSchema,
  },
};