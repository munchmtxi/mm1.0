'use strict';

const { validationResult } = require('express-validator');
const inventoryService = require('@services/merchant/inventoryService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization');
const restaurantConstants = require('@constants/merchant/restaurantConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Sequelize } = require('sequelize');

/**
 * Retrieves menu items for a restaurant
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
async function getMenuItems(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(
      formatMessage('customer', 'menu', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'validation_error', { errors: errors.array() }),
      400,
      restaurantConstants.ERROR_CODES.INVALID_REQUEST
    ));
  }

  const { restaurantId } = req.params;
  const { userId, role } = req.user || {};
  const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

  try {
    const result = await Sequelize.transaction(async (transaction) => {
      const menu = await inventoryService.getMenuItems(restaurantId, transaction);

      // Log audit action
      await auditService.logAction({
        userId: userId || 'anonymous',
        role: role || 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.MENU_VIEWED,
        details: { restaurantId, itemCount: menu.menuItems.length },
        ipAddress: req.ip,
        metadata: { languageCode }
      }, transaction);

      return menu;
    });

    logger.info('Menu items retrieved', { restaurantId, userId });

    return res.status(200).json({
      success: true,
      message: formatMessage('customer', 'menu', languageCode, 'menu_retrieved'),
      data: result
    });
  } catch (error) {
    logger.error('Failed to retrieve menu items', { error: error.message, restaurantId, userId });
    return next(new AppError(
      formatMessage('customer', 'menu', languageCode, 'menu_retrieval_failed', { error: error.message }),
      error.status || 500,
      error.code || restaurantConstants.ERROR_CODES.INTERNAL_SERVER_ERROR
    ));
  }
}

/**
 * Checks availability of a menu item
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
async function checkItemAvailability(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(
      formatMessage('customer', 'menu', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'validation_error', { errors: errors.array() }),
      400,
      restaurantConstants.ERROR_CODES.INVALID_REQUEST
    ));
  }

  const { itemId } = req.params;
  const { userId, role } = req.user || {};
  const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

  try {
    const result = await Sequelize.transaction(async (transaction) => {
      const availability = await inventoryService.checkItemAvailability(itemId, userId, transaction);

      // Log audit action
      await auditService.logAction({
        userId: userId || 'anonymous',
        role: role || 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ITEM_AVAILABILITY_CHECKED,
        details: { itemId, isAvailable: availability.isAvailable },
        ipAddress: req.ip,
        metadata: { languageCode }
      }, transaction);

      return availability;
    });

    logger.info('Item availability checked', { itemId, userId });

    return res.status(200).json({
      success: true,
      message: formatMessage('customer', 'menu', languageCode, 'availability_checked'),
      data: result
    });
  } catch (error) {
    logger.error('Failed to check item availability', { error: error.message, itemId, userId });
    return next(new AppError(
      formatMessage('customer', 'menu', languageCode, 'availability_check_failed', { error: error.message }),
      error.status || 500,
      error.code || restaurantConstants.ERROR_CODES.INTERNAL_SERVER_ERROR
    ));
  }
}

/**
 * Retrieves featured items for a restaurant
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
async function getFeaturedItems(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(
      formatMessage('customer', 'menu', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'validation_error', { errors: errors.array() }),
      400,
      restaurantConstants.ERROR_CODES.INVALID_REQUEST
    ));
  }

  const { restaurantId } = req.params;
  const { limit = 5 } = req.query;
  const { userId, role, walletId } = req.user || {};
  const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

  try {
    const result = await Sequelize.transaction(async (transaction) => {
      const featuredItems = await inventoryService.getFeaturedItems(restaurantId, parseInt(limit), transaction);

      // Log audit action
      await auditService.logAction({
        userId: userId || 'anonymous',
        role: role || 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.FEATURED_ITEMS_VIEWED,
        details: { restaurantId, itemCount: featuredItems.featuredItems.length },
        ipAddress: req.ip,
        metadata: { languageCode }
      }, transaction);

      // Award points for viewing featured items (munch action)
      if (userId && role === 'customer') {
        await pointService.awardPoints(userId, 'dietary_filter_applied', 5, {
          io: req.io,
          role: 'customer',
          languageCode,
          walletId
        });

        // Notify user of points earned
        await notificationService.sendNotification({
          userId,
          notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.includes('points_earned') ? 'points_earned' : customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
          messageKey: 'gamification.points_earned',
          messageParams: { points: 5, actionName: 'Viewed Featured Items' },
          priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
          languageCode
        });

        // Emit socket event for points
        await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.GAMIFICATION_POINTS_AWARDED, {
          userId,
          role: 'customer',
          action: 'dietary_filter_applied',
          points: 5,
          walletCredit: null
        }, `customer:${userId}`, languageCode);
      }

      return featuredItems;
    });

    logger.info('Featured items retrieved', { restaurantId, userId, limit });

    return res.status(200).json({
      success: true,
      message: formatMessage('customer', 'menu', languageCode, 'featured_items_retrieved'),
      data: result
    });
  } catch (error) {
    logger.error('Failed to retrieve featured items', { error: error.message, restaurantId, userId });
    return next(new AppError(
      formatMessage('customer', 'menu', languageCode, 'featured_items_retrieval_failed', { error: error.message }),
      error.status || 500,
      error.code || restaurantConstants.ERROR_CODES.INTERNAL_SERVER_ERROR
    ));
  }
}

module.exports = {
  getMenuItems,
  checkItemAvailability,
  getFeaturedItems
};