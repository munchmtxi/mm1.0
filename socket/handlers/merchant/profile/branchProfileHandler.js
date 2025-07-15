'use strict';

const socketService = require('@services/common/socketService');
const merchantConstants = require('@constants/merchant/merchantConstants');
const logger = require('@utils/logger');

const setupBranchProfileEvents = (io, socket) => {
  socket.on('merchant:profile:branchUpdated', (data) => {
    logger.info('Branch updated event received', { data });
    socketService.emit(socket.id, merchantConstants.PROFILE_CONSTANTS.NOTIFICATION_TYPES.BRANCH_UPDATED, data);
  });

  socket.on('merchant:profile:settingsUpdated', (data) => {
    logger.info('Settings updated event received', { data });
    socketService.emit(socket.id, merchantConstants.PROFILE_CONSTANTS.NOTIFICATION_TYPES.SETTINGS_UPDATED, data);
  });

  socket.on('merchant:profile:mediaUploaded', (data) => {
    logger.info('Media uploaded event received', { data });
    socketService.emit(socket.id, merchantConstants.PROFILE_CONSTANTS.NOTIFICATION_TYPES.MEDIA_UPLOADED, data);
  });

  socket.on('merchant:profile:branchSynced', (data) => {
    logger.info('Branch synced event received', { data });
    socketService.emit(socket.id, merchantConstants.PROFILE_CONSTANTS.NOTIFICATION_TYPES.BRANCH_SYNCED, data);
  });
};

module.exports = { setupBranchProfileEvents };