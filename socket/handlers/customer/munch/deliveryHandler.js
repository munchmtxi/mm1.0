'use strict';

const socketService = require('@services/common/socketService');
const deliveryEvents = require('@socket/events/customer/munch/deliveryEvents');
const logger = require('@utils/logger');

const handleDeliveryTracked = async (io, data) => {
  const { orderId, status, customerId } = data;
  await socketService.emit(io, deliveryEvents.DELIVERY_TRACKED, { orderId, status, customerId }, `customer:${customerId}`);
  logger.info('Delivery tracked event emitted', { orderId, customerId });
};

const handleDeliveryCancelled = async (io, data) => {
  const { orderId, status, customerId } = data;
  await socketService.emit(io, deliveryEvents.DELIVERY_CANCELLED, { orderId, status, customerId }, `customer:${customerId}`);
  logger.info('Delivery cancelled event emitted', { orderId, customerId });
};

const handleDriverCommunicated = async (io, data) => {
  const { orderId, message, customerId } = data;
  const order = await Order.findByPk(orderId);
  await socketService.emit(io, deliveryEvents.DRIVER_COMMUNICATED, { orderId, message, customerId }, `driver:${order.driver_id}`);
  logger.info('Driver communicated event emitted', { orderId, customerId });
};

module.exports = {
  handleDeliveryTracked,
  handleDeliveryCancelled,
  handleDriverCommunicated,
};