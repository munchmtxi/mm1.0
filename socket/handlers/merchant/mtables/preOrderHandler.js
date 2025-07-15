'use strict';

const socketService = require('@services/common/socketService');
const mTablesConstants = require('@constants/common/mTablesConstants');
const logger = require('@utils/logger');

const setupPreOrderEvents = (io, socket) => {
  socket.on('pre_order:created', (data) => {
    logger.info('Pre-order created event received', { data });
    socketService.emit(socket.id, mTablesConstants.NOTIFICATION_TYPES.PRE_ORDER_CONFIRMATION, data);
  });

  socket.on('payment:completed', (data) => {
    logger.info('Payment completed event received', { data });
    socketService.emit(socket.id, mTablesConstants.NOTIFICATION_TYPES.PAYMENT_COMPLETED, data);
  });

  socketService('feedback:submitted', (data) => {
    logger.info('Feedback submitted event', data });
    socketService.emit(socket.id, mTablesConstants.NOTIFICATION_TYPES.FEEDBACK_SUBMITTED, data);
  });
};

module.exports = { setupPreOrderEvents };