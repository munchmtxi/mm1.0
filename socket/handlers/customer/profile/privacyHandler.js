'use strict';

const socketService = require('@services/common/socketService');
const privacyEvents = require('@socket/events/customer/profile/privacy/privacyEvents');
const logger = require('@utils/logger');

const handleSetPrivacySettings = async (io, data, roomId) => {
  const { userId, settings } = data;
  await socketService.emit(io, privacyEvents.PRIVACY_SETTINGS_UPDATED, { userId, settings }, roomId);
  logger.info('Privacy settings updated event emitted', { userId });
};

const handleManageDataAccess = async (io, data, roomId) => {
  const { userId, permissions } = data;
  await socketService.emit(io, privacyEvents.DATA_ACCESS_UPDATED, { userId, permissions }, roomId);
  logger.info('Data access permissions updated event emitted', { userId });
};

module.exports = { handleSetPrivacySettings, handleManageDataAccess };