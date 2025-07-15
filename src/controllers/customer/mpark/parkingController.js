'use strict';

const customerParkingService = require('@services/customer/mpark/customerParkingService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const locationService = require('@services/common/locationService');
const mapService = require('@services/common/mapService');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const customerConstants = require('@constants/customer/customerConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const localizationConstants = require('@constants/common/localizationConstants');

module.exports = {
  async listNearbyParking(req, res, next) {
    try {
      const { customerId, sessionToken } = req.user;
      const { latitude, longitude } = req.query;

      const location = await locationService.resolveLocation(
        { lat: parseFloat(latitude), lng: parseFloat(longitude) },
        customerId,
        sessionToken,
        'customer'
      );

      const spaces = await customerParkingService.listNearbyParking(customerId, location);

      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'mpark', req.user.preferred_language, 'parking.spaces_retrieved'),
        data: spaces,
      });
    } catch (error) {
      logger.logErrorEvent('Failed to list nearby parking', { error: error.message, customerId: req.user.customerId });
      next(new AppError(error.message, 400, mparkConstants.ERROR_TYPES[6], null, { customerId: req.user.customerId }));
    }
  },

  async getParkingLotDetails(req, res, next) {
    try {
      const { lotId } = req.params;
      const spaces = await customerParkingService.getParkingLotDetails(lotId);

      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'mpark', req.user.preferred_language, 'parking.lot_details_retrieved'),
        data: spaces,
      });
    } catch (error) {
      logger.logErrorEvent('Failed to retrieve parking lot details', { error: error.message, lotId: req.params.lotId });
      next(new AppError(error.message, 400, mparkConstants.ERROR_TYPES[6], null, { lotId: req.params.lotId }));
    }
  },

  async reserveParking(req, res, next) {
    try {
      const { customerId, sessionToken } = req.user;
      const { lotId, spaceId, duration, city } = req.body;

      const resolvedLocation = await locationService.resolveLocation({ address: city }, customerId, sessionToken, 'customer');
      if (!mparkConstants.PARKING_CONFIG.SUPPORTED_CITIES[resolvedLocation.countryCode]?.includes(resolvedLocation.city)) {
        throw new AppError(mparkConstants.ERROR_TYPES[6], 400, mparkConstants.ERROR_TYPES[6]);
      }

      const booking = await customerParkingService.reserveParking(customerId, lotId, spaceId, duration);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[0],
        details: { bookingId: booking.booking.id, lotId, spaceId },
        ipAddress: req.ip,
      });

      await pointService.awardPoints(customerId, 'parking_booked', 10, {
        io: req.io,
        role: 'customer',
        languageCode: req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
        walletId: req.user.walletId,
      });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'parking.booking_created',
        messageParams: { bookingId: booking.booking.id },
        role: 'customer',
        module: 'mpark',
        bookingId: booking.booking.id,
      });

      await socketService.emit(req.io, 'PARKING_BOOKING_CREATED', {
        userId: customerId,
        role: 'customer',
        auditAction: 'PARKING_BOOKING_CREATED',
        details: { bookingId: booking.booking.id, lotId, spaceId },
        booking,
      }, `customer:${customerId}`);

      res.status(201).json({
        success: true,
        message: formatMessage('customer', 'mpark', req.user.preferred_language, 'parking.booking_created', { bookingId: booking.booking.id }),
        data: booking,
      });
    } catch (error) {
      logger.logErrorEvent('Failed to reserve parking', { error: error.message, customerId: req.user.customerId });
      next(new AppError(error.message, 400, mparkConstants.ERROR_TYPES[0], null, { customerId: req.user.customerId }));
    }
  },

  async checkParkingAvailability(req, res, next) {
    try {
      const { lotId, date } = req.query;
      const spaces = await customerParkingService.checkParkingAvailability(lotId, date);

      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'mpark', req.user.preferred_language, 'parking.availability_retrieved'),
        data: spaces,
      });
    } catch (error) {
      logger.logErrorEvent('Failed to check parking availability', { error: error.message, lotId: req.query.lotId });
      next(new AppError(error.message, 400, mparkConstants.ERROR_TYPES[6], null, { lotId: req.query.lotId }));
    }
  },

  async manageParkingSubscription(req, res, next) {
    try {
      const { customerId } = req.user;
      const { action, plan } = req.body;

      const result = await customerParkingService.manageParkingSubscription(customerId, action, plan);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[0],
        details: { action, plan },
        ipAddress: req.ip,
      });

      await pointService.awardPoints(customerId, 'subscription_managed', 5, {
        io: req.io,
        role: 'customer',
        languageCode: req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
        walletId: req.user.walletId,
      });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: `parking.subscription_${action}`,
        messageParams: { plan },
        role: 'customer',
        module: 'mpark',
      });

      await socketService.emit(req.io, 'PARKING_SUBSCRIPTION_MANAGED', {
        userId: customerId,
        role: 'customer',
        auditAction: 'PARKING_SUBSCRIPTION_MANAGED',
        details: { action, plan },
      }, `customer:${customerId}`);

      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'mpark', req.user.preferred_language, `parking.subscription_${action}`, { plan }),
        data: result,
      });
    } catch (error) {
      logger.logErrorEvent('Failed to manage parking subscription', { error: error.message, customerId: req.user.customerId });
      next(new AppError(error.message, 400, customerConstants.ERROR_CODES[0], null, { customerId: req.user.customerId }));
    }
  },

  async getSubscriptionStatus(req, res, next) {
    try {
      const { customerId } = req.user;
      const result = await customerParkingService.getSubscriptionStatus(customerId);

      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'mpark', req.user.preferred_language, 'parking.subscription_status_retrieved'),
        data: result,
      });
    } catch (error) {
      logger.logErrorEvent('Failed to retrieve subscription status', { error: error.message, customerId: req.user.customerId });
      next(new AppError(error.message, 400, customerConstants.ERROR_CODES[0], null, { customerId: req.user.customerId }));
    }
  },
};