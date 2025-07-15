'use strict';

const Joi = require('joi');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');

const analyticsSchema = Joi.object({
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

module.exports = {
  getBookingAnalytics: {
    params: analyticsSchema,
  },
  exportBookingReports: {
    params: analyticsSchema,
  },
  analyzeCustomerEngagement: {
    params: analyticsSchema,
  },
  trackGamificationMetrics: {
    params: analyticsSchema,
  },
};