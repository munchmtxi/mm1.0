'use strict';

const socketService = require('@services/common/socketService');
const munchConstants = require('@constants/common/munchConstants');
const logger = require('@utils/logger');

const setupAnalyticsEvents = (io, socket) => {
  socket.on('merchant:munch:orderTrends', (data) => {
    logger.info('Order trends event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.ORDER_TRENDS_UPDATED, data);
  });

  socket.on('merchant:munch:deliveryPerformance', (data) => {
    logger.info('Delivery performance event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.DELIVERY_PERFORMANCE_UPDATED, data);
  });

  socket.on('merchant:munch:customerInsights', (data) => {
    logger.info('Customer insights event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.CUSTOMER_INSIGHTS_UPDATED, data);
  });

  socket.on('merchant:munch:gamification', (data) => {
    logger.info('Gamification event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.GAMIFICATION_UPDATED, data);
  });

  socket.on('merchant:munch:deliveryLocations', (data) => {
    logger.info('Delivery locations event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.DELIVERY_LOCATIONS_UPDATED, data);
  });
};

module.exports = { setupAnalyticsEvents };