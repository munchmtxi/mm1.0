'use strict';

/**
 * Driver Availability Service
 * Manages driver availability operations, including setting working hours, retrieving status,
 * toggling availability, and awarding gamification points. Integrates with common services.
 */

const { Driver, DriverAvailability, GamificationPoints, sequelize } = require('@models');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const driverConstants = require('@constants/driverConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

/**
 * Sets driver working hours.
 * @param {number} driverId - Driver ID.
 * @param {Object} hours - Availability hours { date, start_time, end_time }.
 * @returns {Promise<Object>} Created/updated availability record.
 */
async function setAvailability(driverId, hours) {
  const { date, start_time, end_time } = hours;
  if (!date || !start_time || !end_time) {
    throw new AppError('Missing availability details', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const durationHours = (new Date(`1970-01-01T${end_time}`) - new Date(`1970-01-01T${start_time}`)) / (1000 * 60 * 60);
  if (durationHours < driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MIN_SHIFT_HOURS) {
    throw new AppError(
      `Availability duration must be at least ${driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MIN_SHIFT_HOURS} hours`,
      400,
      driverConstants.ERROR_CODES.INVALID_DRIVER
    );
  }
  if (durationHours > driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MAX_SHIFT_HOURS) {
    throw new AppError(
      `Availability duration cannot exceed ${driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MAX_SHIFT_HOURS} hours`,
      400,
      driverConstants.ERROR_CODES.INVALID_DRIVER
    );
  }

  const transaction = await sequelize.transaction();
  try {
    const [availability, created] = await DriverAvailability.findOrCreate({
      where: { driver_id: driverId, date },
      defaults: {
        driver_id: driverId,
        date,
        start_time,
        end_time,
        status: driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.AVAILABLE,
        isOnline: true,
        lastUpdated: new Date(),
      },
      transaction,
    });

    if (!created) {
      await availability.update(
        {
          start_time,
          end_time,
          status: driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.AVAILABLE,
          isOnline: true,
          lastUpdated: new Date(),
        },
        { transaction }
      );
    }

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'SET_AVAILABILITY',
      details: { driverId, date, start_time, end_time },
      ipAddress: 'unknown',
    });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
      message: formatMessage(
        'driver',
        'availability',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'availability.set',
        { date, start_time, end_time }
      ),
      priority: 'MEDIUM',
    });

    socketService.emit(null, 'availability:updated', { driverId, date, start_time, end_time });

    await transaction.commit();
    logger.info('Availability set', { driverId, date });
    return availability;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Set availability failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

/**
 * Retrieves driver availability status.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Availability details.
 */
async function getAvailability(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const today = new Date().toISOString().split('T')[0];
  const availability = await DriverAvailability.findOne({
    where: { driver_id: driverId, date: today },
    order: [['lastUpdated', 'DESC']],
  });

  logger.info('Availability retrieved', { driverId });
  return {
    driverId,
    availabilityStatus: driver.availability_status,
    currentAvailability: availability
      ? {
          date: availability.date,
          start_time: availability.start_time,
          end_time: availability.end_time,
          status: availability.status,
          isOnline: availability.isOnline,
        }
      : null,
  };
}

/**
 * Enables/disables driver availability.
 * @param {number} driverId - Driver ID.
 * @param {boolean} isAvailable - Availability status.
 * @returns {Promise<void>}
 */
async function toggleAvailability(driverId, isAvailable) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const newStatus = isAvailable
    ? driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.AVAILABLE
    : driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.UNAVAILABLE;
  if (driver.availability_status === newStatus) {
    throw new AppError(`Driver already ${newStatus}`, 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const transaction = await sequelize.transaction();
  try {
    await driver.update({ availability_status: newStatus, updated_at: new Date() }, { transaction });

    const today = new Date().toISOString().split('T')[0];
    await DriverAvailability.update(
      { isOnline: isAvailable, status: newStatus, lastUpdated: new Date() },
      { where: { driver_id: driverId, date: today }, transaction }
    );

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'TOGGLE_AVAILABILITY',
      details: { driverId, isAvailable },
      ipAddress: 'unknown',
    });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
      message: formatMessage(
        'driver',
        'availability',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        `availability.${isAvailable ? 'enabled' : 'disabled'}`
      ),
      priority: 'HIGH',
    });

    socketService.emit(null, 'availability:toggled', { driverId, isAvailable });

    await transaction.commit();
    logger.info('Availability toggled', { driverId, isAvailable });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Toggle availability failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

/**
 * Awards gamification points for maintaining availability.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Points awarded record.
 */
async function awardAvailabilityPoints(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const today = new Date().toISOString().split('T')[0];
  const availabilityRecords = await DriverAvailability.count({
    where: {
      driver_id: driverId,
      date: today,
      status: driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.AVAILABLE,
      isOnline: true,
      lastUpdated: { [Op.gte]: sequelize.literal('CURRENT_DATE') },
    },
  });
  if (availabilityRecords === 0) {
    throw new AppError('No availability records today', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const pointsRecord = await pointService.awardPoints({
    userId: driver.user_id,
    role: 'driver',
    action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.SHIFT_COMMITMENT.action,
    languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
  });

  logger.info('Availability points awarded', { driverId, points: pointsRecord.points });
  return pointsRecord;
}

module.exports = {
  setAvailability,
  getAvailability,
  toggleAvailability,
  awardAvailabilityPoints,
};