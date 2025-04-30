'use strict';

const logger = require('@utils/logger');
const { Driver, Ride } = require('@models');
const AppError = require('@utils/AppError');
const { ERROR_CODES } = require('@constants/common/rideConstants');
const { handleLogin, handleLogout } = require('@socket/handlers');

let ioInstance = null;
const eventQueue = [];

const setIoInstance = (io) => {
  ioInstance = io;
  logger.info('Socket.IO instance set for socketService');
  while (eventQueue.length > 0) {
    const { rideId, driverIds, data } = eventQueue.shift();
    emitToNearbyDrivers(rideId, driverIds, data);
  }
};

const emitLoginNotification = (io, user, isGoogle = false) => {
  try {
    handleLogin(io, user, isGoogle);
  } catch (error) {
    logger.error('Socket notification failed', {
      error: error.message,
      userId: user.id,
      event: 'login',
    });
    throw new AppError('Failed to emit login notification', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const emitLogoutNotification = (io, user, deviceId, clearAllDevices) => {
  try {
    handleLogout(io, user, deviceId, clearAllDevices);
  } catch (error) {
    logger.error('Socket notification failed', {
      error: error.message,
      userId: user.id,
      event: 'logout',
    });
    throw new AppError('Failed to emit logout notification', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const emitToRoom = (room, event, data) => {
  try {
    if (!ioInstance) {
      logger.warn('Socket.IO instance not initialized, skipping room emission', { room, event, data });
      return;
    }
    ioInstance.to(room).emit(event, data);
    logger.info('Emitted to room', { room, event, data });
  } catch (error) {
    logger.error('Failed to emit to room', { error: error.message, room, event, data });
    throw new AppError('Failed to emit to room', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const emitToUser = (userId, event, data) => {
  try {
    const room = `customer:${userId}`;
    emitToRoom(room, event, data);
    logger.info('Emitted to user', { userId, event, data });
  } catch (error) {
    logger.error('Failed to emit to user', { error: error.message, userId, event, data });
    throw new AppError('Failed to emit to user', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const emitToNearbyDrivers = async (rideId, driverIds = [], data) => {
  try {
    if (!ioInstance) {
      logger.warn('Socket.IO instance not initialized, queuing driver notification', { rideId });
      eventQueue.push({ rideId, driverIds, data });
      return;
    }
    if (driverIds.length === 0) {
      ioInstance.to('drivers').emit('ride:requested', data);
      logger.info('Emitted to all drivers', { rideId, event: 'ride:requested', data });
    } else {
      const validDriverIds = [];
      for (const driverId of driverIds) {
        const driver = await Driver.findOne({ where: { id: driverId } });
        if (driver) {
          ioInstance.to(`driver:${driverId}`).emit('ride:requested', data);
          validDriverIds.push(driverId);
        } else {
          logger.warn('Invalid driver ID', { driverId, rideId });
        }
      }
      logger.info('Emitted to nearby drivers', { rideId, driverIds: validDriverIds, event: 'ride:requested', data });
    }
  } catch (error) {
    logger.error('Failed to emit to nearby drivers', { error: error.message, rideId, driverIds, data });
    throw new AppError('Failed to emit to drivers', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const sendDriverMessage = async (driverId, rideId, messageData) => {
  const { content } = messageData;
  if (!content || typeof content !== 'string' || content.length > 255) {
    logger.warn('Invalid message content', { rideId, driverId });
    throw new AppError('Message content must be a string up to 255 characters', 400, ERROR_CODES.INVALID_INPUT);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    logger.error('Driver not found', { driverId });
    throw new AppError('Driver not found', 404, ERROR_CODES.NOT_FOUND);
  }

  const ride = await Ride.findOne({
    where: { id: rideId, driver_id: driver.id, status: { [Op.in]: ['ASSIGNED', 'ARRIVED', 'STARTED'] } },
  });
  if (!ride) {
    logger.warn('Ride not found or not in valid state', { rideId, driverId });
    throw new AppError('Ride not found or not in valid state', 404, ERROR_CODES.NOT_FOUND);
  }

  const message = { content, sender: 'driver', senderId: driver.id, created_at: new Date() };
  emitToRoom(`ride:${rideId}`, 'ride:message', message);
  emitToRoom(`customer:${ride.customer_id}`, 'ride:message', message);

  logger.info('Driver message sent', { rideId, driverId });
  return message;
};

module.exports = {
  setIoInstance, 
  emitLoginNotification,
  emitLogoutNotification,
  emitToRoom,
  emitToUser,
  emitToNearbyDrivers,
  sendDriverMessage,
  get io() {
    return ioInstance;
  },
};