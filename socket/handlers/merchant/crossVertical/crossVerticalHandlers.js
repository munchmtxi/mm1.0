'use strict';

const crossVerticalEvents = require('@socket/events/merchant/crossVertical/crossVerticalEvents');
const logger = require('@utils/logger');

function setupCrossVerticalHandlers(io, socket) {
  socket.on(crossVerticalEvents.SERVICES_UNIFIED, (data) => {
    logger.info('Services unified event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(crossVerticalEvents.SERVICES_UNIFIED, data);
  });

  socket.on(crossVerticalEvents.POINTS_SYNCED, (data) => {
    logger.info('Points synced event received', { customerId: data.customerId });
    socket.to(`customer:${data.customerId}`).emit(crossVerticalEvents.POINTS_SYNCED, data);
  });

  socket.on(crossVerticalEvents.UI_ENSURED, (data) => {
    logger.info('UI ensured event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(crossVerticalEvents.UI_ENSURED, data);
  });
}

module.exports = { setupCrossVerticalHandlers };