'use strict';

const { sequelize } = require('@models');
const customerSegmentationService = require('@services/merchant/crm/customerSegmentationService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const merchantConstants = require('@constants/merchantConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const calculatePoints = (action, metadata, role = 'merchant') => {
  const actionConfig = gamificationConstants.MERCHANT_ACTIONS.find((a) => a.action === action);
  if (!actionConfig) return 0;

  let points = actionConfig.basePoints;
  let multipliers = 1;

  if (action === 'customersSegmented' && metadata.segmentCount) {
    multipliers *= actionConfig.multipliers.segmentCount * metadata.segmentCount || 1;
  }
  if (action === 'behaviorAnalyzed' && metadata.engagementScore) {
    multipliers *= actionConfig.multipliers.engagementScore * metadata.engagementScore || 1;
  }
  if (action === 'offersTargeted' && metadata.segmentSize) {
    multipliers *= actionConfig.multipliers.segmentSize * metadata.segmentSize || 1;
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const segmentCustomers = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const { criteria } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await customerSegmentationService.segmentCustomers(merchantId, criteria, ipAddress, transaction);
    const segmentCount = Object.values(result.segmentCounts).reduce((sum, count) => sum + count, 0);
    const points = calculatePoints(result.action, { segmentCount }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'crm.customersSegmented',
        messageParams: { segmentCount },
        priority: 'MEDIUM',
        role: 'merchant',
        module: 'crm',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(merchantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { segmentCount },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: merchantId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'crm.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'crm',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: merchantId,
        role: 'merchant',
        action: 'segment_customers',
        details: { merchantId, criteria, segmentCounts: result.segmentCounts, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:crm:customersSegmented', { merchantId, segmentCounts: result.segmentCounts, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const analyzeBehavior = catchAsync(async (req, res) => {
  const { merchantId, customerId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await customerSegmentationService.analyzeBehavior(merchantId, customerId, ipAddress, transaction);
    const engagementScore = (result.trends.orderFrequency + result.trends.bookingFrequency) / 2;
    const points = calculatePoints(result.action, { engagementScore }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'crm.behaviorAnalyzed',
        messageParams: { customerId },
        priority: 'MEDIUM',
        role: 'merchant',
        module: 'crm',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(merchantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { engagementScore },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: merchantId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'crm.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'crm',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: merchantId,
        role: 'merchant',
        action: 'analyze_behavior',
        details: { merchantId, customerId, trends: result.trends, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:crm:behaviorAnalyzed', { merchantId, customerId, trends: result.trends, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const targetOffers = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const { segmentId } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await customerSegmentationService.targetOffers(merchantId, segmentId, ipAddress, transaction);
    const segmentSize = (await Customer.count({ where: { merchant_id: merchantId }, transaction })) / 3; // Approximation
    const points = calculatePoints(result.action, { segmentSize }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'crm.offersTargeted',
        messageParams: { segment: segmentId },
        priority: 'MEDIUM',
        role: 'merchant',
        module: 'crm',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(merchantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { segmentSize },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: merchantId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'crm.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'crm',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: merchantId,
        role: 'merchant',
        action: 'target_offers',
        details: { merchantId, segmentId, promotionId: result.promotionId, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:crm:offersTargeted', { merchantId, segmentId, promotionId: result.promotionId, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { segmentCustomers, analyzeBehavior, targetOffers };