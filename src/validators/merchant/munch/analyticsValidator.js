'use strict';

const Joi = require('joi');
const munchConstants = require('@constants/common/munchConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { AppError } = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const analyticsSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
  period: Joi.string()
    .valid(...merchantConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS)
    .required(),
});

const validateAnalytics = (req, res, next) => {
  const { error } = analyticsSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

module.exports = {
  validateAnalytics,
};