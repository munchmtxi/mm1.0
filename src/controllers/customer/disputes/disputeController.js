// src/controllers/customer/disputes/disputeController.js
'use strict';

/**
 * Controller for handling customer dispute operations.
 */

const { sequelize } = require('@models');
const disputeService = require('@services/disputeService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const disputeEvents = require('@socket/events/customer/disputes/disputeEvents');
const { formatMessage } = require('@utils/localizationService');
const disputeConstants = require('@constants/common/disputeConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const createDispute = catchAsync(async (req, res, next) => {
  const { serviceId, issue, issueType } = req.body;
  const customerId = req.user.id;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Creating dispute', { customerId, serviceId });

  const transaction = await sequelize.transaction();
  try {
    const { dispute, serviceType, reference, customer } = await disputeService.createDispute({
      customerId,
      serviceId,
      issue,
      issueType,
      transaction,
    });

    // Send notification
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: disputeConstants.NOTIFICATION_TYPES.DISPUTE_CREATED,
      messageKey: 'dispute.created',
      messageParams: { reference, issue },
      priority: disputeConstants.PRIORITY_LEVELS.HIGH,
      role: 'customer',
      module: 'dispute',
      languageCode: customer.preferred_language,
      data: { disputeId: dispute.id },
    });

    // Log audit
    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: disputeConstants.AUDIT_TYPES.DISPUTE_CREATED,
      details: { serviceType, serviceId, disputeId: dispute.id, issue, issueType },
      ipAddress,
    }, transaction);

    // Emit socket event
    await socketService.emit(io, disputeEvents.DISPUTE_CREATED, {
      disputeId: dispute.id,
      serviceType,
      status: dispute.status,
      userId: customerId,
      role: 'customer',
    }, `dispute:${customerId}`);

    // Award gamification points
    try {
      await pointService.awardPoints(customerId, 'dispute_created', 5, {
        io,
        role: 'customer',
        languageCode: customer.preferred_language,
        serviceType,
        disputeId: dispute.id,
      });
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(201).json({
      status: 'success',
      message: disputeConstants.SUCCESS_MESSAGES.DISPUTE_CREATED,
      data: { disputeId: dispute.id, serviceType, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Dispute creation failed', { error: error.message, customerId });
    return next(new AppError(error.message, error.statusCode || 400, error.code || 'DISPUTE_CREATION_FAILED'));
  }
});

const trackDisputeStatus = catchAsync(async (req, res, next) => {
  const { disputeId } = req.params;
  const customerId = req.user.id;

  logger.info('Tracking dispute status', { disputeId, customerId });

  try {
    const dispute = await disputeService.trackDisputeStatus({ disputeId, customerId });

    res.status(200).json({
      status: 'success',
      message: disputeConstants.SUCCESS_MESSAGES.DISPUTE_STATUS_RETRIEVED,
      data: dispute,
    });
  } catch (error) {
    logger.error('Dispute status tracking failed', { error: error.message, disputeId });
    return next(new AppError(error.message, error.statusCode || 400, error.code || 'DISPUTE_NOT_FOUND'));
  }
});

const resolveDispute = catchAsync(async (req, res, next) => {
  const { disputeId, resolution, resolutionType } = req.body;
  const resolverId = req.user.id;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Resolving dispute', { disputeId, resolverId });

  const transaction = await sequelize.transaction();
  try {
    const { dispute } = await disputeService.resolveDispute({
      disputeId,
      resolution,
      resolutionType,
      transaction,
    });

    // Send notification
    await notificationService.sendNotification({
      userId: dispute.customer_id,
      notificationType: disputeConstants.NOTIFICATION_TYPES.DISPUTE_RESOLVED,
      messageKey: 'dispute.resolved',
      messageParams: { resolution, resolutionType },
      priority: disputeConstants.PRIORITY_LEVELS.HIGH,
      role: 'customer',
      module: 'dispute',
      languageCode: dispute.customer.preferred_language,
      data: { disputeId: dispute.id },
    });

    // Log audit
    await auditService.logAction({
      userId: resolverId,
      role: req.user.role,
      action: disputeConstants.AUDIT_TYPES.DISPUTE_RESOLVED,
      details: { disputeId, serviceType: dispute.service_type, resolution, resolutionType },
      ipAddress,
    }, transaction);

    // Emit socket event
    await socketService.emit(io, disputeEvents.DISPUTE_RESOLVED, {
      disputeId: dispute.id,
      status: dispute.status,
      resolution,
      userId: dispute.customer_id,
      role: 'customer',
    }, `dispute:${dispute.customer_id}`);

    // Award gamification points
    try {
      await pointService.awardPoints(dispute.customer_id, 'dispute_resolved', 10, {
        io,
        role: 'customer',
        languageCode: dispute.customer.preferred_language,
        serviceType: dispute.service_type,
        disputeId: dispute.id,
      });
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: disputeConstants.SUCCESS_MESSAGES.DISPUTE_RESOLVED,
      data: { disputeId: dispute.id, status: dispute.status, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Dispute resolution failed', { error: error.message, disputeId });
    return next(new AppError(error.message, error.statusCode || 400, error.code || 'DISPUTE_RESOLUTION_FAILED'));
  }
});

const getParkingDisputes = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;

  logger.info('Retrieving parking disputes', { customerId });

  try {
    const disputes = await disputeService.getParkingDisputes({ customerId });

    res.status(200).json({
      status: 'success',
      message: disputeConstants.SUCCESS_MESSAGES.PARKING_DISPUTES_RETRIEVED,
      data: disputes,
    });
  } catch (error) {
    logger.error('Parking disputes retrieval failed', { error: error.message, customerId });
    return next(new AppError(error.message, error.statusCode || 400, error.code || 'PARKING_DISPUTES_NOT_FOUND'));
  }
});

const cancelParkingDispute = catchAsync(async (req, res, next) => {
  const { disputeId } = req.body;
  const customerId = req.user.id;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Cancelling parking dispute', { disputeId, customerId });

  const transaction = await sequelize.transaction();
  try {
    const { dispute } = await disputeService.cancelParkingDispute({ disputeId, customerId, transaction });

    // Send notification
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: disputeConstants.NOTIFICATION_TYPES.DISPUTE_CLOSED,
      messageKey: 'dispute.closed',
      messageParams: { disputeId },
      priority: disputeConstants.PRIORITY_LEVELS.MEDIUM,
      role: 'customer',
      module: 'dispute',
      languageCode: req.user.preferred_language,
      data: { disputeId: dispute.id },
    });

    // Log audit
    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: disputeConstants.AUDIT_TYPES.DISPUTE_CLOSED,
      details: { disputeId, serviceType: dispute.service_type },
      ipAddress,
    }, transaction);

    // Emit socket event
    await socketService.emit(io, disputeEvents.DISPUTE_UPDATED, {
      disputeId: dispute.id,
      status: dispute.status,
      userId: customerId,
      role: 'customer',
    }, `dispute:${customerId}`);

    // Award gamification points
    try {
      await pointService.awardPoints(customerId, 'parking_dispute_cancelled', 3, {
        io,
        role: 'customer',
        languageCode: req.user.preferred_language,
        serviceType: dispute.service_type,
        disputeId: dispute.id,
      });
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: disputeConstants.SUCCESS_MESSAGES.DISPUTE_CLOSED,
      data: { disputeId: dispute.id, status: dispute.status, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Parking dispute cancellation failed', { error: error.message, disputeId });
    return next(new AppError(error.message, error.statusCode || 400, error.code || 'DISPUTE_CANCELLATION_FAILED'));
  }
});

module.exports = {
  createDispute,
  trackDisputeStatus,
  resolveDispute,
  getParkingDisputes,
  cancelParkingDispute,
};