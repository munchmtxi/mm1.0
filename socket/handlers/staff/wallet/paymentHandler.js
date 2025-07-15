'use strict';

const socketService = require('@services/common/socketService');
const paymentEvents = require('@socket/events/staff/wallet/payment.events');
const logger = require('@utils/logger');

function setupPaymentHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(paymentEvents.SALARY_PROCESSED, (data) => {
      logger.info('Salary processed event received', { data });
      socketService.emit(`munch:payment:${data.staffId}`, paymentEvents.SALARY_PROCESSED, data);
    });

    socket.on(paymentEvents.BONUS_PROCESSED, (data) => {
      logger.info('Bonus processed event received', { data });
      socketService.emit(`munch:payment:${data.staffId}`, paymentEvents.BONUS_PROCESSED, data);
    });

    socket.on(paymentEvents.WITHDRAWAL_CONFIRMED, (data) => {
      logger.info('Withdrawal confirmed event received', { data });
      socketService.emit(`munch:payment:${data.staffId}`, paymentEvents.WITHDRAWAL_CONFIRMED, data);
    });

    socket.on(paymentEvents.AUDIT_LOGGED, (data) => {
      logger.info('Audit logged event received', { data });
      socketService.emit(`munch:payment:${data.staffId}`, paymentEvents.AUDIT_LOGGED, data);
    });

    socket.on(paymentEvents.ERROR_REPORTED, (data) => {
      logger.info('Error reported event received', { data });
      socketService.emit(`munch:payment:${data.staffId}`, paymentEvents.ERROR_REPORTED, data);
    });
  });
}

module.exports = { setupPaymentHandlers };