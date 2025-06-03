'use strict';

const socketService = require('@services/common/socketService');
const orderEvents = require('@socket/events/customer/munch/orderEvents');
const logger = require('@utils/logger');

const handleCartUpdated = async (io, data) => {
  const { cartId, customerId } = data;
  await socketService.emit(io, orderEvents.CART_UPDATED, { cartId, customerId }, `customer:${customerId}`);
  logger.info('Cart updated event emitted', { cartId, customerId });
};

const handleOrderConfirmed = async (io, data) => {
  const { orderId, status, customerId } = data;
  await socketService.emit(io, orderEvents.ORDER_CONFIRMED, { orderId, status, customerId }, `customer:${customerId}`);
  logger.info('Order confirmed event emitted', { orderId, customerId });
};

const handleOrderUpdated = async (io, data) => {
  const { orderId, status, customerId } = data;
  await socketService.emit(io, orderEvents.ORDER_UPDATED, { orderId, status, customerId }, `customer:${customerId}`);
  logger.info('Order updated event emitted', { orderId, customerId });
};

const handleOrderCancelled = async (io, data) => {
  const { orderId, status, customerId } = data;
  await socketService.emit(io, orderEvents.ORDER_CANCELLED, { orderId, status, customerId }, `customer:${customerId}`);
  logger.info('Order cancelled event emitted', { orderId, customerId });
};

module.exports = {
  handleCartUpdated,
  handleOrderConfirmed,
  handleOrderUpdated,
  handleOrderCancelled,
};