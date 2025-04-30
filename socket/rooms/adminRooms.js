'use strict';

const { Merchant, MerchantBranch, Ride, Subscription, Customer, Driver, User } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

module.exports.joinAdminRooms = async (socket, userId) => {
  try {
    if (socket.user.role !== 'admin') {
      throw new AppError('Unauthorized to join admin rooms', 403, 'UNAUTHORIZED');
    }

    const adminRoom = `admin:${userId}`;
    await socket.join(adminRoom);
    logger.info('Admin joined admin room', { userId, room: adminRoom, socketId: socket.id });

    // Join all role rooms
    const roleRooms = ['role:admin', 'role:customer', 'role:driver', 'role:merchant', 'role:staff'];
    for (const room of roleRooms) {
      await socket.join(room);
      logger.info('Admin joined role room', { userId, room, socketId: socket.id });
    }

    // Join all merchant rooms
    const merchants = await Merchant.findAll({ attributes: ['id'] });
    for (const merchant of merchants) {
      const merchantRoom = `merchant-${merchant.id}`;
      await socket.join(merchantRoom);
      logger.info('Admin joined merchant room', { userId, merchantId: merchant.id, room: merchantRoom, socketId: socket.id });
    }

    // Join all branch rooms
    const branches = await MerchantBranch.findAll({ attributes: ['id'] });
    for (const branch of branches) {
      const branchRoom = `branch-${branch.id}`;
      await socket.join(branchRoom);
      logger.info('Admin joined branch room', { userId, branchId: branch.id, room: branchRoom, socketId: socket.id });
    }

    // Join all ride rooms
    const rides = await Ride.findAll({ attributes: ['id'] });
    for (const ride of rides) {
      const rideRoom = `ride:${ride.id}`;
      await socket.join(rideRoom);
      logger.info('Admin joined ride room', { userId, rideId: ride.id, room: rideRoom, socketId: socket.id });
    }

    // Join all subscription rooms
    const subscriptions = await Subscription.findAll({ attributes: ['id'] });
    for (const subscription of subscriptions) {
      const subscriptionRoom = `subscription:${subscription.id}`;
      await socket.join(subscriptionRoom);
      logger.info('Admin joined subscription room', { userId, subscriptionId: subscription.id, room: subscriptionRoom, socketId: socket.id });
    }

    // Join all user rooms
    const users = await User.findAll({ attributes: ['id'] });
    for (const user of users) {
      const userRoom = `user:${user.id}`;
      await socket.join(userRoom);
      logger.info('Admin joined user room', { userId, targetUserId: user.id, room: userRoom, socketId: socket.id });
    }

    // Join all customer rooms
    const customers = await Customer.findAll({ attributes: ['id'] });
    for (const customer of customers) {
      const customerRoom = `customer:${customer.id}`;
      await socket.join(customerRoom);
      logger.info('Admin joined customer room', { userId, customerId: customer.id, room: customerRoom, socketId: socket.id });
    }

    // Join all driver rooms
    const drivers = await Driver.findAll({ attributes: ['id'] });
    for (const driver of drivers) {
      const driverRoom = `driver:${driver.id}`;
      await socket.join(driverRoom);
      logger.info('Admin joined driver room', { userId, driverId: driver.id, room: driverRoom, socketId: socket.id });
    }

    socket.user.admin_access = true; // Flag for universal access
    logger.info('Admin rooms joined successfully', { userId, rooms: Array.from(socket.rooms), socketId: socket.id });
  } catch (error) {
    logger.error('Failed to join admin rooms', { userId, error: error.message, socketId: socket.id });
    throw error;
  }
};

module.exports.leaveAdminRooms = async (socket, userId) => {
  try {
    const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    for (const room of rooms) {
      await socket.leave(room);
      logger.info('Admin left room', { userId, room, socketId: socket.id });
    }
    logger.info('Admin rooms left successfully', { userId, socketId: socket.id });
  } catch (error) {
    logger.error('Failed to leave admin rooms', { userId, error: error.message, socketId: socket.id });
    throw error;
  }
};

