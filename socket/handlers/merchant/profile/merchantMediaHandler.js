'use strict';

const socketService = require('@services/common/socketService');
const merchantConstants = require('@constants/merchant/merchantConstants');
const logger = require('@utils/logger');

const setupMerchantMediaEvents = (io, socket) => {
  socket.on('merchant:profile:menuUploaded', (data) => {
    logger.info('Menu uploaded event received', { data });
    socketService.emit(socket.id, merchantConstants.MEDIA_CONSTANTS.NOTIFICATION_TYPES.MENU_UPLOADED, data);
  });

  socket.on('merchant:profile:promoUploaded', (data) => {
    logger.info('Promo uploaded event received', { data });
    socketService.emit(socket.id, merchantConstants.MEDIA_CONSTANTS.NOTIFICATION_TYPES.PROMO_UPLOADED, data);
  });

  socket.on('merchant:profile:mediaUpdated', (data) => {
    logger.info('Media updated event received', { data });
    socketService.emit(socket.id, merchantConstants.MEDIA_CONSTANTS.NOTIFICATION_TYPES.MEDIA_UPDATED, data);
  });

  socket.on('merchant:profile:mediaDeleted', (data) => {
    logger.info('Media deleted event received', { data });
    socketService.emit(socket.id, merchantConstants.MEDIA_CONSTANTS.NOTIFICATION_TYPES.MEDIA_DELETED, data);
  });
};

module.exports = { setupMerchantMediaEvents };