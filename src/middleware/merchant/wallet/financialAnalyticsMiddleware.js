// financialAnalyticsMiddleware.js
// Middleware for validating financial analytics-related requests.

'use strict';

const { trackFinancialTransactionsSchema, generateFinancialReportSchema, analyzeFinancialTrendsSchema, recommendFinancialGoalsSchema } = require('@validators/merchant/wallet/financialAnalyticsValidator');

async function validateTrackFinancialTransactions(req, res, next) {
  try {
    await trackFinancialTransactionsSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateGenerateFinancialReport(req, res, next) {
  try {
    await generateFinancialReportSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateAnalyzeFinancialTrends(req, res, next) {
  try {
    await analyzeFinancialTrendsSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateRecommendFinancialGoals(req, res, next) {
  try {
    await recommendFinancialGoalsSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateTrackFinancialTransactions,
  validateGenerateFinancialReport,
  validateAnalyzeFinancialTrends,
  validateRecommendFinancialGoals,
};