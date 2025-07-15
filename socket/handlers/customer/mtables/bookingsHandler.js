'use strict';

const socketService = require('@services/common/socketService');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');

module.exports = {
  handleBookingCreated(io, data, room, languageCode) {
    socketService.emit(io, customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], data, room, languageCode);
  },

  handleBookingUpdated(io, data, room, languageCode) {
    socketService.emit(io, customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[2], data, room, languageCode);
  },

  handleBookingCancelled(io, data, room, languageCode) {
    socketService.emit(io, customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], data, room, languageCode);
  },

  handleBookingCheckedIn(io, data, room, languageCode) {
    socketService.emit(io, customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[1], data, room, languageCode);
  },

  handleBookingFeedbackSubmitted(io, data, room, languageCode) {
    socketService.emit(io, customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[2], data, room, languageCode);
  },
};