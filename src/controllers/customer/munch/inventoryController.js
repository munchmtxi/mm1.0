'use strict';

const { sequelize } = require('@models');
const inventoryService = require('@services/customer/munch/inventoryService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/customer/munch/munchConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const getMenuItems = catchAsync(async (req, res) => {
  const { restaurantId } = req.params;
  const { customerId } = req.user || {};
  const transaction = await sequelize.transaction();
  try {
    const menu = await inventoryService.getMenuItems(restaurantId, transaction);
    if (customerId) {
      await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'merchant_browsed').action, {
        io: req.app.get('socketio'),
        role: 'customer',
        languageCode: req.user?.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
      }, transaction);
      await auditService.logAction({
        action: 'VIEW_MENU',
        userId: customerId,
        role: 'customer',
        details: `Retrieved menu for restaurant_id: ${restaurantId}`,
        ipAddress: req.ip,
      }, transaction);
    }
    await transaction.commit();
    logger.info('Menu items retrieved', { restaurantId, customerId });
    res.status(200).json({ status: 'success', data: menu });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const checkItemAvailability = catchAsync(async (req, res) => {
  const { itemId } = req.params;
  const { customerId } = req.user || {};
  const transaction = await sequelize.transaction();
  try {
    const availability = await inventoryService.checkItemAvailability(itemId, transaction);
    if (customerId) {
      await auditService.logAction({
        action: 'CHECK_ITEM_AVAILABILITY',
        userId: customerId,
        role: 'customer',
        details: `Checked availability for item_id: ${itemId}`,
        ipAddress: req.ip,
      }, transaction);
    }
    await transaction.commit();
    logger.info('Item availability checked', { itemId, customerId });
    res.status(200).json({ status: 'success', data: availability });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { getMenuItems, checkItemAvailability };