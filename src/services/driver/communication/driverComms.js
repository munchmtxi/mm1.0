'use strict';

const { Driver, Admin, Merchant, Staff, Customer, Message, Channel, Order, Ride, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const mtxiConstants = require('@constants/common/mtxiConstants');
const munchConstants = require('@constants/common/munchConstants');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function sendMessageToAdmin(driverId, content, priority = 'medium') {
  if (!driverConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.includes(priority)) {
    throw new AppError('Invalid priority level', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const admin = await Admin.findOne({
    where: { status: driverConstants.SUPPORT_CONSTANTS.DISPUTE_STATUSES.includes('active') ? 'active' : null },
  });
  if (!admin) {
    throw new AppError('No active admin found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const transaction = await sequelize.transaction();
  try {
    const message = await Message.create({
      sender_id: driver.id,
      receiver_id: admin.id,
      content,
      priority,
    }, { transaction });

    await transaction.commit();
    logger.info('Message sent to admin', { driverId, messageId: message.id, priority });
    return {
      messageId: message.id,
      driverId,
      receiverId: admin.id,
      content,
      priority,
      created_at: message.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('sendMessageToAdmin', error, driverConstants.ERROR_CODES.COMMUNICATE_WITH_DRIVER);
  }
}

async function sendMessageToMerchant(driverId, merchantId, orderId, content) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const order = await Order.findOne({
    where: { id: orderId, driver_id: driverId, status: { [Op.in]: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES } },
  });
  if (!order) {
    throw new AppError('Active order not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }

  const merchant = await Merchant.findByPk(merchantId);
  if (!merchant || merchant.id !== order.merchant_id) {
    throw new AppError('Merchant not found or not associated with order', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const transaction = await sequelize.transaction();
  try {
    const channel = await Channel.findOne({
      where: { branch_id: order.branch_id, type: 'team' },
      transaction,
    });
    if (!channel) {
      throw new AppError('Channel not found', 404, driverConstants.ERROR_CODES.COMMUNICATE_WITH_DRIVER);
    }

    const message = await Message.create({
      sender_id: driver.id,
      channel_id: channel.id,
      content,
    }, { transaction });

    await transaction.commit();
    logger.info('Message sent to merchant', { driverId, merchantId, orderId, messageId: message.id });
    return {
      messageId: message.id,
      driverId,
      merchantId,
      orderId,
      channelId: channel.id,
      content,
      created_at: message.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('sendMessageToMerchant', error, munchConstants.ERROR_CODES.COMMUNICATE_WITH_DRIVER);
  }
}

async function sendMessageToStaff(driverId, staffId, orderId, content) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const order = await Order.findOne({
    where: { id: orderId, driver_id: driverId, status: { [Op.in]: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES } },
  });
  if (!order) {
    throw new AppError('Active order not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }

  const staff = await Staff.findByPk(staffId);
  if (!staff || staff.merchant_id !== order.merchant_id || staff.branch_id !== order.branch_id) {
    throw new AppError('Staff not found or not associated with order', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const transaction = await sequelize.transaction();
  try {
    const message = await Message.create({
      sender_id: driver.id,
      receiver_id: staff.id,
      content,
    }, { transaction });

    await transaction.commit();
    logger.info('Message sent to staff', { driverId, staffId, orderId, messageId: message.id });
    return {
      messageId: message.id,
      driverId,
      staffId,
      orderId,
      content,
      created_at: message.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('sendMessageToStaff', error, munchConstants.ERROR_CODES.COMMUNICATE_WITH_DRIVER);
  }
}

async function sendMessageToCustomer(driverId, customerId, taskId, taskType, content) {
  if (!['order', 'ride'].includes(taskType)) {
    throw new AppError('Invalid task type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const customer = await Customer.findByPk(customerId);
  if (!customer) {
    throw new AppError('Customer not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  let task;
  if (taskType === 'order') {
    task = await Order.findOne({
      where: { id: taskId, driver_id: driverId, customer_id: customerId, status: { [Op.in]: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES } },
    });
  } else {
    task = await Ride.findOne({
      where: { id: taskId, driverId, customerId, status: { [Op.in]: mtxiConstants.RIDE_STATUSES } },
    });
  }
  if (!task) {
    throw new AppError(`Active ${taskType} not found`, 404, taskType === 'order' ? munchConstants.ERROR_CODES.ORDER_NOT_FOUND : mtxiConstants.ERROR_TYPES.RIDE_NOT_FOUND);
  }

  const transaction = await sequelize.transaction();
  try {
    const message = await Message.create({
      sender_id: driver.id,
      receiver_id: customer.id,
      content,
    }, { transaction });

    await transaction.commit();
    logger.info(`Message sent to customer for ${taskType}`, { driverId, customerId, taskId, messageId: message.id });
    return {
      messageId: message.id,
      driverId,
      customerId,
      taskId,
      taskType,
      content,
      created_at: message.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('sendMessageToCustomer', error, driverConstants.ERROR_CODES.COMMUNICATE_WITH_DRIVER);
  }
}

async function getMessageHistory(driverId, taskId, taskType) {
  if (!['order', 'ride', 'admin', 'merchant', 'staff'].includes(taskType)) {
    throw new AppError('Invalid task type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  let whereClause = { [Op.or]: [{ sender_id: driver.id }, { receiver_id: driver.id }] };
  if (taskType === 'order') {
    const order = await Order.findOne({
      where: { id: taskId, driver_id: driverId, status: { [Op.in]: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES } },
    });
    if (!order) {
      throw new AppError('Active order not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
    whereClause[Op.or].push({ channel_id: { [Op.in]: (await Channel.findAll({ where: { branch_id: order.branch_id } })).map(c => c.id) } });
  } else if (taskType === 'ride') {
    const ride = await Ride.findOne({
      where: { id: taskId, driverId, status: { [Op.in]: mtxiConstants.RIDE_STATUSES } },
    });
    if (!ride) {
      throw new AppError('Active ride not found', 404, mtxiConstants.ERROR_TYPES.RIDE_NOT_FOUND);
    }
  }

  try {
    const messages = await Message.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      include: [
        { model: Staff, as: 'sender', attributes: ['id', 'user_id'] },
        { model: Staff, as: 'receiver', attributes: ['id', 'user_id'] },
        { model: Channel, as: 'channel', attributes: ['id', 'name', 'type'] },
      ],
    });

    logger.info('Message history retrieved', { driverId, taskId, taskType });
    return messages.map(m => ({
      messageId: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      channelId: m.channel_id,
      content: m.content,
      priority: m.priority || 'medium',
      created_at: m.created_at,
    }));
  } catch (error) {
    throw handleServiceError('getMessageHistory', error, driverConstants.ERROR_CODES.COMMUNICATE_WITH_DRIVER);
  }
}

async function checkCommunicationEligibility(driverId, taskId, taskType) {
  if (!['order', 'ride'].includes(taskType)) {
    throw new AppError('Invalid task type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  let task;
  if (taskType === 'order') {
    task = await Order.findOne({
      where: { id: taskId, driver_id: driverId, status: { [Op.in]: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES } },
    });
  } else {
    task = await Ride.findOne({
      where: { id: taskId, driverId, status: { [Op.in]: mtxiConstants.RIDE_STATUSES } },
    });
  }

  const isEligible = !!task;
  logger.info('Communication eligibility checked', { driverId, taskId, taskType, isEligible });
  return {
    driverId,
    taskId,
    taskType,
    isEligible,
    reason: isEligible ? 'Active task found' : 'No active task found',
  };
}

module.exports = {
  sendMessageToAdmin,
  sendMessageToMerchant,
  sendMessageToStaff,
  sendMessageToCustomer,
  getMessageHistory,
  checkCommunicationEligibility,
};