// walletController.js
// Handles wallet-related requests for merchants, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const walletService = require('@services/merchant/wallet/walletService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { Merchant } = require('@models');

async function createWallet(req, res, next) {
  try {
    const { merchantId } = req.body;
    const io = req.app.get('io'); // Socket.IO instance from app

    const wallet = await walletService.createMerchantWallet(merchantId);

    await auditService.logAction({
      userId: wallet.user_id,
      role: 'merchant',
      action: 'create_wallet',
      details: { merchantId, walletId: wallet.id },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: wallet.user_id,
      action: 'create_wallet',
      points: 50,
      details: { merchantId, walletId: wallet.id },
    });

    socketService.emit(io, 'merchant:wallet:created', { walletId: wallet.id, merchantId }, `merchant:${merchantId}`);

    const merchant = await Merchant.findByPk(merchantId);
    await notificationService.sendNotification({
      userId: wallet.user_id,
      notificationType: 'wallet_created',
      messageKey: 'wallet.created',
      messageParams: { walletId: wallet.id },
      role: 'merchant',
      module: 'wallet',
      languageCode: merchant.preferred_language || 'en',
    });

    res.status(201).json({
      success: true,
      message: formatMessage('wallet.created', { walletId: wallet.id }, merchant.preferred_language || 'en'),
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
}

async function processPayment(req, res, next) {
  try {
    const { merchantId, amount, walletId } = req.body;
    const io = req.app.get('io');

    const transaction = await walletService.receivePayment(merchantId, amount, walletId);

    const merchant = await Merchant.findByPk(merchantId);
    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'receive_payment',
      details: { merchantId, amount, walletId, transactionId: transaction.id },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: merchant.user_id,
      action: 'receive_payment',
      points: Math.floor(amount / 10),
      details: { merchantId, amount, walletId, transactionId: transaction.id },
    });

    socketService.emit(io, 'merchant:wallet:paymentReceived', {
      transactionId: transaction.id,
      merchantId,
      amount,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'payment_received',
      messageKey: 'wallet.payment_received',
      messageParams: { amount, currency: transaction.currency },
      role: 'merchant',
      module: 'wallet',
      languageCode: merchant.preferred_language || 'en',
    });

    res.status(200).json({
      success: true,
      message: formatMessage('wallet.payment_received', { amount, currency: transaction.currency }, merchant.preferred_language || 'en'),
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

async function processPayout(req, res, next) {
  try {
    const { merchantId, recipientId, amount } = req.body;
    const io = req.app.get('io');

    const transaction = await walletService.disbursePayout(merchantId, recipientId, amount);

    const merchant = await Merchant.findByPk(merchantId);
    const recipient = await Staff.findByPk(recipientId);

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'disburse_payout',
      details: { merchantId, recipientId, amount, transactionId: transaction.id },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: merchant.user_id,
      action: 'disburse_payout',
      points: 20,
      details: { merchantId, recipientId, amount, transactionId: transaction.id },
    });

    socketService.emit(io, 'merchant:wallet:payoutDisbursed', {
      transactionId: transaction.id,
      merchantId,
      recipientId,
      amount,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: recipient.user_id,
      notificationType: 'payout_received',
      messageKey: 'wallet.payout_received',
      messageParams: { amount, currency: transaction.currency },
      role: 'staff',
      module: 'wallet',
      languageCode: recipient.user?.preferred_language || 'en',
    });

    res.status(200).json({
      success: true,
      message: formatMessage('wallet.payout_disbursed', { amount, currency: transaction.currency }, merchant.preferred_language || 'en'),
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

async function getBalance(req, res, next) {
  try {
    const { merchantId } = req.query;

    const balance = await walletService.getWalletBalance(merchantId);

    const merchant = await Merchant.findByPk(merchantId);
    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'get_wallet_balance',
      details: { merchantId, balance: balance.balance },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: formatMessage('wallet.balance_retrieved', { balance: balance.balance, currency: balance.currency }, merchant.preferred_language || 'en'),
      data: balance,
    });
  } catch (error) {
    next(error);
  }
}

async function getHistory(req, res, next) {
  try {
    const { merchantId } = req.query;

    const transactions = await walletService.getTransactionHistory(merchantId);

    const merchant = await Merchant.findByPk(merchantId);
    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'get_transaction_history',
      details: { merchantId, transactionCount: transactions.length },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: formatMessage('wallet.history_retrieved', { count: transactions.length }, merchant.preferred_language || 'en'),
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createWallet,
  processPayment,
  processPayout,
  getBalance,
  getHistory,
};