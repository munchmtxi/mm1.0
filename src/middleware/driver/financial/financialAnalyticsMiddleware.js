'use strict';

const Joi = require('joi');
const { validateInput } = require('@utils/security');
const driverConstants = require('@constants/driver/driverConstants');
const AppError = require('@utils/AppError');

const validateRequest = (schema) => async (req, res, next) => {
  try {
    const { error } = schema.validate({
      driverId: req.user.driverId,
      ...req.query,
      ...req.body,
    });
    if (error) {
      throw new AppError(`Validation failed: ${error.details[0].message}`, 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateGetEarningsTrends: validateRequest(require('@validators/driver/financial/financialAnalyticsValidator').getEarningsTrends),
  validateGetFinancialSummary: validateRequest(require('@validators/driver/financial/financialAnalyticsValidator').getFinancialSummary),
  validateRecommendFinancialGoals: validateRequest(require('@validators/driver/financial/financialAnalyticsValidator').recommendFinancialGoals),
  validateCompareFinancialPerformance: validateRequest(require('@validators/driver/financial/financialAnalyticsValidator').compareFinancialPerformance),
};