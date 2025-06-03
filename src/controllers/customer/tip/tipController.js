'use strict';

const { sequelize } = require('@models');
const { createTip, updateTip, getCustomerTips } = require('@services/customer/tip/tipService');
const notificationService = require('@services/common/notificationService');
const walletService = require('@services/common/walletService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const tipEvents = require('@socket/events/customer/tip/tipEvents');
const tipConstants = require('@constants/common/tipConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const createTipAction = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { customerId } = req.user;
    const { recipientId, amount, currency, rideId, orderId, bookingId, eventServiceId, inDiningOrderId } = req.body;
    const ipAddress = req.ip;

    const tip = await createTip(customerId, recipientId, amount, currency, { rideId, orderId, bookingId, eventServiceId, inDiningOrderId }, transaction);

    // Process wallet transaction
    await walletService.processTransaction({
      sourceWalletId: tip.walletId,
      destinationWalletId: tip.recipientWalletId,
      amount,
      currency,
      transactionType: 'tip',
      referenceId: tip.tipId,
      referenceType: 'Tip',
    }, transaction);

    // Update tip status
    await sequelize.models.Tip.update({ status: 'completed' }, { where: { id: tip.tipId }, transaction });

    // Send notifications
    const recipient = await sequelize.models.User.findByPk(recipientId, { transaction });
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: tipConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TIP_SENT,
      messageKey: 'tip_sent',
      messageParams: { amount, currency, recipientName: recipient.getFullName() },
      deliveryMethod: 'push',
      priority: 'medium',
      role: 'customer',
      module: 'tip',
    }, transaction);

    await notificationService.sendNotification({
      userId: recipientId,
      notificationType: tipConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TIP_RECEIVED,
      messageKey: 'tip_received',
      messageParams: { amount, currency, customerName: req.user.getFullName() },
      deliveryMethod: 'push',
      priority: 'high',
      role: recipient.driver_profile ? 'driver' : 'staff',
      module: 'tip',
    }, transaction);

    // Log audit
    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'CREATE_TIP',
      details: { tipId: tip.tipId, recipientId, amount, currency, rideId, orderId, bookingId, eventServiceId, inDiningOrderId },
      ipAddress,
    }, transaction);

    // Emit socket event
    socketService.emit(req.app.get('socketio'), tipEvents.TIP_SENT, {
      tipId: tip.tipId,
      customerId,
      recipientId,
      amount,
      currency,
    }, `customer:${recipientId}`);

    await transaction.commit();
    res.status(201).json({ status: 'success', data: tip });
  } catch (error) {
    await transaction.rollback();
    logger.error('Tip creation failed', { customerId: req.user.customerId, error: error.message });
    throw new AppError(`Tip creation failed: ${error.message}`, error.statusCode || 500, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }
};

const updateTipAction = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { customerId } = req.user;
    const { tipId } = req.params;
    const { amount, status } = req.body;
    const ipAddress = req.ip;

    const tip = await updateTip(tipId, customerId, { amount, status }, transaction);

    if (amount) {
      const recipientWallet = await sequelize.models.Wallet.findOne({ where: { user_id: tip.recipient_id }, transaction });
      await walletService.reverseTransaction({ referenceId: tipId, referenceType: 'Tip' }, transaction);
      await walletService.processTransaction({
        sourceWalletId: tip.wallet_id,
        destinationWalletId: recipientWallet.id,
        amount: tip.amount,
        currency: tip.currency,
        transactionType: 'tip',
        referenceId: tipId,
        referenceType: 'Tip',
      }, transaction);
    }

    // Send notifications
    if (status) {
      const recipient = await sequelize.models.User.findByPk(tip.recipient_id, { transaction });
      await notificationService.sendNotification({
        userId: customerId,
        notificationType: tipConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TIP_UPDATED,
        messageKey: status === 'failed' ? 'tip_failed' : 'tip_updated',
        messageParams: { amount: tip.amount, currency: tip.currency, recipientName: recipient.getFullName() },
        deliveryMethod: 'push',
        priority: 'medium',
        role: 'customer',
        module: 'tip',
      }, transaction);

      if (status === 'completed' || status === 'failed') {
        await notificationService.sendNotification({
          userId: tip.recipient_id,
          notificationType: status === 'failed' ? tipConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TIP_FAILED : tipConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TIP_RECEIVED,
          messageKey: status === 'failed' ? 'tip_failed' : 'tip_received',
          messageParams: { amount: tip.amount, currency: tip.currency, customerName: req.user.getFullName() },
          deliveryMethod: 'push',
          priority: 'high',
          role: recipient.driver_profile ? 'driver' : 'staff',
          module: 'tip',
        }, transaction);
      }
    }

    // Log audit
    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'UPDATE_TIP',
      details: { tipId, updates: { amount, status } },
      ipAddress,
    }, transaction);

    // Emit socket event
    socketService.emit(req.app.get('socketio'), tipEvents.TIP_UPDATED, {
      tipId,
      customerId,
      amount: tip.amount,
      status: tip.status,
    }, `customer:${tip.recipient_id}`);

    await transaction.commit();
    res.status(200).json({ status: 'success', data: tip });
  } catch (error) {
    await transaction.rollback();
    logger.error('Tip update failed', { customerId: req.user.customerId, error: error.message });
    throw new AppError(`Tip update failed: ${error.message}`, error.statusCode || 500, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }
};

const getCustomerTipsAction = async (req, res) => {
  try {
    const { customerId } = req.user;
    const tips = await getCustomerTips(customerId);
    res.status(200).json({ status: 'success', data: tips });
  } catch (error) {
    logger.error('Tip retrieval failed', { customerId: req.user.customerId, error: error.message });
    throw new AppError(`Tip retrieval failed: ${error.message}`, error.statusCode || 500, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }
};

module.exports = { createTipAction, updateTipAction, getCustomerTipsAction };