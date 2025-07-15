'use strict';

const driverService = require('@services/admin/mtxi/driverService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localizationService');
const { AppError } = require('@utils/AppError');
const logger = require('@utils');

const services = { notificationService, socketService, auditService, pointService };

async function manageDriverAssignment(req, res, next) {
  try {
    const { driverId } = req.params;
    const { rideId } = req.body;
    const assignment = await driverService.manageDriverAssignment(driverId, { rideId }, services);
    res.status(200).json({
      status: 'success',
      message: formatMessage('assignment_success'),
      data: assignment,
    });
  } catch (error) {
    logger.logErrorEvent(`manageDriverAssignment controller failed: ${error.message}`, { driverId: req.params.driverId });
    next(error);
  }
}

async function monitorDriverAvailability(req, res, next) {
  try {
    const { driverId } = req.params;
    const scheduleDetails = await driverService.monitorDriverAvailability(driverId, services);
    res.status(200).json({
      status: 'success',
      message: formatMessage('availability_success'),
      data: scheduleDetails,
    });
  } catch (error) {
    logger.logErrorEvent(`monitorDriverAvailability controller failed: ${error.message}`, { driverId: req.params.driverId });
    next(error);
  }
}

async function overseeSafetyReports(req, res, next) {
  try {
    const { driverId } = req.params;
    const incidentSummary = await driverService.overseeSafetyReports(driverId, services);
    res.status(200).json({
      status: 'success',
      message: formatMessage('safety.incidents_success'),
      data: incidentSummary,
    });
  } catch (error) {
    logger.logErrorEvent(`overseeSafetyReports controller failed: ${error.message}`, { driverId: req.params.driverId });
    next(error);
  }
}

async function administerTraining(req, res, next) {
  try {
    const { driverId } = req.params;
    const trainingDetails = req.body;
    const trainingStatus = await driverService.administerTraining(driverId, trainingDetails, services);
    res.status(200).json({
      status: 'success',
      message: formatMessage(`training.${trainingStatus.status}_success`),
      data: trainingStatus,
    });
  } catch (error) {
    logger.logErrorEvent(`administerTraining controller failed: ${error.message}`, { driverId: req.params.driverId });
    next(error);
  }
}

module.exports = {
  manageDriverAssignment,
  monitorDriverAvailability,
  overseeSafetyReports,
  administerTraining,
};