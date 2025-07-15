'use strict';

const Joi = require('joi');
const driverConstants = require('@constants/driver/driverConstants');
const paymentConstants = require('@constants/common/paymentConstants');

const getEarningsTrendsSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  period: Joi.string()
    .valid(...paymentConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS)
    .required(),
}).unknown(false);

const getFinancialSummarySchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
}).unknown(false);

const recommendFinancialGoalsSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
}).unknown(false);

const compareFinancialPerformanceSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  peers: Joi.string().valid('city', 'country').required(),
}).unknown(false);

module.exports = {
  getEarningsTrends: getEarningsTrendsSchema,
  getFinancialSummary: getFinancialSummarySchema,
  recommendFinancialGoals: recommendFinancialGoalsSchema,
  compareFinancialPerformance: compareFinancialPerformanceSchema,
};