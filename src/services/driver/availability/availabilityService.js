'use strict';

const { Driver, DriverAvailability, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const driverGamificationConstants = require('@constants/driver/driverGamificationConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function setAvailability(driverId, hours, { pointService, auditService, notificationService, socketService }) {
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

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'SET_AVAILABILITY',
        details: { driverId, date, start_time, end_time },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'set_availability',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'set_availability').points,
      { action: 'Set availability schedule' },
      transaction
    );

    // Award shift_commitment points only once per day for valid availability
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      const existingPoints = await pointService.getPointsHistory(driverId, 'shift_commitment', {
        startDate: new Date(today),
        endDate: new Date(today + 'T23:59:59.999Z'),
      });
      if (!existingPoints.length) {
        await pointService.awardPoints(
          driverId,
          'shift_commitment',
          driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'shift_commitment').points,
          { action: 'Maintained availability commitment' },
          transaction
        );
      }
    }

    await notificationService.sendNotification(
      {
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
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'availability:updated', { driverId, date, start_time, end_time });

    await transaction.commit();
    logger.info('Availability set', { driverId, date });
    return availability;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Set availability failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function getAvailability(driverId, { pointService, auditService, notificationService, socketService }) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const today = new Date().toISOString().split('T')[0];
  const availability = await DriverAvailability.findOne({
    where: { driver_id: driverId, date: today },
    order: [['lastUpdated', 'DESC']],
  });

  const transaction = await sequelize.transaction();
  try {
    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'GET_AVAILABLE',
        details: { driverId },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'availability_access',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'availability_access').points,
      { action: 'Retrieved availability status' },
      transaction
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
        message: formatMessage(
          'driver',
          'availability',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'availability.retrieved'
        ),
        priority: 'LOW',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'availability:retrieved', { driverId, availability });

    await transaction.commit();
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
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get availability failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function toggleAvailability(driverId, isAvailable, { pointService, auditService, notificationService, socketService }) {
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

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'TOGGLE_AVAILABILITY',
        details: { driverId, isAvailable },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'toggle_availability',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'toggle_availability').points,
      { action: `Toggled availability to ${isAvailable ? 'available' : 'unavailable'}` },
      transaction
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
        message: formatMessage(
          'driver',
          'availability',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          `availability.${isAvailable ? 'enabled' : 'disabled'}`
        ),
        priority: 'HIGH',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'availability:toggled', { driverId, isAvailable });

    await transaction.commit();
    logger.info('Availability toggled', { driverId, isAvailable });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Toggle availability failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

module.exports = {
  setAvailability,
  getAvailability,
  toggleAvailability,
};