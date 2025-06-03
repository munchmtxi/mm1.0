'use strict';

/**
 * paymentEvents.js
 * Socket events for munch payment operations (staff role).
 * Events: payment:salary_processed, payment:bonus_processed, payment:withdrawal_confirmed,
 * payment:audit_logged, payment:error_reported.
 * Last Updated: May 26, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupPaymentEvents(io, socket) {
  socket.on('munch_payment:salary_processed', (data) => {
    try {
      socketService.emit(io, 'payment:salary_processed', {
        staffId: data.staffId,
        amount: data.amount,
        paymentId: data.paymentId,
      }, `munch:payment:${data.staffId}`);
      logger.info('Salary processed event emitted', data);
    } catch (error) {
      logger.error('Salary processed event failed', { error: error.message, data });
    }
  });

  socket.on('munch_payment:bonus_processed', (data) => {
    try {
      socketService.emit(io, 'payment:bonus_processed', {
        staffId: data.staffId,
        amount: data.amount,
        paymentId: data.paymentId,
      }, `munch:payment:${data.staffId}`);
      logger.info('Bonus processed event emitted', data);
    } catch (error) {
      logger.error('Bonus processed event failed', { error: error.message, data });
    }
  });

  socket.on('munch_payment:withdrawal_confirmed', (data) => {
    try {
      socketService.emit(io, 'payment:withdrawal_confirmed', {
        staffId: data.staffId,
        amount: data.amount,
        payoutId: data.payoutId,
      }, `munch:payment:${data.staffId}`);
      logger.info('Withdrawal confirmed event emitted', data);
    } catch (error) {
      logger.error('Withdrawal confirmed event failed', { error: error.message, data });
    }
  });

  socket.on('munch_payment:audit_logged', (data) => {
    try {
      socketService.emit(io, 'payment:audit_logged', {
        staffId: data.staffId,
        logs: data.logs,
      }, `munch:payment:${data.staffId}`);
      logger.info('Audit logged event emitted', data);
    } catch (error) {
      logger.error('Audit logged event failed', { error: error.message, data });
    }
  });

  socket.on('munch_payment:error_reported', (data) => {
    try {
      socketService.emit(io, 'payment:error_reported', {
        staffId: data.staffId,
        ticketId: data.ticketId,
      }, `munch:payment:${data.staffId}`);
      logger.info('Error reported event emitted', data);
    } catch (error) {
      logger.error('Error reported event failed', { error: error.message, data });
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch payment', { socketId: socket.id });
    setupPaymentEvents(io, socket);
  });
}

module.exports = { initialize };