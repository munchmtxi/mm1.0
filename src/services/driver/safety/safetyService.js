'use strict';

const { v4: uuidv4 } = require('uuid');
const { Driver, Ride, Order, DriverSafetyIncident, Route, sequelize } = require('@models');
const driverConstants = require('@constants/driverConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

function generateIncidentNumber() {
  return `INC-${uuidv4().substr(0, 8).toUpperCase()}`;
}

/**
 * Reports a safety incident for a driver.
 * @param {number} driverId - The ID of the driver.
 * @param {object} incidentDetails - Details of the incident (type, description, location, ride_id, delivery_order_id).
 * @returns {object} - Incident details (id, incident_number, type, status, priority, created_at).
 */
async function reportIncident(driverId, incidentDetails) {
  const { incident_type, description, location, ride_id, delivery_order_id } = incidentDetails;

  // Validate inputs
  if (!driverId) throw new AppError('Driver ID is required', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  if (!incident_type || !driverConstants.SAFETY_CONSTANTS.INCIDENT_TYPES.includes(incident_type)) {
    throw new AppError('Invalid incident type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (description && description.length > 1000) {
    throw new AppError('Description must be 1000 characters or less', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (location && (!location.lat || !location.lng)) {
    throw new AppError('Invalid location format', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
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

/**
 * Triggers an SOS alert for a driver.
 * @param {number} driverId - The ID of the driver.
 * @returns {object} - SOS incident details (id, incident_number, status, priority, created_at).
 */
async function triggerSOS(driverId) {
  if (!driverId) throw new AppError('Driver ID is required', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const incident = await DriverSafetyIncident.create(
      {
        driver_id: driverId,
        incident_number: generateIncidentNumber(),
        incident_type: 'SOS',
        description: 'Emergency SOS triggered by driver',
        location: driver.current_location || null,
        status: 'open',
        priority: 'critical',
      },
      { transaction }
    );

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

/**
 * Retrieves the safety status of a driver.
 * @param {number} driverId - The ID of the driver.
 * @returns {object} - Safety status (active_alerts, recent_incidents).
 */
async function getSafetyStatus(driverId) {
  if (!driverId) throw new AppError('Driver ID is required', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);

  const driver = await Driver.findByPk(driverId);
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

    await transaction.commit();
    logger.info('Safety status retrieved', { driverId, active_alerts: status.active_alerts });
    return status;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get safety status failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

/**
 * Sends a discreet alert for a driver.
 * @param {number} driverId - The ID of the driver.
 * @param {string} alertType - The type of discreet alert.
 * @returns {object} - Alert details (id, incident_number, status, priority, created_at).
 */
async function sendDiscreetAlert(driverId, alertType) {
  if (!driverId) throw new AppError('Driver ID is required', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  if (!alertType || !driverConstants.SAFETY_CONSTANTS.ALERT_TYPES.includes(alertType)) {
    throw new AppError('Invalid alert type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const incident = await DriverSafetyIncident.create(
      {
        driver_id: driverId,
        incident_number: generateIncidentNumber(),
        incident_type: 'DISCREET_ALERT',
        description: `Discreet alert: ${alertType}`,
        location: driver.current_location || null,
        status: 'open',
        priority: 'high',
      },
      { transaction }
    );

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

/**
 * Monitors route deviation for a driver.
 * @param {number} driverId - The ID of the driver.
 * @returns {object} - Deviation incident details or on-route status.
 */
async function monitorRouteDeviation(driverId) {
  if (!driverId) throw new AppError('Driver ID is required', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);

  const driver = await Driver.findByPk(driverId, {
    include: [{ model: Route, as: 'activeRoute' }],
  });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  if (!driver.activeRoute) throw new AppError('No active route assigned', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);

  const transaction = await sequelize.transaction();
  try {
    const route = driver.activeRoute;
    const currentLocation = driver.current_location;
    if (!currentLocation || !currentLocation.lat || !currentLocation.lng) {
      throw new AppError('Current location unavailable', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
    }

    // Placeholder for route deviation logic (use geospatial library like Turf.js or PostGIS in production)
    const routePath = route.polyline || route.steps;
    const isOffRoute = !routePath; // Simplified; real logic would calculate deviation

    if (isOffRoute) {
      const incident = await DriverSafetyIncident.create(
        {
          driver_id: driverId,
          incident_number: generateIncidentNumber(),
          incident_type: 'ROAD_HAZARD',
          description: 'Significant route deviation detected',
          location: currentLocation,
          status: 'open',
          priority: 'high',
        },
        { transaction }
      );

      await transaction.commit();
      logger.info('Route deviation incident reported', { driverId, incidentId: incident.id });
      return {
        id: incident.id,
        incident_number: incident.incident_number,
        status: incident.status,
        priority: incident.priority,
        created_at: incident.created_at,
      };
    }

    await transaction.commit();
    return { status: 'on_route' };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Route deviation check failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

/**
 * Requests a safety check-in for a driver.
 * @param {number} driverId - The ID of the driver.
 * @returns {object} - Check-in incident details or status if recent check-in exists.
 */
async function requestSafetyCheckIn(driverId) {
  if (!driverId) throw new AppError('Driver ID is required', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const recentCheckIn = await DriverSafetyIncident.findOne({
      where: {
        driver_id: driverId,
        incident_type: 'CHECKpps_IN',
        created_at: {
          [sequelize.Op.gte]: sequelize.literal(`NOW() - INTERVAL '${driverConstants.SAFETY_CONSTANTS.SAFETY_ALERT_FREQUENCY_MINUTES} minutes'`),
        },
      },
      transaction,
    });

    if (recentCheckIn) {
      await transaction.commit();
      return { status: 'recent_check_in_exists', incidentId: recentCheckIn.id };
    }

    const incident = await DriverSafetyIncident.create(
      {
        driver_id: driverId,
        incident_number: generateIncidentNumber(),
        incident_type: 'CHECK_IN',
        description: 'Periodic safety check-in requested',
        location: driver.current_location || null,
        status: 'open',
        priority: 'medium',
      },
      { transaction }
    );

    await transaction.commit();
    logger.info('Safety check-in requested', { driverId, incidentId: incident.id });
    return {
      id: incident.id,
      incident_number: incident.incident_number,
      status: incident.status,
      priority: incident.priority,
      created_at: incident.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Safety check-in request failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

module.exports = {
  reportIncident,
  triggerSOS,
  getSafetyStatus,
  sendDiscreetAlert,
  monitorRouteDeviation,
  requestSafetyCheckIn,
};