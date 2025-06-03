'use strict';

const socketService = require('@services/common/socketService');
const paymentSplitEvents = require('@socket/events/customer/payments/paymentSplitEvents');
const logger = require('@services/logger');

const handleSplitPayment = async (io, data, roomId) => {
  const { serviceId, serviceType, paymentId, amount, status, customerId } = data;
  await socketService.emit(io, paymentSplitEvents.SPLIT_PAYMENT_PROCESSED, { serviceId, serviceType, paymentId, amount, status, customerId }, roomId);
  logger.info('Split payment event emitted', { serviceId, paymentId, customerId });
};

const handleRefundProcessed = async (io, data, roomId) => {
  const { serviceId, serviceType, amount, status, customerId } = data;
  await socketService.emit(io, paymentSplitEvents.REFUND_PROCESSED, { serviceId, serviceType, amount, status, customerId }, roomId);
  logger.info('Refund processed event emitted', { serviceId, customerId, amount });
};

module.exports = { handleSplitPayment, handleRefundProcessed };