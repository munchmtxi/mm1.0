'use strict';

const { sequelize } = require('@models');
const branchMenuManagementService = require('@services/merchant/menu/branchMenuManagementService');
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

  if (action === 'menuAmended' && metadata.changeCount) {
    multipliers *= actionConfig.multipliers.changeCount * metadata.changeCount || 1;
  }
  if (action === 'menuViewed' && metadata.itemCount) {
    multipliers *= actionConfig.multipliers.itemCount * metadata.itemCount || 1;
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const amendBranchMenu = catchAsync(async (req, res) => {
  const { branchId } = req.params;
  const menuData = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await branchMenuManagementService.amendBranchMenu(branchId, menuData, ipAddress, transaction);
    const changeCount = result.addedCount + result.updatedCount + result.removedCount;
    const points = calculatePoints(result.action, { changeCount }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'branchMenu.menuAmended',
        messageParams: { branchId, changeCount },
        priority: 'MEDIUM',
        role: 'merchant',
        module: 'menu',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(req.user.id, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { changeCount },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'branchMenu.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'menu',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: req.user.id,
        role: 'merchant',
        action: 'menu_amended',
        details: {
          branchId,
          addedCount: result.addedCount,
          updatedCount: result.updatedCount,
          removedCount: result.removedCount,
          points,
        },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:menu:menuAmended', {
      branchId,
      merchantId: result.merchantId,
      addedCount: result.addedCount,
      updatedCount: result.updatedCount,
      removedCount: result.removedCount,
      points,
    }, `merchant:${result.merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const viewBranchMenu = catchAsync(async (req, res) => {
  const { branchId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await branchMenuManagementService.viewBranchMenu(branchId, ipAddress, transaction);
    const points = calculatePoints(result.action, { itemCount: result.itemCount }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'branchMenu.menuViewed',
        messageParams: { branchId, itemCount: result.itemCount },
        priority: 'LOW',
        role: 'merchant',
        module: 'menu',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(req.user.id, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { itemCount: result.itemCount },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'branchMenu.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'menu',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: req.user.id,
        role: 'merchant',
        action: 'menu_viewed',
        details: { branchId, itemCount: result.itemCount, categoryCount: result.categoryCount, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:menu:menuViewed', {
      branchId,
      merchantId: result.merchantId,
      itemCount: result.itemCount,
      points,
    }, `merchant:${result.merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { amendBranchMenu, viewBranchMenu };