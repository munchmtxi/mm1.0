'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { PROFILE } = require('@constants/customer/profileConstants');
const models = require('@models');

const validRoles = ['customer', 'merchant', 'admin', 'driver', 'staff'];

const joinCustomerRooms = async (socket) => {
  const userId = socket.user.id;
  const role = socket.user.role;
  logger.info('joinCustomerRooms called', { step: 'start', userId, role, socketId: socket.id });

  if (!validRoles.includes(role)) {
    logger.warn('Invalid user role in joinCustomerRooms', { userId, role });
    throw new AppError('Invalid user role', 403, PROFILE.ERRORS.INVALID_ROLE);
  }

  // Admins join all customer-related rooms
  if (socket.user.admin_access) {
    await socket.join('role:customer');
    logger.info('Admin joined role:customer room', { userId, socketId: socket.id });

    const customers = await models.Customer.findAll({ attributes: ['id', 'user_id'] });
    for (const customer of customers) {
      const userRoom = `user:${customer.user_id}`;
      const customerRoom = `customer:${customer.id}`;
      await socket.join([userRoom, customerRoom]);
      logger.info('Admin joined customer rooms', { userId, customerId: customer.id, rooms: [userRoom, customerRoom], socketId: socket.id });
    }

    const subscriptions = await models.Subscription.findAll({ attributes: ['id'] });
    for (const subscription of subscriptions) {
      const room = `subscription:${subscription.id}`;
      await socket.join(room);
      logger.info('Admin joined subscription room', { userId, subscriptionId: subscription.id, room, socketId: socket.id });
    }
    return;
  }

  // Non-admin logic
  await socket.join(`user:${userId}`);
  logger.info('Joined personal user room', { userId, room: `user:${userId}`, socketId: socket.id });

  if (role === 'customer') {
    await socket.join('role:customer');
    logger.info('Joined role:customer room', { userId, socketId: socket.id });

    const customer = await models.Customer.findOne({
      where: { user_id: userId, deleted_at: null },
      attributes: ['id'],
    });
    logger.info('Customer lookup in joinCustomerRooms', { userId, customerId: customer?.id });

    if (!customer) {
      logger.error('Customer not found in joinCustomerRooms', { userId });
      throw new AppError('Customer not found', 404, PROFILE.ERRORS.NOT_FOUND);
    }

    await socket.join(`customer:${customer.id}`);
    logger.info('Joined customer room', { userId, room: `customer:${customer.id}`, socketId: socket.id });

    const whereClause = { customer_id: customer.id, status: 'active', deleted_at: null };
    logger.info('Fetching active subscriptions in joinCustomerRooms', { userId, where: whereClause });
    const subscriptions = await models.Subscription.findAll({ where: whereClause, attributes: ['id'] });
    logger.info('Active subscriptions fetched', { userId, count: subscriptions.length, ids: subscriptions.map(s => s.id) });

    for (const subscription of subscriptions) {
      const room = `subscription:${subscription.id}`;
      await socket.join(room);
      logger.info('Customer joined subscription room in joinCustomerRooms', { userId, subscriptionId: subscription.id, room, socketId: socket.id });
    }
  }

  logger.info('joinCustomerRooms completed', { userId, currentRooms: Array.from(socket.rooms), socketId: socket.id });
};

const leaveCustomerRooms = async (socket) => {
  const userId = socket.user.id;
  const role = socket.user.role;
  logger.info('leaveCustomerRooms called', { step: 'start', userId, role, socketId: socket.id });

  if (!validRoles.includes(role)) {
    logger.warn('Invalid user role in leaveCustomerRooms', { userId, role });
    throw new AppError('Invalid user role', 403, PROFILE.ERRORS.INVALID_ROLE);
  }

  // Admins leave all customer-related rooms during adminRooms.leaveAdminRooms
  if (socket.user.admin_access) {
    return;
  }

  await socket.leave(`user:${userId}`);
  logger.info('Left personal user room', { userId, room: `user:${userId}`, socketId: socket.id });

  if (role === 'customer') {
    await socket.leave('role:customer');
    logger.info('Left role:customer room', { userId, socketId: socket.id });

    const customer = await models.Customer.findOne({
      where: { user_id: userId, deleted_at: null },
      attributes: ['id'],
    });
    logger.info('Customer lookup in leaveCustomerRooms', { userId, customerId: customer?.id });

    if (customer) {
      await socket.leave(`customer:${customer.id}`);
      logger.info('Left customer room', { userId, room: `customer:${customer.id}`, socketId: socket.id });

      const whereClause = { customer_id: customer.id, status: 'active', deleted_at: null };
      logger.info('Fetching subscriptions for leave in leaveCustomerRooms', { userId, where: whereClause });
      const subscriptions = await models.Subscription.findAll({ where: whereClause, attributes: ['id'] });
      logger.info('Subscriptions for leave fetched', { userId, count: subscriptions.length, ids: subscriptions.map(s => s.id) });

      for (const subscription of subscriptions) {
        const room = `subscription:${subscription.id}`;
        await socket.leave(room);
        logger.info('Customer left subscription room in leaveCustomerRooms', { userId, subscriptionId: subscription.id, room, socketId: socket.id });
      }
    }
  }

  logger.info('leaveCustomerRooms completed', { userId, currentRooms: Array.from(socket.rooms), socketId: socket.id });
};

module.exports = { joinCustomerRooms, leaveCustomerRooms };