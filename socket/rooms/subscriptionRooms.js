'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { Subscription, Customer } = require('@models');

const joinSubscriptionRooms = async (socket) => {
  const userId = socket.user.id;
  const role = socket.user.role;
  logger.info('joinSubscriptionRooms called', { step: 'start', userId, role, socketId: socket.id });

  // Allow admins to join all subscription rooms
  if (socket.user.admin_access) {
    const subscriptions = await Subscription.findAll({ attributes: ['id'] });
    for (const subscription of subscriptions) {
      const room = `subscription:${subscription.id}`;
      await socket.join(room);
      logger.info('Admin joined subscription room', { userId, subscriptionId: subscription.id, room, socketId: socket.id });
    }
    logger.info('joinSubscriptionRooms completed for admin', { userId, totalJoined: subscriptions.length });
    return;
  }

  // Customer logic
  if (role !== 'customer') {
    logger.error('Unauthorized to join subscription rooms', { userId, role });
    throw new AppError('Unauthorized to join subscription rooms', 403, 'UNAUTHORIZED');
  }

  const customer = await Customer.findOne({
    where: { user_id: userId, deleted_at: null },
    attributes: ['id'],
  });
  logger.info('Customer lookup result', { userId, customerId: customer?.id });

  if (!customer) {
    logger.error('Customer not found in joinSubscriptionRooms', { userId });
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  const whereClause = { customer_id: customer.id, status: 'active', deleted_at: null };
  logger.info('Fetching subscriptions', { userId, where: whereClause });
  const subscriptions = await Subscription.findAll({ where: whereClause, attributes: ['id'] });
  logger.info('Subscriptions fetched', { userId, count: subscriptions.length, ids: subscriptions.map(s => s.id) });

  for (const subscription of subscriptions) {
    const room = `subscription:${subscription.id}`;
    await socket.join(room);
    logger.info('Customer joined subscription room', { userId, subscriptionId: subscription.id, room, socketId: socket.id });
  }
  logger.info('joinSubscriptionRooms completed', { userId, totalJoined: subscriptions.length });
};

const joinSubscriptionRoom = async (socket, subscriptionId, callback) => {
  const userId = socket.user.id;
  const role = socket.user.role;
  logger.info('joinSubscriptionRoom called', { step: 'start', userId, subscriptionId, socketId: socket.id });

  // Allow admins to join any subscription room
  if (socket.user.admin_access) {
    const subscription = await Subscription.findByPk(subscriptionId);
    if (!subscription) {
      logger.error('Subscription not found for admin', { userId, subscriptionId });
      throw new AppError('Subscription not found', 404, 'NOT_FOUND');
    }
    const room = `subscription:${subscriptionId}`;
    await socket.join(room);
    logger.info('Admin joined subscription room', { userId, subscriptionId, room, socketId: socket.id });
    if (callback) {
      callback({ success: true, room });
    }
    return;
  }

  // Customer logic
  if (role !== 'customer') {
    logger.error('Unauthorized to join subscription room', { userId, subscriptionId, role });
    throw new AppError('Unauthorized to join subscription room', 403, 'UNAUTHORIZED');
  }

  const customer = await Customer.findOne({
    where: { user_id: userId, deleted_at: null },
    attributes: ['id'],
  });
  logger.info('Customer lookup result', { userId, customerId: customer?.id });

  if (!customer) {
    logger.error('Customer not found in joinSubscriptionRoom', { userId });
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  const subscription = await Subscription.findOne({
    where: {
      id: subscriptionId,
      customer_id: customer.id,
      status: 'active',
      deleted_at: null,
    },
    attributes: ['id'],
  });
  logger.info('Subscription lookup result', { userId, subscriptionId, found: !!subscription });

  if (!subscription) {
    logger.error('Subscription not found or not accessible', { userId, subscriptionId });
    throw new AppError('Subscription not found or not accessible', 404, 'NOT_FOUND');
  }

  const room = `subscription:${subscriptionId}`;
  await socket.join(room);
  logger.info('Customer joined subscription room', { userId, subscriptionId, room, socketId: socket.id });
  if (callback) {
    callback({ success: true, room });
  }
};

const leaveSubscriptionRooms = async (socket) => {
  const userId = socket.user.id;
  const role = socket.user.role;
  logger.info('leaveSubscriptionRooms called', { step: 'start', userId, role, socketId: socket.id });

  // Admins leave rooms via adminRooms.leaveAdminRooms
  if (socket.user.admin_access) {
    return;
  }

  if (role !== 'customer') {
    logger.error('Unauthorized to leave subscription rooms', { userId, role });
    throw new AppError('Unauthorized to leave subscription rooms', 403, 'UNAUTHORIZED');
  }

  const customer = await Customer.findOne({
    where: { user_id: userId, deleted_at: null },
    attributes: ['id'],
  });
  logger.info('Customer lookup for leave', { userId, customerId: customer?.id });

  if (!customer) {
    logger.error('Customer not found in leaveSubscriptionRooms', { userId });
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  const whereClause = { customer_id: customer.id, status: 'active', deleted_at: null };
  logger.info('Fetching subscriptions to leave', { userId, where: whereClause });
  const subscriptions = await Subscription.findAll({ where: whereClause, attributes: ['id'] });
  logger.info('Subscriptions to leave fetched', { userId, count: subscriptions.length, ids: subscriptions.map(s => s.id) });

  for (const subscription of subscriptions) {
    const room = `subscription:${subscription.id}`;
    await socket.leave(room);
    logger.info('Customer left subscription room', { userId, subscriptionId: subscription.id, room, socketId: socket.id });
  }
  logger.info('leaveSubscriptionRooms completed', { userId, totalLeft: subscriptions.length });
};

module.exports = {
  joinSubscriptionRooms,
  joinSubscriptionRoom,
  leaveSubscriptionRooms,
};