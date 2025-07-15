'use strict';

const { Ride, Customer, Driver, sequelize } = require('@models');
const driverConstants = require('@constants/driverConstants');
const rideConstants = require('@constants/common/rideConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function acceptRide(rideId, driverId, auditService, notificationService, socketService, pointService) {
  const ride = await Ride.findByPk(rideId, { include: [{ model: Customer, as: 'customer' }] });
  if (!ride) throw new AppError('Ride not found', 404, rideConstants.ERROR_CODES.RIDE_NOT_FOUND);
  if (ride.status !== rideConstants.RIDE_STATUSES.PENDING) {
    throw new AppError('Ride cannot be accepted', 400, rideConstants.ERROR_CODES.RIDE_NOT_CANCELLABLE);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver || driver.availability_status !== 'available') {
    throw new AppError('Driver unavailable', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const transaction = await sequelize.transaction();
  try {
    await ride.update(
      { status: rideConstants.RIDE_STATUSES.ACCEPTED, driverId, updated_at: new Date() },
      { transaction }
    );

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'ACCEPT_RIDE',
      details: { rideId, customerId: ride.customerId },
      ipAddress: 'unknown',
    });

    await notificationService.sendNotification({
      userId: ride.customer.user_id,
      notificationType: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RIDE_ACCEPTED,
      message: formatMessage(
        'customer',
        'ride',
        rideConstants.RIDE_SETTINGS.DEFAULT_LANGUAGE,
        'ride.accepted',
        { rideId }
      ),
      priority: 'HIGH',
    });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'ride_completion').action,
      languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emit(null, 'ride:accepted', { rideId, driverId, customerId: ride.customerId });

    await transaction.commit();
    logger.info('Ride accepted', { rideId, driverId });
    return ride;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Accept ride failed: ${error.message}`, 500, rideConstants.ERROR_CODES.RIDE_FAILED);
  }
}

async function getRideDetails(rideId, auditService, pointService) {
  const ride = await Ride.findByPk(rideId, {
    include: [{ model: Customer, as: 'customer', attributes: ['user_id', 'full_name', 'phone_number'] }],
  });
  if (!ride) throw new AppError('Ride not found', 404, rideConstants.ERROR_CODES.RIDE_NOT_FOUND);

  await auditService.logAction({
    userId: 'system',
    role: 'driver',
    action: 'GET_RIDE_DETAILS',
    details: { rideId },
    ipAddress: 'unknown',
  });

  await pointService.awardPoints({
    userId: 'system',
    role: 'driver',
    action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'ride_details_access').action,
    languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
  });

  logger.info('Ride details retrieved', { rideId });
  return {
    rideId: ride.id,
    customer: ride.customer,
    pickupLocation: ride.pickupLocation,
    dropoffLocation: ride.dropoffLocation,
    status: ride.status,
    rideType: ride.rideType,
    scheduledTime: ride.scheduledTime,
  };
}

async function updateRideStatus(rideId, status, driverId, auditService, notificationService, socketService, pointService) {
  const validStatuses = Object.values(rideConstants.RIDE_STATUSES);
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid status', 400, rideConstants.ERROR_CODES.INVALID_RIDE);
  }

  const ride = await Ride.findByPk(rideId);
  if (!ride) throw new AppError('Ride not found', 404, rideConstants.ERROR_CODES.RIDE_NOT_FOUND);
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  const transaction = await sequelize.transaction();
  try {
    await ride.update({ status, updated_at: new Date() }, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'UPDATE_RIDE_STATUS',
      details: { rideId, status },
      ipAddress: 'unknown',
    });

    await notificationService.sendNotification({
      userId: ride.customerId,
      notificationType: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RIDE_UPDATE,
      message: formatMessage(
        'customer',
        'ride',
        rideConstants.RIDE_SETTINGS.DEFAULT_LANGUAGE,
        'ride.status_updated',
        { rideId, status }
      ),
      priority: 'MEDIUM',
    });

    if (status === rideConstants.RIDE_STATUSES.COMPLETED) {
      await pointService.awardPoints({
        userId: driver.user_id,
        role: 'driver',
        action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'ride_completion').action,
        languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
      });
    }

    socketService.emit(null, 'ride:status_updated', { rideId, status, driverId });

    await transaction.commit();
    logger.info('Ride status updated', { rideId, status });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Update ride status failed: ${error.message}`, 500, rideConstants.ERROR_CODES.RIDE_FAILED);
  }
}

async function communicateWithPassenger(rideId, message, driverId, auditService, notificationService, socketService) {
  const ride = await Ride.findByPk(rideId);
  if (!ride) throw new AppError('Ride not found', 404, rideConstants.ERROR_CODES.RIDE_NOT_FOUND);
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  await auditService.logAction({
    userId: driverId.toString(),
    role: 'driver',
    action: 'CHAT_MESSAGE_SENT',
    details: { rideId, message },
    ipAddress: 'unknown',
  });

  await notificationService.sendNotification({
    userId: ride.customerId,
    notificationType: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RIDE_UPDATE,
    message: formatMessage(
      'customer',
      'ride',
      rideConstants.RIDE_SETTINGS.DEFAULT_LANGUAGE,
      'ride.message_received',
      { message }
    ),
    priority: 'HIGH',
  });

  socketService.emit(null, 'ride:message', {
    rideId,
    message,
    sender: 'driver',
    driverId,
    customerId: ride.customerId,
  });

  logger.info('Message sent to passenger', { rideId, driverId });
}

module.exports = {
  acceptRide,
  getRideDetails,
  updateRideStatus,
  communicateWithPassenger,
};