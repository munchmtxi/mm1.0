'use strict';

const safetyService = require('@services/driver/safety/safetyService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localization');
const driverConstants = require('@constants/driverConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function reportIncident(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const incidentDetails = req.body;
    const incident = await safetyService.reportIncident(driverId, incidentDetails, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: incident,
      message: formatMessage(
        'driver',
        'safety',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'safety.incident_reported',
        { incident_number: incident.incident_number }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function triggerSOS(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const incident = await safetyService.triggerSOS(driverId, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: incident,
      message: formatMessage(
        'driver',
        'safety',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'safety.sos_triggered',
        { incident_number: incident.incident_number }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function getSafetyStatus(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const status = await safetyService.getSafetyStatus(driverId, auditService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

async function sendDiscreetAlert(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const { alertType } = req.body;
    const incident = await safetyService.sendDiscreetAlert(driverId, alertType, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: incident,
      message: formatMessage(
        'driver',
        'safety',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'safety.discreet_alert_sent'
      ),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  reportIncident,
  triggerSOS,
  getSafetyStatus,
  sendDiscreetAlert,
};