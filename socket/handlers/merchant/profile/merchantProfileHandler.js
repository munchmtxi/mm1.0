'use strict';

const socketService = require('@services/common/socketService');
const merchantConstants = require('@constants/merchant/merchantConstants');
const logger = require('@utils/logger');

const setupMerchantProfileEvents = (io, socket) => {
  socket.on('merchant:profile:businessUpdated', (data) => {
    logger.info('Business updated event received', { data });
    socketService.emit(socket.id, merchantConstants.MERCHANT_PROFILE_CONSTANTS.NOTIFICATION_TYPES.BUSINESS_UPDATED, data);
  });

  socket.on('merchant:profile:countryUpdated', (data) => {
    logger.info('Country updated event received', { data });
    socketService.emit(socket.id, merchantConstants.MERCHANT_PROFILE_CONSTANTS.NOTIFICATION_TYPES.COUNTRY_UPDATED, data);
  });

  socket.on('merchant:profile:localizationUpdated', (data) => {
    logger.info('Localization updated event received', { data });
    socketService.emit(socket.id, merchantConstants.MERCHANT_PROFILE_CONSTANTS.NOTIFICATION_TYPES.LOCALIZATION_UPDATED, data);
  });

  socket.on('merchant:profile:pointsAwarded', (data) => {
    logger.info('Points awarded event received', { data });
    socketService.emit(socket.id, merchantConstants.MERCHANT_PROFILE_CONSTANTS.NOTIFICATION_TYPES.PROFILE_POINTS_AWARDED, data);
  });
};

module.exports = { setupMerchantProfileEvents };