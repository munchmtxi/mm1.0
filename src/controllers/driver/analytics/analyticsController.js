'use strict';

const { getPerformanceMetrics, generateAnalyticsReport, getRecommendations, comparePerformance } = require('@services/driver/analytics/analyticsService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const { sendResponse } = require('@utils/responseHandler');
const catchAsync = require('@utils/catchAsync');
const driverConstants = require('@constants/driverConstants');

const getPerformanceMetricsController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const metrics = await getPerformanceMetrics(driverId, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10], // Profile retrieved
    data: metrics,
  });
});

const generateAnalyticsReportController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { period } = req.body;
  const report = await generateAnalyticsReport(driverId, period, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[0], // Driver registered
    data: report,
  });
});

const getRecommendationsController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const recommendations = await getRecommendations(driverId, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10], // Profile retrieved
    data: recommendations,
  });
});

const comparePerformanceController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { peers } = req.body;
  const comparison = await comparePerformance(driverId, peers, { pointService, auditService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10], // Profile retrieved
    data: comparison,
  });
});

module.exports = {
  getPerformanceMetrics: getPerformanceMetricsController,
  generateAnalyticsReport: generateAnalyticsReportController,
  getRecommendations: getRecommendationsController,
  comparePerformance: comparePerformanceController,
};