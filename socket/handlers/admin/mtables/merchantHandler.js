'use strict';

const merchantEvents = require('../events/merchantEvents');
const logger = require('@utils/logger');

function setupMerchantEvents(io, socket) {
  socket.on(merchantEvents.ONBOARDING_APPROVED, (data) => {
    logger.info('Merchant onboarding approved event received', { data });
    socket.emit(merchantEvents.ONBOARDING_APPROVED, data);
  });

  socket.on(merchantEvents.METADATA_UPDATED, (data) => {
      logger.info('Menu updated event received', { data });
    socket.emit(merchantEvents.METADATA_UPDATED, data);
  );

  socket.on(merchantEvents.RESERVATION__POLICIES_UPDATED, (data) => {
      logger.info('Reservation policies updated event received', { data });
      socket.emit(merchantEvents.RESERVATION__POLICIES_UPDATED, data);
  );

  socket.on(merchantEvents.PERFORMANCE_UPDATED, (data) => {
    logger.info('Performance updated event received', { data });
    socket.emit(merchantEvents.performance_updated', data);
  });
}

module.exports = {
  setupMerchantsEvents,
};