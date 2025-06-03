'use strict';

/**
 * walletService.js
 * Manages merchant wallet creation, payments, payouts, balance, and transaction history for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const paymentConstants = require('@constants/common/paymentConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { Wallet, WalletTransaction, Merchant, Staff, Customer, AuditLog, Notification } = require('@models');

/**
 * Creates a merchant wallet.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Created wallet.
 */
async function createMerchantWallet(merchantId, io) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const existingWallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (existingWallet) throw new Error('Merchant wallet already exists');

    const wallet = await Wallet.create({
      user_id: merchant.user_id,
      merchant_id: merchantId,
      balance: 0.00,
      currency: paymentConstants.WALLET_SETTINGS.DEFAULT_CURRENCY,
      type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.MERCHANT,
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'create_wallet',
      details: { merchantId, walletId: wallet.id },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'wallet:created', { walletId: wallet.id, merchantId }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'wallet_created',
      messageKey: 'wallet.created',
      messageParams: { walletId: wallet.id },
      role: 'merchant',
      module: 'wallet',
      languageCode: merchant.preferred_language || 'en',
    });

    return wallet;
  } catch (error) {
    logger.error('Error creating merchant wallet', { error: error.message });
    throw error;
  }
}

/**
 * Credits customer payments to merchant wallet.
 * @param {number} merchantId - Merchant ID.
 * @param {number} amount - Payment amount.
 * @param {number} walletId - Customer wallet ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Transaction record.
 */
async function receivePayment(merchantId, amount, walletId, io) {
  try {
    if (!merchantId || !amount || !walletId) throw new Error('Merchant ID, amount, and wallet ID required');
    if (amount <= 0) throw new Error('Amount must be positive');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const merchantWallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!merchantWallet) throw new Error('Merchant wallet not found');

    const customerWallet = await Wallet.findByPk(walletId);
    if (!customerWallet || customerWallet.type !== paymentConstants.WALLET_SETTINGS.WALLET_TYPES.CUSTOMER) {
      throw new Error('Invalid customer wallet');
    }
    if (customerWallet.balance < amount) throw new Error('Insufficient customer balance');

    const transaction = await sequelize.transaction(async (t) => {
      await customerWallet.update(
        { balance: customerWallet.balance - amount },
        { transaction: t }
      );

      await merchantWallet.update(
        { balance: merchantWallet.balance + amount },
        { transaction: t }
      );

      const tx = await WalletTransaction.create(
        {
          wallet_id: merchantWallet.id,
          type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
          amount,
          currency: merchantWallet.currency,
          status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
          description: `Payment from customer wallet ${walletId}`,
        },
        { transaction: t }
      );

      await WalletTransaction.create(
        {
          wallet_id: customerWallet.id,
          type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
          amount: -amount,
          currency: customerWallet.currency,
          status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
          description: `Payment to merchant ${merchantId}`,
        },
        { transaction: t }
      );

      return tx;
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'receive_payment',
      details: { merchantId, amount, walletId, transactionId: transaction.id },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'wallet:paymentReceived', {
      transactionId: transaction.id,
      merchantId,
      amount,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'payment_received',
      messageKey: 'wallet.payment_received',
      messageParams: { amount, currency: merchantWallet.currency },
      role: 'merchant',
      module: 'wallet',
      languageCode: merchant.preferred_language || 'en',
    });

    return transaction;
  } catch (error) {
    logger.error('Error receiving payment', { error: error.message });
    throw error;
  }
}

/**
 * Sends payouts to drivers or staff.
 * @param {number} merchantId - Merchant ID.
 * @param {number} recipientId - Staff ID.
 * @param {number} amount - Payout amount.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Transaction record.
 */
async function disbursePayout(merchantId, recipientId, amount, io) {
  try {
    if (!merchantId || !recipientId || !amount) throw new Error('Merchant ID, recipient ID, and amount required');
    if (amount <= 0) throw new Error('Amount must be positive');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const merchantWallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!merchantWallet) throw new Error('Merchant wallet not found');
    if (merchantWallet.balance < amount) throw new Error('Insufficient merchant balance');

    const recipient = await Staff.findByPk(recipientId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!recipient || !recipient.wallet) throw new Error('Invalid recipient or no wallet');

    const transaction = await sequelize.transaction(async (t) => {
      await merchantWallet.update(
        { balance: merchantWallet.balance - amount },
        { transaction: t }
      );

      await recipient.wallet.update(
        { balance: recipient.wallet.balance + amount },
        { transaction: t }
      );

      const tx = await WalletTransaction.create(
        {
          wallet_id: merchantWallet.id,
          type: paymentConstants.TRANSACTION_TYPES.PAYOUT,
          amount: -amount,
          currency: merchantWallet.currency,
          status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
          description: `Payout to staff ${recipientId}`,
        },
        { transaction: t }
      );

      await WalletTransaction.create(
        {
          wallet_id: recipient.wallet.id,
          type: paymentConstants.TRANSACTION_TYPES.PAYOUT,
          amount,
          currency: recipient.wallet.currency,
          status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
          description: `Payout from merchant ${merchantId}`,
        },
        { transaction: t }
      );

      return tx;
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'disburse_payout',
      details: { merchantId, recipientId, amount, transactionId: transaction.id },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'wallet:payoutDisbursed', {
      transactionId: transaction.id,
      merchantId,
      recipientId,
      amount,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: recipient.user_id,
      notificationType: 'payout_received',
      messageKey: 'wallet.payout_received',
      messageParams: { amount, currency: merchantWallet.currency },
      role: 'staff',
      module: 'wallet',
      languageCode: recipient.user?.preferred_language || 'en',
    });

    return transaction;
  } catch (error) {
    logger.error('Error disbursing payout', { error: error.message });
    throw error;
  }
}

/**
 * Retrieves merchant wallet balance.
 * @param {number} merchantId - Merchant ID.
 * @returns {Promise<Object>} Wallet balance.
 */
async function getWalletBalance(merchantId) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const wallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!wallet) throw new Error('Merchant wallet not found');

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'get_wallet_balance',
      details: { merchantId, balance: wallet.balance },
      ipAddress: '127.0.0.1',
    });

    return { balance: wallet.balance, currency: wallet.currency };
  } catch (error) {
    logger.error('Error retrieving wallet balance', { error: error.message });
    throw error;
  }
}

/**
 * Retrieves payment and payout history.
 * @param {number} merchantId - Merchant ID.
 * @returns {Promise<Array>} Transaction history.
 */
async function getTransactionHistory(merchantId) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const wallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!wallet) throw new Error('Merchant wallet not found');

    const transactions = await WalletTransaction.findAll({
      where: { wallet_id: wallet.id },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'get_transaction_history',
      details: { merchantId, transactionCount: transactions.length },
      ipAddress: '127.0.0.1',
    });

    return transactions;
  } catch (error) {
    logger.error('Error retrieving transaction history', { error: error.message });
    throw error;
  }
}

module.exports = {
  createMerchantWallet,
  receivePayment,
  disbursePayout,
  getWalletBalance,
  getTransactionHistory,
};