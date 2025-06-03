'use strict';

const { sequelize } = require('@models');
const disputeService = require('@services/disputeService');
const notificationService = require('@services/common/notificationService');
const gamificationService = require('@services/common/gamificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization/localization');
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
    const message = formatMessage({
      role: 'customer',
      module: 'dispute',
      languageCode: customer.preferred_language,
      messageKey: 'dispute.created',
      params: { reference, issue },
    });
    await notificationService.createNotification(
      {
        userId: customerId,
        type: disputeConstants.NOTIFICATION_TYPES.DISPUTE_CREATED,
        message,
        priority: 'HIGH',
        languageCode: customer.preferred_language,
        disputeId: dispute.id,
      },
      transaction
    );

    // Log audit
    await auditService.logAction(
      {
        userId: customerId,
        logType: disputeConstants.AUDIT_TYPES.DISPUTE_CREATED,
        details: { serviceType, serviceId, disputeId: dispute.id, issue, issueType },
        ipAddress,
      },
      transaction
    );

    // Emit socket event
    await socketService.emit(io, `dispute:created:${customerId}`, {
      disputeId: dispute.id,
      serviceType,
      status: dispute.status,
    });

    // Award gamification points
    const action = disputeConstants.GAMIFICATION_ACTIONS.DISPUTE_CREATED;
    if (action) {
      try {
        await gamificationService.awardPoints(
          {
            userId: customerId,
            action: action.action,
            points: action.points || 10,
            metadata: { io, role: 'customer', serviceType, disputeId: dispute.id },
          },
          transaction
        );
      } catch (error) {
        gamificationError = { message: error.message };
      }
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
    return next(new AppError(error.message, 400, 'DISPUTE_CREATION_FAILED'));
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
      message: 'Dispute status retrieved successfully',
      data: dispute,
    });
  } catch (error) {
    logger.error('Dispute status tracking failed', { error: error.message, disputeId });
    return next(new AppError(error.message, 400, 'DISPUTE_NOT_FOUND'));
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
    const message = formatMessage({
      role: 'customer',
      module: 'dispute',
      languageCode: dispute.customer.preferred_language,
      messageKey: 'dispute.resolved',
      params: { resolution, resolutionType },
    });
    await notificationService.createNotification(
      {
        userId: dispute.customer_id,
        type: disputeConstants.NOTIFICATION_TYPES.DISPUTE_RESOLVED,
        message,
        priority: 'HIGH',
        languageCode: dispute.customer.preferred_language,
        disputeId: dispute.id,
      },
      transaction
    );

    // Log audit
    await auditService.logAction(
      {
        userId: resolverId,
        logType: disputeConstants.AUDIT_TYPES.DISPUTE_RESOLVED,
        details: { disputeId, serviceType: dispute.service_type, resolution, resolutionType },
        ipAddress,
      },
      transaction
    );

    // Emit socket event
    await socketService.emit(io, `dispute:resolved:${dispute.customer_id}`, {
      disputeId: dispute.id,
      status: dispute.status,
      resolution,
    });

    // Award gamification points
    const action = disputeConstants.GAMIFICATION_ACTIONS.DISPUTE_RESOLVED;
    if (action) {
      try {
        await gamificationService.awardPoints(
          {
            userId: dispute.customer_id,
            action: action.action,
            points: action.points || 10,
            metadata: { io, role: 'customer', serviceType: dispute.service_type, disputeId: dispute.id },
          },
          transaction
        );
      } catch (error) {
        gamificationError = { message: error.message };
      }
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
    return next(new AppError(error.message, 400, 'DISPUTE_RESOLUTION_FAILED'));
  }
});

module.exports = {
  createDispute,
  trackDisputeStatus,
  resolveDispute,
};