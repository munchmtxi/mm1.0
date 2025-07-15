'use strict';

const customerBookingService = require('@services/customer/mpark/customerBookingService');
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
  async createBooking(req, res, next) {
    try {
      const { customerId, sessionToken } = req.user;
      const { spaceId, bookingType, startTime, endTime, checkInMethod, vehicleDetails, city } = req.body;

      const resolvedLocation = await locationService.resolveLocation({ address: city }, customerId, sessionToken, 'customer');
      if (!mparkConstants.PARKING_CONFIG.SUPPORTED_CITIES[resolvedLocation.countryCode]?.includes(resolvedLocation.city)) {
        throw new AppError(mparkConstants.ERROR_TYPES[6], 400, mparkConstants.ERROR_TYPES[6]);
      }

      const booking = await customerBookingService.createBooking(customerId, {
        spaceId,
        bookingType,
        startTime,
        endTime,
        checkInMethod,
        vehicleDetails,
        merchantId: req.body.merchantId,
      });

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[0],
        details: { bookingId: booking.booking.id, city: resolvedLocation.city },
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
        details: { bookingId: booking.booking.id },
        booking,
      }, `customer:${customerId}`);

      res.status(201).json({
        success: true,
        message: formatMessage('customer', 'mpark', req.user.preferred_language, 'parking.booking_created', { bookingId: booking.booking.id }),
        data: booking,
      });
    } catch (error) {
      logger.logErrorEvent('Failed to create booking', { error: error.message, customerId: req.user.customerId });
      next(new AppError(error.message, 400, mparkConstants.ERROR_TYPES[9], null, { customerId: req.user.customerId }));
    }
  },

  async cancelBooking(req, res, next) {
    try {
      const { bookingId } = req.params;
      const result = await customerBookingService.cancelBooking(bookingId);

      await auditService.logAction({
        userId: req.user.customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[0],
        details: { bookingId },
        ipAddress: req.ip,
      });

      await notificationService.sendNotification({
        userId: req.user.customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'parking.booking_cancelled',
        messageParams: { bookingId },
        role: 'customer',
        module: 'mpark',
        bookingId,
      });

      await socketService.emit(req.io, 'PARKING_BOOKING_CANCELLED', {
        userId: req.user.customerId,
        role: 'customer',
        auditAction: 'PARKING_BOOKING_CANCELLED',
        details: { bookingId },
      }, `customer:${req.user.customerId}`);

      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'mpark', req.user.preferred_language, 'parking.booking_cancelled', { bookingId }),
        data: result,
      });
    } catch (error) {
      logger.logErrorEvent('Failed to cancel booking', { error: error.message, bookingId });
      next(new AppError(error.message, 400, mparkConstants.ERROR_TYPES[4], null, { bookingId }));
    }
  },

  async extendBooking(req, res, next) {
    try {
      const { bookingId } = req.params;
      const { duration } = req.body;
      const result = await customerBookingService.extendBooking(bookingId, duration);

      await auditService.logAction({
        userId: req.user.customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[0],
        details: { bookingId, duration },
        ipAddress: req.ip,
      });

      await pointService.awardPoints(req.user.customerId, 'parking_time_extended', 3, {
        io: req.io,
        role: 'customer',
        languageCode: req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
        walletId: req.user.walletId,
      });

      await notificationService.sendNotification({
        userId: req.user.customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'parking.time_extended',
        messageParams: { bookingId, duration },
        role: 'customer',
        module: 'mpark',
        bookingId,
      });

      await socketService.emit(req.io, 'PARKING_TIME_EXTENDED', {
        userId: req.user.customerId,
        role: 'customer',
        auditAction: 'PARKING_TIME_EXTENDED',
        details: { bookingId, duration },
      }, `customer:${req.user.customerId}`);

      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'mpark', req.user.preferred_language, 'parking.time_extended', { bookingId, duration }),
        data: result,
      });
    } catch (error) {
      logger.logErrorEvent('Failed to extend booking', { error: error.message, bookingId: req.params.bookingId });
      next(new AppError(error.message, 400, mparkConstants.ERROR_TYPES[5], null, { bookingId: req.params.bookingId }));
    }
  },

  async getCustomerBookings(req, res, next) {
    try {
      const { customerId } = req.user;
      const bookings = await customerBookingService.getCustomerBookings(customerId);

      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'mpark', req.user.preferred_language, 'parking.bookings_retrieved'),
        data: bookings,
      });
    } catch (error) {
      logger.logErrorEvent('Failed to retrieve bookings', { error: error.message, customerId: req.user.customerId });
      next(new AppError(error.message, 400, mparkConstants.ERROR_TYPES[9], null, { customerId: req.user.customerId }));
    }
  },

  async checkInBooking(req, res, next) {
    try {
      const { bookingId } = req.params;
      const { method, location } = req.body;
      const { customerId, sessionToken } = req.user;

      await locationService.validateGeofence(
        await locationService.resolveLocation(location, customerId, sessionToken, 'customer'),
        'customer',
        customerId
      );

      const result = await customerBookingService.checkInBooking(bookingId, method);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[0],
        details: { bookingId, method },
        ipAddress: req.ip,
      });

      await pointService.awardPoints(customerId, 'parking_check_in', 5, {
        io: req.io,
        role: 'customer',
        languageCode: req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
        walletId: req.user.walletId,
      });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'parking.checked_in',
        messageParams: { bookingId, method },
        role: 'customer',
        module: 'mpark',
        bookingId,
      });

      await socketService.emit(req.io, 'PARKING_CHECKED_IN', {
        userId: customerId,
        role: 'customer',
        auditAction: 'PARKING_CHECKED_IN',
        details: { bookingId, method },
      }, `customer:${customerId}`);

      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'mpark', req.user.preferred_language, 'parking.checked_in', { bookingId, method }),
        data: result,
      });
    } catch (error) {
      logger.logErrorEvent('Failed to check in booking', { error: error.message, bookingId: req.params.bookingId });
      next(new AppError(error.message, 400, mparkConstants.ERROR_TYPES[5], null, { bookingId: req.params.bookingId }));
    }
  },

  async searchAvailableParking(req, res, next) {
    try {
      const { city, type, date } = req.query;
      const { customerId, sessionToken } = req.user;

      const resolvedLocation = await locationService.resolveLocation({ address: city }, customerId, sessionToken, 'customer');
      if (!mparkConstants.PARKING_CONFIG.SUPPORTED_CITIES[resolvedLocation.countryCode]?.includes(resolvedLocation.city)) {
        throw new AppError(mparkConstants.ERROR_TYPES[6], 400, mparkConstants.ERROR_TYPES[6]);
      }

      const spaces = await customerBookingService.searchAvailableParking(resolvedLocation.city, type, date);

      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'mpark', req.user.preferred_language, 'parking.spaces_retrieved'),
        data: spaces,
      });
    } catch (error) {
      logger.logErrorEvent('Failed to search parking', { error: error.message, customerId: req.user.customerId });
      next(new AppError(error.message, 400, mparkConstants.ERROR_TYPES[6], null, { customerId: req.user.customerId }));
    }
  },

  async createSubscriptionBooking(req, res, next) {
    try {
      const { customerId, sessionToken } = req.user;
      const { subscriptionId, spaceId, bookingType, startTime, endTime, checkInMethod, vehicleDetails, city } = req.body;

      const resolvedLocation = await locationService.resolveLocation({ address: city }, customerId, sessionToken, 'customer');
      if (!mparkConstants.PARKING_CONFIG.SUPPORTED_CITIES[resolvedLocation.countryCode]?.includes(resolvedLocation.city)) {
        throw new AppError(mparkConstants.ERROR_TYPES[6], 400, mparkConstants.ERROR_TYPES[6]);
      }

      const booking = await customerBookingService.createSubscriptionBooking(customerId, subscriptionId, {
        spaceId,
        bookingType,
        startTime,
        endTime,
        checkInMethod,
        vehicleDetails,
        merchantId: req.body.merchantId,
      });

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[0],
        details: { bookingId: booking.booking.id, subscriptionId },
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
        details: { bookingId: booking.booking.id, subscriptionId },
        booking,
      }, `customer:${customerId}`);

      res.status(201).json({
        success: true,
        message: formatMessage('customer', 'mpark', req.user.preferred_language, 'parking.booking_created', { bookingId: booking.booking.id }),
        data: booking,
      });
    } catch (error) {
      logger.logErrorEvent('Failed to create subscription booking', { error: error.message, customerId: req.user.customerId });
      next(new AppError(error.message, 400, mparkConstants.ERROR_TYPES[9], null, { customerId: req.user.customerId }));
    }
  },
};