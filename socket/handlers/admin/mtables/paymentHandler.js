'use strict';

const paymentEvents = require('@socket/events/admin/mtables/paymentEvents');
const logger = require('@utils/logger');

function setupPaymentEvents(io, socket) {
  socket.on(paymentEvents.PAYMENT_COMPLETED, (data) => {
    logger.info('Payment completed event received', { data });
    socket.emit(paymentEvents.PAYMENT_COMPLETED, data);
  });

  socket.on(paymentEvents.SPLIT_COMPLETED, (data) => {
    logger.info('Split payment completed event received', { data });
    socket.emit(paymentEvents.SPLIT_COMPLETED, data);
  });

  socket.on(paymentEvents.REFUNDED, (data) => {
    logger.info('Refund issued event received', { data });
    socket.emit(paymentEvents.REFUNDED, data);
  });
}

module.exports = {
  setupPaymentEvents,
};