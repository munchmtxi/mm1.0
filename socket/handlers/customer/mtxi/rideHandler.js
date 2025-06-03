'use strict';

const rideEvents = require('@events/customer/mtxi/rideEvents');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization/localization');
const logger = require('@utils/logger');

async function initializeRideHandler() {
  try {
    socketService.on(rideEvents.RIDE_BOOKED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ride_update,
        message: formatMessage('ride_booked', { reference: data.reference }),
      });
    });

    socketService.on(rideEvents.RIDE_UPDATED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ride_update,
        message: formatMessage('ride_updated', { rideId: data.rideId }),
      });
    });

    socketService.on(rideEvents.RIDE_CANCELLED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ride_update,
        message: formatMessage('ride_cancelled', { rideId: data.rideId }),
      });
    });

    socketService.on(rideEvents.RIDE_CHECK_IN, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ride_update,
        message: formatMessage('ride_check_in', { rideId: data.rideId }),
      });
    });

    socketService.on(rideEvents.FEEDBACK_SUBMITTED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.feedback_confirmation,
        message: formatMessage('feedback_submitted', { rideId: data.rideId }),
      });
    });

    socketService.on(rideEvents.FRIEND_INVITED, async (data) => {
      await notificationService.sendNotification({
        userId: data.friendCustomerId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.friend_request,
        message: formatMessage('friend_invite', { rideId: data.rideId }),
      });
    });

    socketService.on(rideEvents.BILL_SPLIT_PROCESSED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.payment_confirmation,
        message: formatMessage('bill_split_processed', { rideId: data.rideId }),
      });
    });

    logger.info('Ride event handlers initialized');
  } catch (error) {
    logger.error('Failed to initialize ride handlers', { error: error.message });
    throw error;
  }
}

module.exports = { initializeRideHandler };