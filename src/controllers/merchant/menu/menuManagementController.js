'use strict';

const { sequelize } = require('@models');
const menuManagementService = require('@services/merchant/menu/menuManagementService');
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

  if (action === 'menuCreated' && metadata.itemCount) {
    multipliers *= actionConfig.multipliers.itemCount * metadata.itemCount || 1;
  }
  if (action === 'menuUpdated' && metadata.updateCount) {
    multipliers *= actionConfig.multipliers.updateCount || 1;
  }
  if (action === 'dynamicPricingApplied' && metadata.promotionValue) {
    multipliers *= actionConfig.multipliers.promotionValue * metadata.promotionValue || 1;
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const createMenu = catchAsync(async (req, res) => {
  const { restaurantId } = req.params;
  const menuData = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await menuManagementService.createMenu(restaurantId, menuData, ipAddress, transaction);
    const points = calculatePoints(result.action, { itemCount: result.itemCount }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'menu.menuCreated',
        messageParams: { itemCount: result.itemCount },
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
        metadata: { itemCount: result.itemCount },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'menu.pointsAwarded',
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
        action: 'menu_created',
        details: { restaurantId, itemCount: result.itemCount, categoryCount: result.categoryCount, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:menu:menuCreated', {
      restaurantId,
      itemCount: result.itemCount,
      points,
    }, `merchant:${restaurantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateMenu = catchAsync(async (req, res) => {
  const { menuId } = req.params;
  const updates = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await menuManagementService.updateMenu(menuId, updates, ipAddress, transaction);
    const points = calculatePoints(result.action, { updateCount: 1 }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'menu.menuUpdated',
        messageParams: { itemName: result.itemName },
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
        metadata: { updateCount: 1 },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'menu.pointsAwarded',
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
        action: 'menu_updated',
        details: { menuId, itemName: result.itemName, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:menu:menuUpdated', {
      menuId,
      restaurantId: result.restaurantId,
      points,
    }, `merchant:${result.restaurantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const applyDynamicPricing = catchAsync(async (req, res) => {
  const { menuId } = req.params;
  const promotion = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await menuManagementService.applyDynamicPricing(menuId, promotion, ipAddress, transaction);
    const points = calculatePoints(result.action, { promotionValue: promotion.value }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'menu.dynamicPricingApplied',
        messageParams: { promotionType: result.promotionType },
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
        metadata: { promotionValue: promotion.value },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'menu.pointsAwarded',
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
        action: 'dynamic_pricing_applied',
        details: { menuId, promotionId: result.promotionId, promotionType: result.promotionType, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:menu:dynamicPricingApplied', {
      menuId,
      promotionId: result.promotionId,
      restaurantId: result.restaurantId,
      points,
    }, `merchant:${result.restaurantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { createMenu, updateMenu, applyDynamicPricing };