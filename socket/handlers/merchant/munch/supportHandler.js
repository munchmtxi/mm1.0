'use strict';

const socketService = require('@services/common/socketService');
const munchConstants = require('@constants/common/munchConstants');
const logger = require('@utils/logger');

const setupSupportEvents = (io, socket) => {
  socket.on('merchant:munch:ticketCreated', (data) => {
    logger.info('Ticket created event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.INQUIRY_SUBMITTED, data);
  });

  socket.on('merchant:munch:disputeResolved', (data) => {
    logger.info('Dispute resolved event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.DISPUTE_RESOLVED, data);
  });

  socket.on('merchant:munch:policiesShared', (data) => {
    logger.info('Policies shared event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.ORDER_POLICIES, data);
  });
};

module.exports = { setupSupportEvents };