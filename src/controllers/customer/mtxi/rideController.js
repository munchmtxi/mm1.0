'use strict';

const rideService = require('@services/rideService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const locationService = require('@services/common/locationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const customerConstants = require('@constants/customer/customerConstants');
const customerGamificationConstants = require('@constants/customer/customerGamificationConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { sequelize } = require('@models');

module.exports = {
  async createRide(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, role, io } = req;
      const { pickupLocation, dropoffLocation, rideType, scheduledTime, friends } = req.body;
      const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

      if (role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'ride', languageCode, 'error.unauthorized'),
          403,
          customerGamificationConstants.ERROR_CODES[2]
        );
      }

      const resolvedPickup = await locationService.resolveLocation(pickupLocation, userId, req.sessionToken, 'customer', languageCode);
      const resolvedDropoff = await locationService.resolveLocation(dropoffLocation, userId, req.sessionToken, 'customer', languageCode);

      const ride = await rideService.createRide(
        {
          customerId: userId,
          pickupLocation: resolvedPickup,
          dropoffLocation: resolvedDropoff,
          rideType,
          scheduledTime,
          friends,
        },
        transaction
      );

      const action = rideType === 'shared' ? 'shared_ride_requested' : 'ride_requested';
      const actionConfig = customerGamificationConstants.GAMIFICATION_ACTIONS.mtxi.find(a => a.action === action);
      await pointService.awardPoints(userId, action, actionConfig.points, {
        io,
        role: 'customer',
        languageCode,
        walletId: req.body.walletId,
      });

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'ride.requested',
        messageParams: { reference: ride.reference },
        role: 'customer',
        module: 'ride',
        languageCode,
      });

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[0],
        details: { rideId: ride.id, reference: ride.reference },
        ipAddress: req.ip,
      });

      await socketService.emit(io, 'RIDE_REQUESTED', {
        userId,
        role: 'customer',
        auditAction: 'RIDE_REQUESTED',
        details: { rideId: ride.id, reference: ride.reference },
      }, `customer:${userId}`, languageCode);

      await transaction.commit();
      res.status(201).json({
        success: true,
        message: formatMessage('customer', 'ride', languageCode, 'success.ride_requested', { reference: ride.reference }),
        data: { rideId: ride.id, reference: ride.reference },
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Create ride failed', { error: error.message, userId: req.userId });
      next(error);
    }
  },

  async updateRideStatus(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, role, io } = req;
      const { rideId, status } = req.body;
      const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

      if (!['customer', 'driver'].includes(role)) {
        throw new AppError(
          formatMessage('customer', 'ride', languageCode, 'error.unauthorized'),
          403,
          customerGamificationConstants.ERROR_CODES[2]
        );
      }

      await rideService.updateRideStatus(rideId, status, transaction);

      const action = status === 'CANCELLED' ? 'RIDE_CANCELLED' : 'RIDE_UPDATED';
      await auditService.logAction({
        userId,
        role,
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === action),
        details: { rideId, status },
        ipAddress: req.ip,
      });

      await socketService.emit(io, action, {
        userId,
        role,
        auditAction: action,
        details: { rideId, status },
      }, `${role}:${userId}`, languageCode);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'ride', languageCode, `success.ride_${status.toLowerCase()}`),
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Update ride status failed', { error: error.message, userId: req.userId });
      next(error);
    }
  },

  async addFriendsToRide(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, role, io } = req;
      const { rideId, friends } = req.body;
      const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

      if (role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'ride', languageCode, 'error.unauthorized'),
          403,
          customerGamificationConstants.ERROR_CODES[2]
        );
      }

      await rideService.addFriendsToRide(rideId, friends, transaction);

      const actionConfig = customerGamificationConstants.GAMIFICATION_ACTIONS.mtxi.find(a => a.action === 'party_member_invited');
      await pointService.awardPoints(userId, 'party_member_invited', actionConfig.points, {
        io,
        role: 'customer',
        languageCode,
        walletId: req.body.walletId,
      });

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'FRIEND_INVITED'),
        details: { rideId, friends },
        ipAddress: req.ip,
      });

      await socketService.emit(io, 'FRIEND_INVITED', {
        userId,
        role: 'customer',
        auditAction: 'FRIEND_INVITED',
        details: { rideId, friends },
      }, `customer:${userId}`, languageCode);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'ride', languageCode, 'success.friends_added'),
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Add friends to ride failed', { error: error.message, userId: req.userId });
      next(error);
    }
  },

  async submitFeedback(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, role, io } = req;
      const { rideId, rating, comment } = req.body;
      const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

      if (role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'ride', languageCode, 'error.unauthorized'),
          403,
          customerGamificationConstants.ERROR_CODES[2]
        );
      }

      await rideService.submitFeedback(rideId, { rating, comment }, transaction);

      const actionConfig = customerGamificationConstants.GAMIFICATION_ACTIONS.mtxi.find(a => a.action === 'ride_review_submitted');
      await pointService.awardPoints(userId, 'ride_review_submitted', actionConfig.points, {
        io,
        role: 'customer',
        languageCode,
        walletId: req.body.walletId,
      });

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'FEEDBACK_SUBMITTED'),
        details: { rideId, rating },
        ipAddress: req.ip,
      });

      await socketService.emit(io, 'FEEDBACK_SUBMITTED', {
        userId,
        role: 'customer',
        auditAction: 'FEEDBACK_SUBMITTED',
        details: { rideId, rating },
      }, `customer:${userId}`, languageCode);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'ride', languageCode, 'success.feedback_submitted'),
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Submit feedback failed', { error: error.message, userId: req.userId });
      next(error);
    }
  },

  async getRideHistory(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, role } = req;
      const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

      if (role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'ride', languageCode, 'error.unauthorized'),
          403,
          customerGamificationConstants.ERROR_CODES[2]
        );
      }

      const rides = await rideService.getRideHistory(userId, transaction);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'RIDE_HISTORY_VIEWED'),
        details: { userId },
        ipAddress: req.ip,
      });

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'ride', languageCode, 'success.ride_history_retrieved'),
        data: rides,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Get ride history failed', { error: error.message, userId: req.userId });
      next(error);
    }
  },
};