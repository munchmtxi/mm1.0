'use strict';

const { Driver } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const setupDriverRooms = (socket, io) => {
  const joinDriverRoom = async () => {
    const userId = socket.user.id;
    const role = socket.user.role;

    // Allow admins to join any driver room
    if (socket.user.admin_access) {
      const driver = await Driver.findOne({ where: { user_id: userId } });
      if (!driver) {
        logger.error('Driver not found for admin', { userId });
        throw new AppError('Driver not found', 404, 'NOT_FOUND');
      }
      const room = `driver:${driver.id}`;
      await socket.join(room);
      logger.info('Admin joined driver room', { userId, driverId: driver.id, room, socketId: socket.id });
      return;
    }

    // Restrict to driver role
    if (role !== 'driver') {
      logger.error('Unauthorized to join driver room', { userId, role });
      throw new AppError('Unauthorized to join driver room', 403, 'UNAUTHORIZED');
    }

    const driver = await Driver.findOne({ where: { user_id: userId } });
    if (!driver) {
      logger.error('Driver not found or unauthorized', { userId });
      throw new AppError('Driver not found or unauthorized', 404, 'NOT_FOUND');
    }

    const room = `driver:${driver.id}`;
    await socket.join(room);
    logger.info('Driver joined driver room', { userId, driverId: driver.id, room, socketId: socket.id });
  };

  const leaveDriverRoom = async () => {
    const userId = socket.user.id;
    const driver = await Driver.findOne({ where: { user_id: userId } });
    if (!driver) {
      logger.error('Driver not found for leave room', { userId });
      return;
    }
    const room = `driver:${driver.id}`;
    await socket.leave(room);
    logger.info('User left driver room', { userId, driverId: driver.id, room, socketId: socket.id });
  };

  return { joinDriverRoom, leaveDriverRoom };
};

module.exports = { setupDriverRooms };