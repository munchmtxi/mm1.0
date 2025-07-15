'use strict';

const { validate } = require('@utils/validationUtil');
const driverValidator = require('@validators/admin/mtxi/driverValidator');
const { AppError } = require('@utils/AppError');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');
const logger = require('@utils');

function validateManageDriverAssignment(req, res, next) {
  const { error } = validate(driverValidator.manageDriverAssignmentSchema, {
    driverId: req.params.driverId,
    rideId: req.body.rideId,
  });
  if (error) {
    logger.logErrorEvent(`validateManageDriverAssignment failed: ${error.message}`, { driverId: req.params.driverId });
    return next(new AppError(error.message, 400));
  }
  next();
}

function validateMonitorDriverAvailability(req, res, next) {
  const { error } = validate(driverValidator.monitorDriverAvailabilitySchema, {
    driverId: req.params.driverId,
  });
  if (error) {
    logger.logErrorEvent(`validateMonitorDriverAvailability failed: ${error.message}`, { driverId: req.params.driverId });
    return next(new AppError(error.message, 400));
  }
  next();
}

function validateOverseeSafetyReports(req, res, next) {
  const { error } = validate(driverValidator.overseeSafetyReportsSchema, {
    driverId: req.params.driverId,
  });
  if (error) {
    logger.logErrorEvent(`validateOverseeSafetyReports failed: ${error.message}`, { driverId: req.params.driverId });
    return next(new AppError(error.message, 400));
  }
  next();
}

function validateAdministerTraining(req, res, next) {
  const { error } = validate(driverValidator.administerTrainingSchema, {
    driverId: req.params.driverId,
    module: req.body.module,
    action: req.body.action,
  });
  if (error) {
    logger.logErrorEvent(`validateAdministerTraining failed: ${error.message}`, { driverId: req.params.driverId });
    return next(new AppError(error.message, 400));
  }
  next();
}

function checkDriverManagementPermission(req, res, next) {
  const user = req.user; // Assuming auth middleware sets req.user
  const hasPermission = adminCoreConstants.ADMIN_PERMISSIONS[user.role]?.manageUsers?.includes('write');
  if (!hasPermission) {
    logger.logErrorEvent(`checkDriverManagementPermission failed: Permission denied`, { userId: user.id, role: user.role });
    return next(new AppError('Permission denied', 403, adminCoreConstants.ERROR_CODES.PERMISSION_DENIED));
  }
  next();
}

module.exports = {
  validateManageDriverAssignment,
  validateMonitorDriverAvailability,
  validateOverseeSafetyReports,
  validateAdministerTraining,
  checkDriverManagementPermission,
};