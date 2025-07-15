'use strict';

const analyticsService = require('@services/admin/mtxi/analyticsService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localizationService');
const { AppError } = require('@utils/AppError');
const logger = require('@utils');

const services = { notificationService, socketService, auditService, pointService };

async function getRideAnalytics(req, res, next) {
  try {
    const { driverId } = req.params;
    const analytics = await analyticsService.getRideAnalytics(driverId, services);
    res.status(200).json({
      status: 'success',
      message: formatMessage('analytics.ride_completion_success'),
      data: analytics,
    });
  } catch (error) {
    logger.logErrorEvent(`getRideAnalytics controller failed: ${error.message}`, { driverId: req.params.driverId });
    next(error);
  }
}

async function getTipAnalytics(req, res, next) {
  try {
    const { driverId } = req.params;
    const analytics = await analyticsService.getTipAnalytics(driverId, services);
    res.status(200).json({
      status: 'success',
      message: formatMessage('analytics.tip_distribution_success'),
      data: analytics,
    });
  } catch (error) {
    logger.logErrorEvent(`getTipAnalytics controller failed: ${error.message}`, { driverId: req.params.driverId });
    next(error);
  }
}

async function exportRideReports(req, res, next) {
  try {
    const { driverId } = req.params;
    const { format, period } = req.query;
    const report = await analyticsService.exportRideReports(driverId, format, period, services);
    res.status(200).json({
      status: 'success',
      message: formatMessage('analytics.report_generated_success'),
      data: report,
    });
  } catch (error) {
    logger.logErrorEvent(`exportRideReports controller failed: ${error.message}`, { driverId: req.params.driverId });
    next(error);
  }
}

async function analyzeDriverPerformance(req, res, next) {
  try {
    const { driverId } = req.params;
    const performance = await analyticsService.analyzeDriverPerformance(driverId, services);
    res.status(200).json({
      status: 'success',
      message: formatMessage('analytics.performance_updated_success'),
      data: performance,
    });
  } catch (error) {
    logger.logErrorEvent(`analyzeDriverPerformance controller failed: ${error.message}`, { driverId: req.params.driverId });
    next(error);
  }
}

module.exports = {
  getRideAnalytics,
  getTipAnalytics,
  exportRideReports,
  analyzeDriverPerformance,
};