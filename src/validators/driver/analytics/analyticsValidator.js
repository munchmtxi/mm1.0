'use strict';

const Joi = require('joi');
const driverConstants = require('@constants/driverConstants');

const getPerformanceMetricsSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
}).unknown(false);

const generateAnalyticsReportSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  period: Joi.string()
    .valid(...driverConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS)
    .required(),
}).unknown(false);

const getRecommendationsSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
}).unknown(false);

const comparePerformanceSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  peers: Joi.array().items(Joi.number().integer().positive()).min(1).max(10).required(),
}).unknown(false);

module.exports = {
  getPerformanceMetrics: getPerformanceMetricsSchema,
  generateAnalyticsReport: generateAnalyticsReportSchema,
  getRecommendations: getRecommendationsSchema,
  comparePerformance: comparePerformanceSchema,
};