'use strict';

const bookingService = require('@services/customer/mtables/bookingService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const mapService = require('@services/common/mapService');
const auditService = require('@services/common/auditService');
const reviewConstants = require('@constants/common/reviewConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const customerConstants = require('@constants/customer/customerConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { sequelize } = require('@models');

const controller = {
  async createReservation(req, res, next) {
    const { io } = req;
    const { customerId, tableId, branchId, date, time, partySize, dietaryPreferences, specialRequests, seatingPreference } = req.body;
    const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    let transaction;
    try {
      transaction = await sequelize.transaction();
      const { booking, customer, table } = await bookingService.createReservation({
        customerId,
        tableId,
        branchId,
        date,
        time,
        partySize,
        dietaryPreferences,
        specialRequests,
        seatingPreference,
        transaction,
      });

      await pointService.awardPoints(customerId, gamificationConstants.GAMIFICATION_ACTIONS[0].action, gamificationConstants.GAMIFICATION_ACTIONS[0].points, {
        io,
        role: 'customer',
        languageCode,
        walletId: customer.wallet_id,
      });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'notifications.booking.created',
        messageParams: { reference: booking.reference },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1],
        languageCode,
      });

      await socketService.emit(io, customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], {
        userId: customerId,
        role: 'customer',
        auditAction: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[0],
        details: { bookingId: booking.id, tableId, branchId },
      }, `customer:${customerId}`, languageCode);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[0],
        details: { bookingId: booking.id, tableId, branchId, date, time, partySize },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      return res.status(201).json({
        success: true,
        message: formatMessage('customer', 'notifications', languageCode, 'booking.created', { reference: booking.reference }),
        data: { booking, table },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.logErrorEvent('Failed to create reservation', { error: error.message, customerId });
      return next(new AppError(error.message, 400, mtablesConstants.ERROR_TYPES[0]));
    }
  },

  async updateReservation(req, res, next) {
    const { io } = req;
    const { bookingId, date, time, partySize, dietaryPreferences, specialRequests, seatingPreference } = req.body;
    const customerId = req.user.id;
    const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    let transaction;
    try {
      transaction = await sequelize.transaction();
      const booking = await bookingService.updateReservation({
        bookingId,
        date,
        time,
        partySize,
        dietaryPreferences,
        specialRequests,
        seatingPreference,
        transaction,
      });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'notifications.booking.updated',
        messageParams: { reference: booking.reference },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1],
        languageCode,
      });

      await socketService.emit(io, customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[2], {
        userId: customerId,
        role: 'customer',
        auditAction: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[1],
        details: { bookingId, date, time, partySize },
      }, `customer:${customerId}`, languageCode);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[1],
        details: { bookingId, date, time, partySize },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      return res.status(200).json({
        success: true,
        message: formatMessage('customer', 'notifications', languageCode, 'booking.updated', { reference: booking.reference }),
        data: { booking },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.logErrorEvent('Failed to update reservation', { error: error.message, bookingId });
      return next(new AppError(error.message, 400, mtablesConstants.ERROR_TYPES[7]));
    }
  },

  async cancelBooking(req, res, next) {
    const { io } = req;
    const { bookingId } = req.params;
    const customerId = req.user.id;
    const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    let transaction;
    try {
      transaction = await sequelize.transaction();
      const { booking } = await bookingService.cancelBooking({ bookingId, transaction });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'notifications.booking.cancelled',
        messageParams: { reference: booking.reference },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1],
        languageCode,
      });

      await socketService.emit(io, customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], {
        userId: customerId,
        role: 'customer',
        auditAction: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[2],
        details: { bookingId },
      }, `customer:${customerId}`, languageCode);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[2],
        details: { bookingId },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      return res.status(200).json({
        success: true,
        message: formatMessage('customer', 'notifications', languageCode, 'booking.cancelled', { reference: booking.reference }),
        data: { booking },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.logErrorEvent('Failed to cancel booking', { error: error.message, bookingId });
      return next(new AppError(error.message, 400, mtablesConstants.ERROR_TYPES[7]));
    }
  },

  async processCheckIn(req, res, next) {
    const { io } = req;
    const { bookingId, qrCode, method, coordinates } = req.body;
    const customerId = req.user.id;
    const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    let transaction;
    try {
      transaction = await sequelize.transaction();
      const { booking } = await bookingService.processCheckIn({ bookingId, qrCode, method, coordinates, transaction });

      if (coordinates) {
        await mapService.updateEntityLocation(io, customerId, 'customer', coordinates, booking.branch.addressRecord.country_code);
      }

      await pointService.awardPoints(customerId, gamificationConstants.GAMIFICATION_ACTIONS[1].action, gamificationConstants.GAMIFICATION_ACTIONS[1].points, {
        io,
        role: 'customer',
        languageCode,
        walletId: req.user.wallet_id,
      });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[1],
        messageKey: 'notifications.booking.checked_in',
        messageParams: { reference: booking.reference },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1],
        languageCode,
      });

      await socketService.emit(io, customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[1], {
        userId: customerId,
        role: 'customer',
        auditAction: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[3],
        details: { bookingId, method },
      }, `customer:${customerId}`, languageCode);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[3],
        details: { bookingId, method, coordinates },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      return res.status(200).json({
        success: true,
        message: formatMessage('customer', 'notifications', languageCode, 'booking.checked_in', { reference: booking.reference }),
        data: { booking },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.logErrorEvent('Failed to process check-in', { error: error.message, bookingId });
      return next(new AppError(error.message, 400, mtablesConstants.ERROR_TYPES[14]));
    }
  },

  async getBookingHistory(req, res, next) {
    const customerId = req.user.id;
    const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    try {
      const bookings = await bookingService.getBookingHistory({ customerId });

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[6],
        details: { count: bookings.length },
        ipAddress: req.ip,
      });

      return res.status(200).json({
        success: true,
        message: formatMessage('customer', 'notifications', languageCode, 'booking.history_retrieved'),
        data: { bookings },
      });
    } catch (error) {
      logger.logErrorEvent('Failed to retrieve booking history', { error: error.message, customerId });
      return next(new AppError(error.message, 400, mtablesConstants.ERROR_TYPES[10]));
    }
  },

  async submitBookingFeedback(req, res, next) {
    const { io } = req;
    const { bookingId, rating, comment } = req.body;
    const customerId = req.user.id;
    const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    let transaction;
    try {
      transaction = await sequelize.transaction();
      const { feedback, booking } = await bookingService.submitBookingFeedback({ bookingId, rating, comment, transaction });

      if (rating < reviewConstants.REVIEW_SETTINGS.RATING_MIN_INT || rating > reviewConstants.REVIEW_SETTINGS.RATING_MAX_INT) {
        throw new Error(reviewConstants.ERROR_CODES[12]);
      }

      if (comment && comment.length > reviewConstants.REVIEW_SETTINGS.MAX_COMMENT_LENGTH) {
        throw new Error(reviewConstants.ERROR_CODES[14]);
      }

      await pointService.awardPoints(customerId, gamificationConstants.GAMIFICATION_ACTIONS[29].action, gamificationConstants.GAMIFICATION_ACTIONS[29].points, {
        io,
        role: 'customer',
        languageCode,
        walletId: req.user.wallet_id,
      });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[2],
        messageKey: 'notifications.booking.feedback_submitted',
        messageParams: { reference: booking.reference },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1],
        languageCode,
      });

      await socketService.emit(io, customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[2], {
        userId: customerId,
        role: 'customer',
        auditAction: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[4],
        details: { bookingId, rating },
      }, `customer:${customerId}`, languageCode);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[4],
        details: { bookingId, rating, comment },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      return res.status(201).json({
        success: true,
        message: formatMessage('customer', 'notifications', languageCode, 'booking.feedback_submitted', { reference: booking.reference }),
        data: { feedback },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.logErrorEvent('Failed to submit feedback', { error: error.message, bookingId });
      return next(new AppError(error.message, 400, mtablesConstants.ERROR_TYPES[20]));
    }
  },
};

module.exports = controller;