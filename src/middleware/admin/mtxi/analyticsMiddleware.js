'use strict';

const { validate } = require('@utils/validationUtil');
const analyticsValidator = require('@validators/admin/mtxi/analyticsValidator');
const { AppError } = require('@utils/AppError');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');
const logger = require('@utils');

function validateGetRideAnalytics(req, res, next) {
  const { error } = validate(analyticsValidator.getRideAnalyticsSchema, {
    driverId: req.params.driverId,
  });
  if (error) {
    logger.logErrorEvent(`validateGetRideAnalytics failed: ${error.message}`, { driverId: req.params.driverId });
    return next(new AppError(error.message, 400));
  }
  next();
}

function validateGetTipAnalytics(req, res, next) {
  const { error } = validate(analyticsValidator.getTipAnalyticsSchema, {
    driverId: req.params.driverId,
  });
  if (error) {
    logger.logErrorEvent(`validateGetTipAnalytics failed: ${error.message}`, { driverId: req.params.driverId });
    return next(new AppError(error.message, 400));
  }
  next();
}

function validateExportRideReports(req, res, next) {
  const { error } = validate(analyticsValidator.exportRideReportsSchema, {
    driverId: req.params.driverId,
    format: req.query.format,
    period: req.query.period,
  });
  if (error) {
    logger.logErrorEvent(`validateExportRideReports failed: ${error.message}`, { driverId: req.params.driverId });
    return next(new AppError(error.message, 400));
  }
  next();
}

function validateAnalyzeDriverPerformance(req, res, next) {
  const { error } = validate(analyticsValidator.analyzeDriverPerformanceSchema, {
    driverId: req.params.driverId,
  });
  if (error) {
    logger.logErrorEvent(`validateAnalyzeDriverPerformance failed: ${error.message}`, { driverId: req.params.driverId });
    return next(new AppError(error.message, 400));
  }
  next();
}

function checkAnalyticsPermission(req, res, next) {
  const user = req.user; // Assuming auth middleware sets req.user
  const hasPermission = adminCoreConstants.ADMIN_PERMISSIONS[user.role]?.manageAnalytics?.includes('read');
  if (!hasPermission) {
    logger.logErrorEvent(`checkAnalyticsPermission failed: Permission denied`, { userId: user.id, role: user.role });
    return next(new AppError('Permission denied', 403, adminCoreConstants.ERROR_CODES.PERMISSION_DENIED));
  }
  next();
}

module.exports = {
  validateGetRideAnalytics,
  validateGetTipAnalytics,
  validateExportRideReports,
  validateAnalyzeDriverPerformance,
  checkAnalyticsPermission,
};