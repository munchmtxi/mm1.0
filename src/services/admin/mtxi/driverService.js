'use strict';

/**
 * Driver Service for mtxi (Admin)
 * Manages driver ride assignments, availability, safety reports, and training.
 * Integrates with notification, socket, audit, and localization services.
 * Focuses exclusively on mtxi ride-related functionality.
 *
 * Last Updated: May 27, 2025
 */

const { Driver, Ride, DriverAvailability, DriverSafetyIncident } = require('@models');
const rideConstants = require('@constants/common/rideConstants');
const driverConstants = require('@constants/common/driverConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils');
const { AppError } = require('@utils/AppError');
const { Op } = require('sequelize');

/**
 * Configures ride assignments for a driver.
 * @param {number} driverId - Driver ID.
 * @param {Object} assignment - { rideId }.
 * @returns {Object} Assignment details.
 */
async function manageDriverAssignment(driverId, assignment) {
  try {
    if (!driverId || !assignment?.rideId) {
      throw new AppError(
        'invalid driver_id or ride_id',
        400,
        driverConstants.ERROR_CODES.INVALID_DRIVER
      );
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError(
        'driver not found',
        404,
        driverConstants.ERROR_CODES.DRIVER_NOT_FOUND
      );
    }

    if (driver.availability_status !== driverConstants.DRIVER_STATUSES.AVAILABLE) {
      throw new AppError(
        'driver is not available',
        400,
        driverConstants.ERROR_CODES.RIDE_FAILED
      );
    }

    const ride = await Ride.findByPk(assignment.rideId);
    if (!ride || ride.status !== rideConstants.RIDE_STATUSES.PENDING) {
      throw new AppError(
        'invalid or unavailable ride',
        404,
        rideConstants.ERROR_CODES.RIDE_NOT_FOUND
      );
    }

    await ride.update({ driverId, status: rideConstants.RIDE_STATUSES.ACCEPTED });
    await driver.update({ availability_status: driverConstants.DRIVER_STATUSES.ON_RIDE });

    // Send notification
    await notificationService.sendNotification({
      userId: driver.user_id.toString(),
      type: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RIDE_ASSIGNED,
      messageKey: 'assignment',
      messageParams: { driverId, rideId: ride.id },
      role: 'driver',
      module: 'mtxi',
    });

    // Emit socket event
    await socketService.emit(null, 'driver:assignment_updated', {
      userId: driver.user_id.toString(),
      role: 'driver',
      driverId,
      rideId: ride.id,
    });

    // Log audit action
    await auditService.logAction({
      userId: driver.user_id.toString(),
      action: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RIDE_ASSIGNED,
      details: { driverId, rideId: ride.id },
      ipAddress: 'unknown',
    });

    logger.info('Ride assignment updated', { driverId, rideId: ride.id });
    return { driverId, rideId: ride.id, status: 'assigned' };
  } catch (error) {
    logger.logErrorEvent(`manageDriverAssignment failed: ${error.message}`, { driverId, assignment });
    throw error;
  }
}

/**
 * Tracks driver schedules and availability.
 * @param {number} driverId - Driver ID.
 * @returns {Object} Availability details.
 */
async function monitorDriverAvailability(driverId) {
  try {
    if (!driverId) {
      throw new AppError(
        'driver_id required',
        400,
        driverConstants.ERROR_CODES.INVALID_DRIVER
      );
    }

    const driver = await Driver.findByPk(driverId, {
      include: [{ model: DriverAvailability, as: 'availability' }],
    });
    if (!driver) {
      throw new AppError(
        'driver not found',
        404,
        driverConstants.ERROR_CODES.DRIVER_NOT_FOUND
      );
    }

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    const activeAvailability = driver.availability.find(
      a => a.date === currentDate && a.start_time <= currentTime && a.end_time >= currentTime
    );

    const availabilityStatus = activeAvailability
      ? activeAvailability.status
      : driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.UNAVAILABLE;

    const scheduleDetails = {
      driverId,
      availabilityStatus,
      currentSchedule: activeAvailability || null,
      upcomingSchedules: driver.availability
        .filter(a => new Date(`${a.date} ${a.start_time}`) > now)
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    };

    // Send notification
    await notificationService.sendNotification({
      userId: driver.user_id.toString(),
      type: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
      messageKey: 'availability',
      messageParams: { driverId, status: availabilityStatus },
      role: 'driver',
      module: 'mtxi',
    });

    // Log audit action
    await auditService.logAction({
      userId: driver.user_id.toString(),
      action: driverConstants.ANALYTICS_CONSTANTS.METRICS.RIDE_COMPLETION_RATE,
      details: { driverId, availabilityStatus },
      ipAddress: 'unknown',
    });

    logger.info('Availability monitored', { driverId, availabilityStatus });
    return scheduleDetails;
  } catch (error) {
    logger.logErrorEvent(`monitorDriverAvailability failed: ${error.message}`, { driverId });
    throw error;
  }
}

