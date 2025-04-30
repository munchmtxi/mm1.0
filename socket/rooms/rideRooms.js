'use strict';

const { Ride, Customer, Driver } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { sequelize } = require('@models');
const { RIDE_STATUSES } = require('@constants/common/rideConstants');

const joinRideRoom = async (socket, rideId) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = socket.user.id;
    const role = socket.user.role;

    const ride = await Ride.findByPk(rideId, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'user_id'] },
        { model: Driver, as: 'driver', attributes: ['id', 'user_id'] },
      ],
      transaction,
    });
    if (!ride) {
      throw new AppError('Ride not found', 404, 'NOT_FOUND');
    }

    if (![RIDE_STATUSES.REQUESTED, RIDE_STATUSES.SCHEDULED, RIDE_STATUSES.ASSIGNED, RIDE_STATUSES.ARRIVED, RIDE_STATUSES.STARTED].includes(ride.status)) {
      throw new AppError('Cannot join inactive ride', 400, 'INVALID_STATUS');
    }

    if (socket.user.admin_access) {
      const room = `ride:${rideId}`;
      await socket.join(room);
      logger.info('Admin joined ride room', { userId, rideId, room, socketId: socket.id, rideStatus: ride.status });
      await transaction.commit();
      return;
    }

    if (!['customer', 'driver'].includes(role)) {
      throw new AppError('Unauthorized to join ride room', 403, 'UNAUTHORIZED');
    }

    if (role === 'customer' && ride.customer.user_id !== userId) {
      throw new AppError('User not associated with this ride', 403, 'UNAUTHORIZED');
    }

    if (role === 'driver') {
      if (!ride.driver || ride.driver.user_id !== userId) {
        throw new AppError('User not associated with this ride', 403, 'UNAUTHORIZED');
      }
    }

    const room = `ride:${rideId}`;
    await socket.join(room);
    logger.info('User joined ride room', { userId, rideId, role, room, socketId: socket.id, rideStatus: ride.status });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const leaveRideRoom = async (socket, rideId) => {
  const userId = socket.user.id;
  const room = `ride:${rideId}`;
  await socket.leave(room);
  logger.info('User left ride room', { userId, rideId, room, socketId: socket.id });
};

module.exports = { joinRideRoom, leaveRideRoom };
