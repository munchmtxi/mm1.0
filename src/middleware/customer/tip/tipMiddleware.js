'use strict';

/**
 * Middleware for customer tip endpoints
 */

const AppError = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');
const tipConstants = require('@constants/common/tipConstants');

module.exports = {
  validateTipCreation: async (req, res, next) => {
    const { rideId, orderId, bookingId, eventServiceId, inDiningOrderId, parkingBookingId } = req.body;
    const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    try {
      // Ensure only one service ID is provided
      const serviceIds = { rideId, orderId, bookingId, eventServiceId, inDiningOrderId, parkingBookingId };
      const provided = Object.values(serviceIds).filter(id => id);
      if (provided.length !== 1) {
        throw new AppError(
          formatMessage('customer', 'tip', languageCode, 'error.invalid_service'),
          400,
          tipConstants.ERROR_CODES.TIP_ACTION_FAILED
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  },
};