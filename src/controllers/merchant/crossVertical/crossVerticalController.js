'use strict';

const { sequelize } = require('@models');
const crossVerticalService = require('@services/merchant/crossVertical/crossVerticalService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const merchantConstants = require('@constants/merchant/merchantConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const calculatePoints = (action, metadata, role) => {
  const actionConfig = gamificationConstants.MERCHANT_ACTIONS.find((a) => a.action === action);
  if (!actionConfig) return 0;

  let points = actionConfig.basePoints;
  let multipliers = 1;

  if (action === 'servicesUnified' && metadata.branchCount) {
    multipliers *= actionConfig.multipliers.branchCount * metadata.branchCount || 1;
  }
  if (action === 'pointsSynced' && metadata.totalPoints) {
    multipliers *= actionConfig.multipliers.totalPoints * metadata.totalPoints || 1;
  }
  if (action === 'uiEnsured' && metadata.branchCount) {
    multipliers *= actionConfig.multipliers.branchCount * metadata.branchCount || 1;
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const unifyServices = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await crossVerticalService.unifyServices(merchantId, ipAddress, transaction);
    const branchCount = await MerchantBranch.count({ where: { merchant_id: merchantId }, transaction });
    const points = calculatePoints(result.action, { branchCount }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'crossVertical.servicesUnified',
        messageParams: { orders: result.orders, bookings: result.bookings },
        priority: 'HIGH',
        role: 'merchant',
        module: 'crossVertical',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(merchantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { branchCount },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: merchantId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'crossVertical.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'crossVertical',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: merchantId,
        role: 'merchant',
        action: 'unify_services',
        details: { merchantId, orders: result.orders, bookings: result.bookings, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:crossVertical:servicesUnified', { merchantId, orders: result.orders, bookings: result.bookings, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const syncLoyaltyPoints = catchAsync(async (req, res) => {
  const { customerId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await crossVerticalService.syncLoyaltyPoints(customerId, ipAddress, transaction);
    const points = calculatePoints(result.action, { totalPoints: result.totalPoints }, 'customer');

    await notificationService.sendNotification(
      {
        userId: customerId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'crossVertical.pointsSynced',
        messageParams: { totalPoints: result.totalPoints },
        priority: 'MEDIUM',
        role: 'customer',
        module: 'crossVertical',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(customerId, result.action, points, {
        io,
        role: 'customer',
        languageCode: result.language,
        metadata: { totalPoints: result.totalPoints },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: customerId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'crossVertical.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'customer',
          module: 'crossVertical',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: customerId,
        role: 'customer',
        action: 'sync_loyalty_points',
        details: { customerId, totalPoints: result.totalPoints, munchPoints: result.munchPoints, mtablesPoints: result.mtablesPoints, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:crossVertical:pointsSynced', { customerId, totalPoints: result.totalPoints, points }, `customer:${customerId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const ensureConsistentUI = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await crossVerticalService.ensureConsistentUI(merchantId, ipAddress, transaction);
    const branchCount = await MerchantBranch.count({ where: { merchant_id: merchantId }, transaction });
    const points = calculatePoints(result.action, { branchCount }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'crossVertical.uiEnsured',
        messageParams: { theme: result.uiSettings.theme },
        priority: 'LOW',
        role: 'merchant',
        module: 'crossVertical',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(merchantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { branchCount },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: merchantId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'crossVertical.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'crossVertical',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: merchantId,
        role: 'merchant',
        action: 'ensure_consistent_ui',
        details: { merchantId, uiSettings: result.uiSettings, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:crossVertical:uiEnsured', { merchantId, uiSettings: result.uiSettings, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { unifyServices, syncLoyaltyPoints, ensureConsistentUI };