'use strict';

const tipService = require('@services/customer/mtxi/tipService');
const walletService = require('@services/common/walletService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const customerConstants = require('@constants/customer/customerConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const tipConstants = require('@constants/customer/tipConstants');
const driverConstants = require('@constants/driver/driverConstants');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const { sequelize, Wallet, Driver, Transaction } = require('@models');

async function sendTip(req, res) {
  const { rideId, orderId, amount, walletId, splitWithFriends } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    const wallet = await Wallet.findOne({
      where: { id: walletId, user_id: req.user.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[1] },
      transaction,
    });
    if (!wallet) throw new AppError('Wallet not found', 404, tipConstants.ERROR_CODES[7]);

    const tip = await tipService.sendTip(customerId, rideId, orderId, amount, splitWithFriends, transaction);
    tip.wallet_id = wallet.id;
    await tip.save({ transaction });

    let finalAmount = amount;
    if (splitWithFriends && splitWithFriends.length > 0) {
      finalAmount = amount / (splitWithFriends.length + 1);
    }

    const customerTransaction = await walletService.processTransaction(
      wallet.id,
      {
        type: paymentConstants.TRANSACTION_TYPES[7],
        amount: finalAmount,
        currency: wallet.currency,
        status: paymentConstants.TRANSACTION_STATUSES[0],
      },
      { transaction }
    );

    for (const friendId of splitWithFriends || []) {
      const friendWallet = await Wallet.findOne({
        where: { user_id: friendId, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[1] },
        transaction,
      });
      if (!friendWallet) throw new AppError('Friend wallet not found', 404, tipConstants.ERROR_CODES[7]);
      await walletService.processTransaction(
        friendWallet.id,
        {
          type: paymentConstants.TRANSACTION_TYPES[7],
          amount: finalAmount,
          currency: friendWallet.currency,
          status: paymentConstants.TRANSACTION_STATUSES[0],
        },
        { transaction }
      );
    }

    const recipient = await Driver.findByPk(tip.recipient_id, { transaction });
    const recipientWallet = await Wallet.findOne({
      where: { user_id: recipient.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[2] },
      transaction,
    });
    if (!recipientWallet) throw new AppError('Recipient wallet not found', 404, tipConstants.ERROR_CODES[7]);

    await walletService.processTransaction(
      recipientWallet.id,
      {
        type: paymentConstants.TRANSACTION_TYPES[4],
        amount: tip.amount,
        currency: recipientWallet.currency,
        status: paymentConstants.TRANSACTION_STATUSES[0],
      },
      { transaction }
    );

    try {
      await pointService.awardPoints({
        userId: req.user.user_id,
        role: 'customer',
        action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.TIPPING.action,
        languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });
    } catch (error) {
      gamificationError = error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.TIP_SENT,
      details: { tipId: tip.id, rideId, orderId, amount: tip.amount, recipientId: tip.recipient_id },
      ipAddress: req.ip,
    }, transaction);

    await notificationService.sendNotification({
      userId: req.user.user_id,
      type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      message: formatMessage('tip_sent', { tipId: tip.id, amount: tip.amount, service: rideId ? 'ride' : 'order' }),
    });

    await notificationService.sendNotification({
      userId: recipient.user_id,
      type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TIP_RECEIVED,
      message: formatMessage('tip_received', { tipId: tip.id, amount: tip.amount, service: rideId ? 'ride' : 'order' }),
    });

    await socketService.emit('tip:sent', { userId: customerId, role: 'customer', tipId: tip.id });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Tip sent',
      data: { tipId: tip.id, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 500, error.code || tipConstants.ERROR_CODES[12]);
  }
}

async function cancelTip(req, res) {
  const { tipId } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    const tip = await tipService.cancelTip(customerId, tipId, transaction);

    const customerTransaction = await Transaction.findOne({
      where: { type: paymentConstants.TRANSACTION_TYPES[7], wallet_id: tip.wallet_id },
      transaction,
    });
    if (customerTransaction) {
      await walletService.processTransaction(
        tip.wallet_id,
        {
          type: paymentConstants.TRANSACTION_TYPES[2],
          amount: customerTransaction.amount,
          currency: tip.currency,
          status: paymentConstants.TRANSACTION_STATUSES[0],
        },
        { transaction }
      );
    }

    const recipientWallet = await Wallet.findOne({
      where: { user_id: tip.recipient_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[2] },
      transaction,
    });
    if (recipientWallet) {
      const recipientTransaction = await Transaction.findOne({
        where: { type: paymentConstants.TRANSACTION_TYPES[4], wallet_id: recipientWallet.id },
        transaction,
      });
      if (recipientTransaction) {
        await walletService.processTransaction(
          recipientWallet.id,
          {
            type: paymentConstants.TRANSACTION_TYPES[2],
            amount: recipientTransaction.amount,
            currency: recipientWallet.currency,
            status: paymentConstants.TRANSACTION_STATUSES[0],
          },
          { transaction }
        );
      }
    }

    try {
      await pointService.awardPoints({
        userId: req.user.user_id,
        role: 'customer',
        action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.TIP_CANCELLATION.action,
        languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });
    } catch (error) {
      gamificationError = error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.TIP_CANCELLED,
      details: { tipId },
      ipAddress: req.ip,
    }, transaction);

    await notificationService.sendNotification({
      userId: req.user.user_id,
      type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      message: formatMessage('tip_cancelled', { tipId }),
    });

    await socketService.emit('tip:cancelled', { userId: customerId, role: 'customer', tipId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Tip cancelled',
      data: { tipId, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || tipConstants.ERROR_CODES[12]);
  }
}

async function updateTipStatus(req, res) {
  const { tipId, newStatus } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    const tip = await tipService.updateTipStatus(tipId, newStatus, transaction);

    try {
      await pointService.awardPoints({
        userId: req.user.user_id,
        role: 'customer',
        action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.TIP_STATUS_UPDATE,
        languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });
    } catch (error) {
      gamificationError = error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.TIP_STATUS_UPDATED,
      details: { tipId, newStatus },
      ipAddress: req.ip,
    }, transaction);

    await notificationService.sendNotification({
      userId: req.user.user_id,
      type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.UPDATED,
      message: formatMessage('tip_status_updated', { tipId, status: newStatus }),
    });

    await socketService.emit('tip:updated', { userId: customerId, role: 'tip', tipId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Tip status updated',
      data: { tipId, status: newStatus, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || tipConstants.ERROR_CODES[12]);
  }
}

async function getTipHistory(req, res) {
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    const tips = await tipService.getTipHistory(customerId, transaction);
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Tip history retrieved',
      data: tips,
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || tipConstants.ERROR_CODES[0]);
  }
}

module.exports = {
  sendTip,
  cancelTip,
  updateTipStatus,
  getTipHistory,
};