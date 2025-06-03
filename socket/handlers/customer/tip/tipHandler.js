'use strict';

const tipEvents = require('@socket/events/customer/tip/tipEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

const handleTipSent = (io, data) => {
  const { tipId, customerId, recipientId, amount, currency } = data;
  socketService.emit(io, tipEvents.TIP_SENT, { tipId, customerId, amount, currency }, `customer:${recipientId}`);
  logger.info('Tip sent event emitted', { tipId, customerId, recipientId });
};

const handleTipUpdated = (io, data) => {
  const { tipId, customerId, amount, status } = data;
  socketService.emit(io, tipEvents.TIP_UPDATED, { tipId, customerId, amount, status }, `customer:${data.recipientId}`);
  logger.info('Tip updated event emitted', { tipId, customerId });
};

module.exports = { handleTipSent, handleTipUpdated };