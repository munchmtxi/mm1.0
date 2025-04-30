'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authEvents = require('../events/authEvents');
const rooms = require('../rooms');

const handleLogout = (io, socket, user, deviceId, clearAllDevices) => {
  try {
    const room = `role:${user.role}`;
    io.to(room).emit(authEvents.LOGOUT, {
      userId: user.id,
      role: user.role,
      deviceId,
      clearAllDevices,
      timestamp: new Date(),
      message: `User ${user.id} (${user.role}) logged out`,
    });
    logger.logSecurityEvent('Logout notification emitted', { userId: user.id, role: user.role });
  } catch (error) {
    logger.logErrorEvent('Failed to handle logout event', { error: error.message });
    throw new AppError('Failed to send logout notification', 500, 'SOCKET_ERROR');
  }
};

const setupLogoutHandlers = (io, socket) => {
  socket.on('auth:logout', async ({ deviceId, clearAllDevices }) => {
    logger.info('Received auth:logout event', { userId: socket.user.id, role: socket.user.role, deviceId });
    try {
      await rooms.authRooms.leaveAuthRooms(socket, socket.user.role);
      if (socket.user.role === 'merchant') {
        await rooms.merchantRooms.leaveMerchantRooms(socket);
      } else if (socket.user.role === 'customer') {
        await rooms.customerRooms.leaveCustomerRooms(socket);
        await rooms.subscriptionRooms.leaveSubscriptionRooms(socket);
      } else if (socket.user.role === 'driver') {
        await rooms.driverRooms.setupDriverRooms(socket, io).leaveDriverRoom(socket.user.id);
      } else if (socket.user.role === 'admin') {
        await rooms.adminRooms.leaveAdminRooms(socket);
      }
      handleLogout(io, socket, socket.user, deviceId, clearAllDevices);
      socket.disconnect();
    } catch (error) {
      logger.error('Logout failed', { error: error.message, userId: socket.user.id });
      socket.emit('error', { message: 'Logout failed', error: error.message });
    }
  });
};

module.exports = {
  handleLogout,
  setupLogoutHandlers,
};