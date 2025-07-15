'use strict';

const { v4: uuidv4 } = require('uuid');
const { Driver, User, Ride, Order, DriverSafetyIncident, sequelize } = require('@models');
const driverConstants = require('@constants/driverConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

function generateIncidentNumber() {
  return `INC-${uuidv4().substr(0, 8).toUpperCase()}`;
}

async function reportIncident(driverId, incidentDetails, auditService, notificationService, socketService, pointService) {
  const { incident_type, description, location, ride_id, delivery_order_id } = incidentDetails;

  if (!driverConstants.SAFETY_CONSTANTS.INCIDENT_TYPES.includes(incident_type)) {
    throw new AppError('Invalid incident type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (description && description.length > 1000) {
    throw new AppError('Description must be 1000 characters or less', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (location && (!location.lat || !location.lng)) {
    throw new AppError('Invalid location format', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    if (ride_id) {
      const ride = await Ride.findByPk(ride_id, { transaction });
      if (!ride || ride.driverId !== driverId) {
        throw new AppError('Invalid or unauthorized ride', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
      }
    } else if (delivery_order_id) {
      const order = await Order.findByPk(delivery_order_id, { transaction });
      if (!order || order.driver_id !== driverId) {
        throw new AppError('Invalid or unauthorized delivery order', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
      }
    }

    const incident = await DriverSafetyIncident.create(
      {
        driver_id: driverId,
        ride_id,
        delivery_order_id,
        incident_number: generateIncidentNumber(),
        incident_type,
        description,
        location,
        status: 'open',
        priority: ['ACCIDENT', 'HARASSMENT', 'UNSAFE_SITUATION'].includes(incident_type) ? 'high' : 'medium',
      },
      { transaction }
    );

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'REPORT_SAFETY_INCIDENT',
        details: { driverId, incidentId: incident.id, incident_number: incident.incident_number },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SAFETY_INCIDENT,
        message: formatMessage(
          'driver',
          'safety',
          driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'safety.incident_reported',
          { incident_number: incident.incident_number }
        ),
        priority: 'HIGH',
      },
      { transaction }
    );

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'safety_report').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'safety:incident_reported', {
      driverId,
      incidentId: incident.id,
      incident_number: incident.incident_number,
    });

    await transaction.commit();
    logger.info('Safety incident reported', { driverId, incidentId: incident.id });
    return {
      id: incident.id,
      incident_number: incident.incident_number,
      incident_type,
      status: incident.status,
      priority: incident.priority,
      created_at: incident.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Report incident failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function triggerSOS(driverId, auditService, notificationService, socketService, pointService) {
  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const incident = await DriverSafetyIncident.create(
      {
        driver_id: driverId,
        incident_number: generateIncidentNumber(),
        incident_type: 'SOS',
        description: 'Emergency SOS triggered by driver',
        location: driver.last_known_location || null,
        status: 'open',
        priority: 'critical',
      },
      { transaction }
    );

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'TRIGGER_SOS',
        details: { driverId, incidentId: incident.id, incident_number: incident.incident_number },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SAFETY_SOS,
        message: formatMessage(
          'driver',
          'safety',
          driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'safety.sos_triggered',
          { incident_number: incident.incient_number }
        ),
        priority: 'CRITICAL',
      },
      { transaction }
    );

    await notificationService.sendNotification(
      {
        userId: driverConstants.SAFETY_CONSTANTS.SUPPORT_TEAM_ID,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SAFETY_SOS,
        message: `SOS triggered by driver ${driverId} (Incident: ${incident.incident_number})`,
        priority: 'CRITICAL',
      },
      { transaction }
    );

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'sos_trigger').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'safety:sos_triggered', {
      driverId,
      incidentId: incident.id,
      incident_number: incident.incident_number,
    });

    await transaction.commit();
    logger.info('SOS triggered', { driverId, incidentId: incident.id });
    return {
      id: incident.id,
      incident_number: incident.incident_number,
      status: incident.status,
      priority: incident.priority,
      created_at: incident.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Trigger SOS failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function getSafetyStatus(driverId, auditService, socketService, pointService) {
  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const incidents = await DriverSafetyIncident.findAll({
      where: {
        driver_id: driverId,
        status: ['open', 'in_progress'],
        created_at: {
          [sequelize.Op.gte]: sequelize.literal("NOW() - INTERVAL '30 days'"),
        },
      },
      include: [
        { model: Ride, as: 'ride', attributes: ['id', 'status'] },
        { model: Order, as: 'deliveryOrder', attributes: ['id', 'status'] },
      ],
      order: [['created_at', 'DESC']],
      transaction,
    });

    const status = {
      active_alerts: incidents.filter((i) => ['SOS', 'DISCREET_ALERT'].includes(i.incident_type)).length,
      recent_incidents: incidents.map((i) => ({
        id: i.id,
        incident_number: i.incident_number,
        incident_type: i.incident_type,
        status: i.status,
        priority: i.priority,
        created_at: i.created_at,
        ride_id: i.ride_id,
        delivery_order_id: i.delivery_order_id,
      })),
    };

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'GET_SAFETY_STATUS',
        details: { driverId, active_alerts: status.active_alerts },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'safety_status_check').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'safety:status_updated', { driverId, status });

    await transaction.commit();
    logger.info('Safety status retrieved', { driverId, active_alerts: status.active_alerts });
    return status;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get safety status failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function sendDiscreetAlert(driverId, alertType, auditService, notificationService, socketService, pointService) {
  if (!driverConstants.SAFETY_CONSTANTS.ALERT_TYPES.includes(alertType)) {
    throw new AppError('Invalid alert type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const incident = await DriverSafetyIncident.create(
      {
        driver_id: driverId,
        incident_number: generateIncidentNumber(),
        incident_type: 'DISCREET_ALERT',
        description: `Discreet alert: ${alertType}`,
        location: driver.last_known_location || null,
        status: 'open',
        priority: 'high',
      },
      { transaction }
    );

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'SEND_DISCREET_ALERT',
        details: { driverId, incidentId: incident.id, incident_number: incident.incident_number, alertType },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await notificationService.sendNotification(
      {
        userId: driverConstants.SAFETY_CONSTANTS.SUPPORT_TEAM_ID,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SAFETY_ALERT,
        message: `Discreet alert (${alertType}) from driver ${driverId} (Incident: ${incident.incident_number})`,
        priority: 'HIGH',
      },
      { transaction }
    );

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'discreet_alert').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'safety:discreet_alert_sent', {
      driverId,
      incidentId: incident.id,
      incident_number: incident.incident_number,
    });

    await transaction.commit();
    logger.info('Discreet alert sent', { driverId, incidentId: incident.id, alertType });
    return {
      id: incident.id,
      incident_number: incident.incident_number,
      status: incident.status,
      priority: incident.priority,
      created_at: incident.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Send discreet alert failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

module.exports = {
  reportIncident,
  triggerSOS,
  getSafetyStatus,
  sendDiscreetAlert,
};