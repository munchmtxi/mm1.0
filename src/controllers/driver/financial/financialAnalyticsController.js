'use strict';

const {
  getEarningsTrends,
  getFinancialSummary,
  recommendFinancialGoals,
  compareFinancialPerformance,
} = require('@services/driver/financial/financialAnalyticsService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const { sendResponse } = require('@utils/responseHandler');
const catchAsync = require('@utils/catchAsync');
const driverConstants = require('@constants/driver/driverConstants');

const getEarningsTrendsController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { period } = req.query;
  const trends = await getEarningsTrends(driverId, period, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: trends,
  });
});

const getFinancialSummaryController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const summary = await getFinancialSummary(driverId, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: summary,
  });
});

const recommendFinancialGoalsController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const goals = await recommendFinancialGoals(driverId, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: goals,
  });
});

const compareFinancialPerformanceController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { peers } = req.query;
  const comparison = await compareFinancialPerformance(driverId, peers, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: comparison,
  });
});

module.exports = {
  getEarningsTrends: getEarningsTrendsController,
  getFinancialSummary: getFinancialSummaryController,
  recommendFinancialGoals: recommendFinancialGoalsController,
  compareFinancialPerformance: compareFinancialPerformanceController,
};