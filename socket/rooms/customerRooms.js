'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { PROFILE } = require('@constants/customer/profileConstants');

const validRoles = ['customer', 'merchant', 'admin', 'driver', 'staff'];

const joinCustomerRooms = async (socket) => {
  const userId = socket.user.id;
  const role = socket.user.role;

  if (!validRoles.includes(role)) {
    throw new AppError('Invalid user role', 403, PROFILE.ERRORS.INVALID_ROLE);
  }

  logger.info('Joining customer rooms', { socketId: socket.id, userId, role });

  socket.join(`user:${userId}`);
  if (role === 'customer') {
    socket.join('role:customer');
  }

  logger.info('Customer rooms joined', { socketId: socket.id, userId, rooms: Array.from(socket.rooms) });
};

const leaveCustomerRooms = async (socket) => {
  const userId = socket.user.id;
  const role = socket.user.role;

  if (!validRoles.includes(role)) {
    throw new AppError('Invalid user role', 403, PROFILE.ERRORS.INVALID_ROLE);
  }

  logger.info('Leaving customer rooms', { socketId: socket.id, userId, role });

  socket.leave(`user:${userId}`);
  if (role === 'customer') {
    socket.leave('role:customer');
  }

  logger.info('Customer rooms left', { socketId: socket.id, userId, rooms: Array.from(socket.rooms) });
};

module.exports = {
  joinCustomerRooms,
  leaveCustomerRooms,
};