/**
 * Reviews safety incidents for a driver.
 * @param {number} driverId - Driver ID.
 * @returns {Object} Safety incident details.
 */
async function overseeSafetyReports(driverId) {
  try {
    if (!driverId) {
      throw new AppError(
        'driver_id required',
        400,
        driverConstants.ERROR_CODES.INVALID_DRIVER
      );
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError(
        'driver not found',
        404,
        driverConstants.ERROR_NOT_FOUND
      );
    }

    const incidents = await DriverSafetyIncident.findAll({
      where: { driver_id: driverId, ride_id: { [Op.not]: null } }, // Filter for rides only
      attributes: ['id', 'incident_type', 'description', 'status', 'created_at'],
    });

    const incidentSummary = {
      driverId,
      totalIncidents: incidents.length,
      incidentsByType: incidents.reduce((acc, incident) => {
        acc[incident.incident_type] = (acc[incident.incident_type] || 0) + 1;
        return acc;
      }, {}),
      pendingIncidents: incidents.filter(i => i.status === 'open').length,
      details: incidents,
    };

    // Send notification
    await notificationService.sendNotification({
      userId: driver.user_id.toString(),
      type: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SAFETY_ALERT,
      messageKey: 'safety.incidents',
      messageParams: { driverId, totalIncidents: incidentSummary.totalIncidents },
      role: 'driver',
      module: 'mtxi',
    });

    // Emit socket event
    await socketService.emit(null, 'safety:incidents_reviewed', {
      userId: driver.user_id.toString(),
      role: 'driver',
      driverId,
      totalIncidents: incidentSummary.totalIncidents,
    });

    // Log audit action
    await auditService.logAction({
      userId: driver.user_id.toString(),
      action: driverConstants.SAFETY_CONSTANTS.INCIDENT_TYPES.OTHER,
      details: { driverId, totalIncidents: incidentSummary.totalIncidents },
      ipAddress: 'unknown',
    });

    logger.info('Safety reports reviewed', { driverId, totalIncidents: incidentSummary.totalIncidents });
    return incidentSummary;
  } catch (error) {
    logger.logErrorEvent(`overseeSafetyReports failed: ${error.message}`, { driverId });
    throw error;
  }
}

/**
 * Manages driver training (simulated without certification persistence).
 * @param {number} driverId - Driver ID.
 * @param {Object} trainingDetails - { module, action: 'assign' | 'complete' | 'verify' }.
 * @returns {Object} Training status.
 */
async function administerTraining(driverId, trainingDetails) {
  try {
    if (!driverId || !trainingDetails?.module || !['assign', 'complete', 'verify'].includes(trainingDetails.action)) {
      throw new AppError(
        'invalid driver_id or training details',
        400,
        driverConstants.ERROR_CODES.INVALID_DRIVER
      );
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError(
        'driver not found',
        404,
        driverConstants.ERROR_CODES.DRIVER_NOT_FOUND
      );
    }

    const moduleKey = trainingDetails.module.toUpperCase();
    if (!driverConstants.ONBOARDING_CONSTANTS.TRAINING_MODULES[moduleKey]) {
      throw new AppError(
        'invalid training module',
        400,
        driverConstants.ERROR_CODES.INVALID_VEHICLE_TYPE
      );
    }

    const trainingStatus = {
      driverId,
      module: trainingDetails.module,
      action: trainingDetails.action,
      status: trainingDetails.action === 'assign' ? 'assigned' :
              trainingDetails.action === 'complete' ? 'completed' : 'verified',
    };

    // Send notification
    await notificationService.sendNotification({
      userId: driver.user_id.toString(),
      type: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
      messageKey: `training.${trainingStatus.status}`,
      messageParams: { driverId, module: trainingDetails.module },
      role: 'driver',
      module: 'mtxi',
    });

    // Emit socket event
    await socketService.emit(null, 'training:updated', {
      userId: driver.user_id.toString(),
      role: 'driver',
      driverId,
      module: trainingDetails.module,
      action: trainingDetails.action,
    });

    // Log audit action
    await auditService.logAction({
      userId: driver.user_id.toString(),
      action: driverConstants.ONBOARDING_CONSTANTS.TRAINING_MODULES[moduleKey],
      details: { driverId, module: trainingDetails.module, action: trainingDetails.action },
      ipAddress: 'unknown',
    });

    logger.info('Training administered', { driverId, module: trainingDetails.module, action: trainingDetails.action });
    return trainingStatus;
  } catch (error) {
    logger.logErrorEvent(`administerTraining failed: ${error.message}`, { driverId, trainingDetails });
    throw error;
  }
}

module.exports = {
  manageDriverAssignment,
  monitorDriverAvailability,
  overseeSafetyReports,
  administerTraining,
};