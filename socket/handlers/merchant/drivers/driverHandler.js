'use strict';

const driverEvents = require('@socket/events/merchant/drivers/driverEvents');
const logger = require('@utils/logger');

function setupDriverHandlers(io, socket) {
  socket.on(driverEvents.DRIVER_MESSAGE_SENT, (data) => {
    logger.info('Driver message sent event received', { driverId: data.driverId });
    socket.to(`driver:${data.driverId}`).emit(driverEvents.DRIVER_MESSAGE_SENT, data);
  });

  socket.on(driverEvents.DELIVERY_UPDATE_BROADCAST, (data) => {
    logger.info('Delivery update broadcast event received', { orderId: data.orderId });
    socket.to(`driver:${data.driverId}`).emit(driverEvents.DELIVERY_UPDATE_BROADCAST, data);
  });

  socket.on(driverEvents.DRIVER_CHANNELS_UPDATED, (data) => {
    logger.info('Driver channels updated event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(driverEvents.DRIVER_CHANNELS_UPDATED, data);
  });
}

module.exports = { setupDriverHandlers };