// Admin-specific event handlers
module.exports.joinRideRoom = async (socket, rideId, callback) => {
  try {
    if (!socket.user.admin_access) {
      throw new AppError('Unauthorized to join ride room', 403, 'UNAUTHORIZED');
    }

    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      throw new AppError('Ride not found', 404, 'NOT_FOUND');
    }

    const room = `ride:${rideId}`;
    await socket.join(room);
    logger.info('Admin joined ride room', { socketId: socket.id, userId: socket.user.id, rideId, room });

    if (callback) {
      callback({ success: true, room });
    }
  } catch (error) {
    logger.error('Admin failed to join ride room', { socketId: socket.id, userId: socket.user.id, rideId, error: error.message });
    if (callback) {
      callback({ success: false, error: error.message });
    }
  }
};

module.exports.joinSubscriptionRoom = async (socket, subscriptionId, callback) => {
  try {
    if (!socket.user.admin_access) {
      throw new AppError('Unauthorized to join subscription room', 403, 'UNAUTHORIZED');
    }

    const subscription = await Subscription.findByPk(subscriptionId);
    if (!subscription) {
      throw new AppError('Subscription not found', 404, 'NOT_FOUND');
    }

    const room = `subscription:${subscriptionId}`;
    await socket.join(room);
    logger.info('Admin joined subscription room', { socketId: socket.id, userId: socket.user.id, subscriptionId, room });

    if (callback) {
      callback({ success: true, room });
    }
  } catch (error) {
    logger.error('Admin failed to join subscription room', { socketId: socket.id, userId: socket.user.id, subscriptionId, error: error.message });
    if (callback) {
      callback({ success: false, error: error.message });
    }
  }
};

module.exports.joinMerchantRoom = async (socket, merchantId, callback) => {
  try {
    if (!socket.user.admin_access) {
      throw new AppError('Unauthorized to join merchant room', 403, 'UNAUTHORIZED');
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'NOT_FOUND');
    }

    const room = `merchant-${merchantId}`;
    await socket.join(room);
    logger.info('Admin joined merchant room', { socketId: socket.id, userId: socket.user.id, merchantId, room });

    if (callback) {
      callback({ success: true, room });
    }
  } catch (error) {
    logger.error('Admin failed to join merchant room', { socketId: socket.id, userId: socket.user.id, merchantId, error: error.message });
    if (callback) {
      callback({ success: false, error: error.message });
    }
  }
};

module.exports.joinStaffRoom = async (socket, merchantId, callback) => {
  try {
    if (!socket.user.admin_access) {
      throw new AppError('Unauthorized to join staff room', 403, 'UNAUTHORIZED');
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'NOT_FOUND');
    }

    const room = `merchant:${merchantId}`;
    await socket.join(room);
    logger.info('Admin joined staff room', { socketId: socket.id, userId: socket.user.id, merchantId, room });

    if (callback) {
      callback({ success: true, room });
    }
  } catch (error) {
    logger.error('Admin failed to join staff room', { socketId: socket.id, userId: socket.user.id, merchantId, error: error.message });
    if (callback) {
      callback({ success: false, error: error.message });
    }
  }
};

module.exports.joinCustomerRoom = async (socket, customerId, callback) => {
  try {
    if (!socket.user.admin_access) {
      throw new AppError('Unauthorized to join customer room', 403, 'UNAUTHORIZED');
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    const rooms = [`customer:${customerId}`, `user:${customer.user_id}`];
    for (const room of rooms) {
      await socket.join(room);
      logger.info('Admin joined customer room', { socketId: socket.id, userId: socket.user.id, customerId, room });
    }

    if (callback) {
      callback({ success: true, rooms });
    }
  } catch (error) {
    logger.error('Admin failed to join customer room', { socketId: socket.id, userId: socket.user.id, customerId, error: error.message });
    if (callback) {
      callback({ success: false, error: error.message });
    }
  }
};

module.exports.joinDriverRoom = async (socket, driverId, callback) => {
  try {
    if (!socket.user.admin_access) {
      throw new AppError('Unauthorized to join driver room', 403, 'UNAUTHORIZED');
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404, 'NOT_FOUND');
    }

    const room = `driver:${driverId}`;
    await socket.join(room);
    logger.info('Admin joined driver room', { socketId: socket.id, userId: socket.user.id, driverId, room });

    if (callback) {
      callback({ success: true, room });
    }
  } catch (error) {
    logger.error('Admin failed to join driver room', { socketId: socket.id, userId: socket.user.id, driverId, error: error.message });
    if (callback) {
      callback({ success: false, error: error.message });
    }
  }
};