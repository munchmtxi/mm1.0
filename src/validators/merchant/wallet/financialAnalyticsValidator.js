// financialAnalyticsValidator.js
// Validation schemas for financial analytics-related endpoints.

'use strict';

const Joi = require('joi');

const trackFinancialTransactionsSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
  period: Joi.string().valid('daily', 'weekly', 'monthly').required(),
});

const generateFinancialReportSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
  period: Joi.string().valid('daily', 'weekly', 'monthly').required(),
});

const analyzeFinancialTrendsSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
});

const recommendFinancialGoalsSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
});

module.exports = {
  trackFinancialTransactionsSchema,
  generateFinancialReportSchema,
  analyzeFinancialTrendsSchema,
  recommendFinancialGoalsSchema,
};