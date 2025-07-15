'use strict';

const inDiningOrderService = require('@services/inDiningOrderService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization');
const customerConstants = require('@constants/customer/customerConstants');
const customerGamificationConstants = require('@constants/common/customerGamificationConstants');
const socketConstants = require('@constants/common/socketConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { sequelize } = require('@models');

/**
 * Controller for handling in-dining order operations.
 * Integrates with socket, notification, point, and audit services.
 * Uses localization for responses and customerConstants/customerGamificationConstants for validation.
 * Last Updated: July 1, 2025
 */

/**
 * Creates a new in-dining order.
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
async function createInDiningOrder(req, res, next) {
  const { customerId, branchId, tableId, cartId, notes } = req.body;
  const { io } = req; // Socket.IO instance
  const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;
  const ipAddress = req.ip;

  let transaction;
  try {
    transaction = await sequelize.transaction();

    const { order, customer, branch, table } = await inDiningOrderService.createInDiningOrder({
      customerId,
      branchId,
      tableId,
      cartId,
      notes,
      transaction,
    });

    // Award gamification points for order_placed
    const gamificationAction = customerGamificationConstants.GAMIFICATION_ACTIONS.mtables.find(
      action => action.action === 'order_placed'
    );
    const dailyActions = await sequelize.models.GamificationPoints.count({
      where: {
        user_id: customerId,
        role: 'customer',
        created_at: { [sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      transaction,
    });
    if (dailyActions < customerGamificationConstants.GAMIFICATION_SETTINGS.MAX_DAILY_ACTIONS) {
      await pointService.awardPoints(customerId, gamificationAction.action, gamificationAction.points, {
        io,
        role: 'customer',
        languageCode,
        walletId: customer.wallet_id,
      });
    }

    // Send notification
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // order_update
      messageKey: 'order.order_placed',
      messageParams: { orderNumber: order.order_number, branchName: branch.name },
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
      languageCode,
      orderId: order.id,
      role: 'customer',
      module: 'order',
    });

    // Emit socket event
    await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.CUSTOMER_ORDER_UPDATE, {
      userId: customerId,
      role: 'customer',
      auditAction: 'ORDER_CREATED',
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      branchId,
      tableId,
    }, `customer:${customerId}`, languageCode);

    // Log audit action
    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_CREATED,
      details: { orderId: order.id, branchId, tableId },
      ipAddress,
      transaction,
    });

    await transaction.commit();

    const message = formatMessage('customer', 'order', languageCode, 'order.order_placed_success', {
      orderNumber: order.order_number,
    });

    return res.status(201).json({
      success: true,
      message,
      data: { order, branch, table },
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    logger.logErrorEvent(`Failed to create in-dining order: ${error.message}`, { customerId, branchId, tableId });
    return next(new AppError(
      formatMessage('customer', 'order', languageCode, `errors.${error.message}`, {}),
      error.status || 400,
      error.code || customerConstants.ERROR_TYPES[0]
    ));
  }
}

/**
 * Updates an existing in-dining order.
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
async function updateInDiningOrder(req, res, next) {
  const { orderId, status, preparationStatus, notes } = req.body;
  const customerId = req.user.id;
  const { io } = req;
  const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;
  const ipAddress = req.ip;

  let transaction;
  try {
    transaction = await sequelize.transaction();

    const { order } = await inDiningOrderService.updateInDiningOrder({
      orderId,
      status,
      preparationStatus,
      notes,
      transaction,
    });

    // Send notification
    if (status || preparationStatus) {
      await notificationService.sendNotification({
        userId: customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // order_update
        messageKey: 'order.order_updated',
        messageParams: { orderNumber: order.order_number, status: status || order.status },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
        languageCode,
        orderId: order.id,
        role: 'customer',
        module: 'order',
      });
    }

    // Emit socket event
    await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.CUSTOMER_ORDER_UPDATE, {
      userId: customerId,
      role: 'customer',
      auditAction: 'ORDER_UPDATED',
      orderId: order.id,
      orderNumber: order.order_number,
      status: status || order.status,
      preparationStatus: preparationStatus || order.preparation_status,
    }, `customer:${customerId}`, languageCode);

    // Log audit action
    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_UPDATED,
      details: { orderId, status, preparationStatus },
      ipAddress,
      transaction,
    });

    await transaction.commit();

    const message = formatMessage('customer', 'order', languageCode, 'order.order_updated_success', {
      orderNumber: order.order_number,
    });

    return res.status(200).json({
      success: true,
      message,
      data: { order },
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    logger.logErrorEvent(`Failed to update in-dining order: ${error.message}`, { orderId, customerId });
    return next(new AppError(
      formatMessage('customer', 'order', languageCode, `errors.${error.message}`, {}),
      error.status || 400,
      error.code || customerConstants.ERROR_TYPES[0]
    ));
  }
}

/**
 * Submits feedback for an in-dining order.
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
async function submitOrderFeedback(req, res, next) {
  const { orderId, rating, comment } = req.body;
  const customerId = req.user.id;
  const { io } = req;
  const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;
  const ipAddress = req.ip;

  let transaction;
  try {
    transaction = await sequelize.transaction();

    const { feedback, order } = await inDiningOrderService.submitOrderFeedback({
      orderId,
      customerId,
      rating,
      comment,
      transaction,
    });

    // Award gamification points for order_review_submitted
    const gamificationAction = customerGamificationConstants.GAMIFICATION_ACTIONS.mtables.find(
      action => action.action === 'order_review_submitted'
    );
    const dailyActions = await sequelize.models.GamificationPoints.count({
      where: {
        user_id: customerId,
        role: 'customer',
        created_at: { [sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      transaction,
    });
    if (dailyActions < customerGamificationConstants.GAMIFICATION_SETTINGS.MAX_DAILY_ACTIONS) {
      await pointService.awardPoints(customerId, gamificationAction.action, gamificationAction.points, {
        io,
        role: 'customer',
        languageCode,
        walletId: req.user.wallet_id,
      });
    }

    // Send notification
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[1], // feedback_submitted
      messageKey: 'order.feedback_submitted',
      messageParams: { orderNumber: order.order_number, rating },
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
      languageCode,
      orderId: order.id,
      role: 'customer',
      module: 'order',
    });

    // Emit socket event
    await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.FEEDBACK_SUBMITTED, {
      userId: customerId,
      role: 'customer',
      auditAction: 'FEEDBACK_SUBMITTED',
      orderId: order.id,
      rating,
      comment,
    }, `customer:${customerId}`, languageCode);

    // Log audit action
    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.FEEDBACK_SUBMITTED,
      details: { orderId, rating, comment },
      ipAddress,
      transaction,
    });

    await transaction.commit();

    const message = formatMessage('customer', 'order', languageCode, 'order.feedback_submitted_success', {
      orderNumber: order.order_number,
    });

    return res.status(201).json({
      success: true,
      message,
      data: { feedback },
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    logger.logErrorEvent(`Failed to submit order feedback: ${error.message}`, { orderId, customerId });
    return next(new AppError(
      formatMessage('customer', 'order', languageCode, `errors.${error.message}`, {}),
      error.status || 400,
      error.code || customerConstants.ERROR_TYPES[0]
    ));
  }
}

/**
 * Retrieves in-dining order history.
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
async function getInDiningOrderHistory(req, res, next) {
  const { customerId, branchId } = req.query;
  const requesterId = req.user.id;
  const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;
  const ipAddress = req.ip;

  let transaction;
  try {
    transaction = await sequelize.transaction();

    // Validate requester permissions
    if (customerId && customerId !== requesterId) {
      throw new AppError(
        formatMessage('customer', 'order', languageCode, 'errors.unauthorized_access', {}),
        403,
        customerConstants.ERROR_TYPES[10] // INVALID_CUSTOMER_ID
      );
    }

    const orders = await inDiningOrderService.getInDiningOrderHistory({
      customerId,
      branchId,
      transaction,
    });

    // Log audit action
    await auditService.logAction({
      userId: requesterId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_HISTORY_VIEWED,
      details: { customerId, branchId },
      ipAddress,
      transaction,
    });

    await transaction.commit();

    const message = formatMessage('customer', 'order', languageCode, 'order.history_retrieved_success', {
      count: orders.length,
    });

    return res.status(200).json({
      success: true,
      message,
      data: { orders },
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    logger.logErrorEvent(`Failed to retrieve order history: ${error.message}`, { customerId, branchId });
    return next(new AppError(
      formatMessage('customer', 'order', languageCode, `errors.${error.message}`, {}),
      error.status || 400,
      error.code || customerConstants.ERROR_TYPES[0]
    ));
  }
}

module.exports = {
  createInDiningOrder,
  updateInDiningOrder,
  submitOrderFeedback,
  getInDiningOrderHistory,
};