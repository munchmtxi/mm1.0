'use strict';

const { Driver, Shift, DeliveryHotspot, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const driverGamificationConstants = require('@constants/driver/driverGamificationConstants');
const { formatMessage } = require('@utils/utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function createShift(driverId, shiftDetails, { pointService, auditService, notificationService, socketService }) {
  const { start_time, end_time, shift_type } = shiftDetails;
  if (!start_time || !end_time || !shift_type) {
    throw new AppError('Missing shift details', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (![driverConstants.MUNCH_CONSTANTS.DELIVERY_TYPES.STANDARD, driverConstants.MUNCH_CONSTANTS.DELIVERY_TYPES.BATCH].includes(shift_type)) {
    throw new AppError('Invalid shift type', 400, driverConstants.ERROR_CODES.SHIFT_INVALID_TYPE);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const durationHours = (new Date(end_time) - new Date(start_time)) / (1000 * 60 * 60);
  if (durationHours < driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MIN_SHIFT_HOURS) {
    throw new AppError(
      `Shift duration must be at least ${driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MIN_SHIFT_HOURS} hours`,
      400,
      driverConstants.ERROR_CODES.SHIFT_INVALID_DURATION
    );
  }
  if (durationHours > driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MAX_SHIFT_HOURS) {
    throw new AppError(
      `Shift duration cannot exceed ${driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MAX_SHIFT_HOURS} hours`,
      400,
      driverConstants.ERROR_CODES.SHIFT_INVALID_DURATION
    );
  }

  const weekStart = new Date(start_time);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weeklyShifts = await Shift.count({
    where: {
      driver_id: driverId,
      start_time: { [Op.between]: [weekStart, weekEnd] },
      status: { [Op.ne]: driverConstants.MUNCH_CONSTANTS.DELIVERY_STATUSES.CANCELLED },
    },
  });
  if (weeklyShifts >= driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MAX_SHIFTS_PER_WEEK) {
    throw new AppError(
      `Cannot exceed ${driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MAX_SHIFTS_PER_WEEK} shifts per week`,
      400,
      driverConstants.ERROR_CODES.SHIFT_LIMIT_EXCEEDED
    );
  }

  const transaction = await sequelize.transaction();
  try {
    const shift = await Shift.create(
      {
        driver_id: driverId,
        start_time,
        end_time,
        shift_type,
        status: 'scheduled',
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'CREATE_SHIFT',
        details: { driverId, shiftId: shift.id, start_time, end_time, shift_type },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'create_shift',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'create_shift').points,
      { action: 'Created a new shift' },
      transaction
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
        message: formatMessage(
          'driver',
          'shift',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'shift.created',
          { shiftId: shift.id, start_time, end_time }
        ),
        priority: 'HIGH',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'shift:created', { driverId, shiftId: shift.id, start_time, end_time, shift_type });

    await transaction.commit();
    logger.info('Shift created', { driverId, shiftId: shift.id });
    return shift;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Create shift failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function getShiftDetails(driverId, { pointService, auditService, notificationService, socketService }) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND));

  const shifts = await Shift.findAll({
    where: { driver_id: driverId, status: { [Op.in]: ['scheduled', 'active'] } },
    order: [['start_time', 'ASC']],
  });

  const transaction = await sequelize.transaction();
  try {
    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'GET_SHIFT_DETAILS',
        details: { driverId, shiftCount: shifts.length },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    const today = new Date().toISOString().split('T')[0];
    const existingPoints = await pointService.getPointsHistory(driverId, 'shift_access', {
      startDate: new Date(today),
      endDate: new Date(today + 'T23:59:59.999Z'),
    });
    if (!existingPoints.length) {
      await pointService.awardPoints(
        driverId,
        'shift_access',
        driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'shift_access').points,
        { action: 'Retrieved shift details' },
        transaction
      );
    }

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
        message: formatMessage(
          'driver',
          'shift',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'shift.retrieved',
          { count: shifts.length }
        ),
        priority: 'LOW',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'shift:retrieved', { driverId, shifts });

    await transaction.commit();
    logger.info('Shift details retrieved', { driverId });
    return shifts.map((shift) => ({
      shiftId: shift.id,
      start_time: shift.start_time,
      end_time: shift.end_time,
      shift_type: shift.shift_type,
      status: shift.status,
    }));
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get shift details failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function updateShift(driverId, shiftId, shiftDetails, { pointService, auditService, notificationService, socketService }) {
  const { start_time, end_time, shift_type, status } = shiftDetails;
  const validStatuses = ['scheduled', 'active', 'completed', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    throw new AppError('Invalid shift status', 400, driverConstants.ERROR_CODES.SHIFT_INVALID_STATUS);
  }
  if (shift_type && ![driverConstants.MUNCH_CONSTANTS.DELIVERY_TYPES.STANDARD, driverConstants.MUNCH_CONSTANTS.DELIVERY_TYPES.BATCH].includes(shift_type)) {
    throw new AppError('Invalid shift type', 400, driverConstants.ERROR_CODES.SHIFT_INVALID_TYPE);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const shift = await Shift.findByPk(shiftId);
  if (!shift || shift.driver_id !== driverId) {
    throw new AppError('Shift not found or unauthorized', 404, driverConstants.ERROR_CODES.SHIFT_NOT_FOUND);
  }

  if (start_time && end_time) {
    const durationHours = (new Date(end_time) - new Date(start_time)) / (1000 * 60 * 60);
    if (durationHours < driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MIN_SHIFT_HOURS) {
      throw new AppError(
        `Shift duration must be at least ${driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MIN_SHIFT_HOURS} hours`,
        400,
        driverConstants.ERROR_CODES.SHIFT_INVALID_DURATION
      );
    }
    if (durationHours > driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MAX_SHIFT_HOURS) {
      throw new AppError(
        `Shift duration cannot exceed ${driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MAX_SHIFT_HOURS} hours`,
        400,
        driverConstants.ERROR_CODES.SHIFT_INVALID_DURATION
      );
    }
  }

  const transaction = await sequelize.transaction();
  try {
    const updates = { updated_at: new Date() };
    if (start_time) updates.start_time = start_time;
    if (end_time) updates.end_time = end_time;
    if (shift_type) updates.shift_type = shift_type;
    if (status) updates.status = status;

    await shift.update(updates, { transaction });

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'UPDATE_SHIFT',
        details: { driverId, shiftId, updates },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'update_shift',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'update_shift').points,
      { action: `Updated shift ${shiftId}` },
      transaction
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
        message: formatMessage(
          'driver',
          'shift',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          `shift.${status ? status : 'updated'}`,
          { shiftId }
        ),
        priority: 'MEDIUM',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'shift:updated', { driverId, shiftId, updates });

    await transaction.commit();
    logger.info('Shift updated', { driverId, shiftId });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Update shift failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function notifyHighDemand(driverId, { auditService, notificationService, socketService }) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const hotspots = await DeliveryHotspot.findAll({
    where: { totalDeliveries: { [Op.gte]: 50 } },
    limit: 5,
  });
  if (hotspots.length === 0) {
    throw new AppError('No high-demand areas found', 404, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }

  const transaction = await sequelize.transaction();
  try {
    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.HIGH_DEMAND,
        message: formatMessage(
          'driver',
          'shift',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'shift.high_demand',
          { areas: hotspots.map((h) => h.center?.address || 'Area').join(', ') }
        ),
        priority: 'HIGH',
      },
      { transaction }
    );

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'NOTIFY_HIGH_DEMAND',
        details: { driverId, hotspots: hotspots.map((h) => h.center?.address || 'Area') },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'shift:high_demand', { driverId, hotspots });

    await transaction.commit();
    logger.info('High-demand notification sent', { driverId });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`High-demand notification failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

module.exports = {
  createShift,
  getShiftDetails,
  updateShift,
  notifyHighDemand,
};