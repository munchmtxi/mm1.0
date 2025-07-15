'use strict';

const socketService = require('@services/common/socketService');
const munchConstants = require('@constants/common/munchConstants');
const logger = require('@utils/logger');

const setupPromotionEvents = (io, socket) => {
  socket.on('merchant:munch:promotionCreated', (data) => {
    logger.info('Promotion created event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.PROMOTION_CREATED, data);
  });

  socket.on('merchant:munch:loyaltyUpdated', (data) => {
    logger.info('Loyalty program updated event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.LOYALTY_UPDATED, data);
  });

  socket.on('merchant:munch:pointsRedeemed', (data) => {
    logger.info('Points redeemed event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.REWARD_REDEMPTION, data);
  });
};

module.exports = { setupPromotionEvents };