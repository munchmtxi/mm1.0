'use strict';

/**
 * payoutService.js
 * Manages payout settings, processing, method verification, and history for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const paymentConstants = require('@constants/common/paymentConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { Wallet, WalletTransaction, Merchant, Staff, AuditLog, Notification } = require('@models');

/**
 * Sets payout schedules and methods.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} settings - Payout settings (schedule, method).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated wallet.
 */
async function configurePayoutSettings(merchantId, settings, io) {
  try {
    if (!merchantId || !settings?.schedule || !settings?.method) throw new Error('Merchant ID, schedule, and method required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const wallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!wallet) throw new Error('Merchant wallet not found');

    const validSchedules = ['daily', 'weekly', 'monthly'];
    const validMethods = ['bank_transfer', 'mobile_money'];
    if (!validSchedules.includes(settings.schedule)) throw new Error('Invalid payout schedule');
    if (!validMethods.includes(settings.method)) throw new Error('Invalid payout method');

    await wallet.update({
      bank_details: {
        ...wallet.bank_details,
        payout_schedule: settings.schedule,
        payout_method: settings.method,
        account_details: settings.account_details || wallet.bank_details?.account_details,
      },
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'configure_payout_settings',
      details: { merchantId, schedule: settings.schedule, method: settings.method },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'payout:settingsConfigured', {
      merchantId,
      schedule: settings.schedule,
      method: settings.method,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'payout_settings_updated',
      messageKey: 'payout.settings_updated',
      messageParams: { schedule: settings.schedule, method: settings.method },
      role: 'merchant',
      module: 'payout',
      languageCode: merchant.preferred_language || 'en',
    });

    return wallet;
  } catch (error) {
    logger.error('Error configuring payout settings', { error: error.message });
    throw error;
  }
}

/**
 * Executes payouts to recipients.
 * @param {number} merchantId - Merchant ID.
 * @param {number} recipientId - Staff ID.
 * @param {number} amount - Payout amount.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Transaction record.
 */
async function processPayout(merchantId, recipientId, amount, io) {
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
      action: 'process_payout',
      details: { merchantId, recipientId, amount, transactionId: transaction.id },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'payout:processed', {
      transactionId: transaction.id,
      merchantId,
      recipientId,
      amount,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: recipient.user_id,
      notificationType: 'payout_received',
      messageKey: 'payout.received',
      messageParams: { amount, currency: merchantWallet.currency },
      role: 'staff',
      module: 'payout',
      languageCode: recipient.user?.preferred_language || 'en',
    });

    return transaction;
  } catch (error) {
    logger.error('Error processing payout', { error: error.message });
    throw error;
  }
}

/**
 * Validates payout accounts for recipients.
 * @param {number} recipientId - Staff ID.
 * @param {Object} method - Payout method details (type, accountDetails).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Verification result.
 */
async function verifyPayoutMethod(recipientId, method, io) {
  try {
    if (!recipientId || !method?.type || !method?.accountDetails) throw new Error('Recipient ID, method type, and account details required');

    const recipient = await Staff.findByPk(recipientId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!recipient || !recipient.wallet) throw new Error('Invalid recipient or no wallet');

    const validMethods = ['bank_transfer', 'mobile_money'];
    if (!validMethods.includes(method.type)) throw new Error('Invalid payout method');

    // Simulate account verification (e.g., API call to payment gateway)
    const isValid = method.accountDetails?.accountNumber && method.accountDetails?.bankCode;

    if (!isValid) throw new Error('Invalid account details');

    await recipient.wallet.update({
      bank_details: {
        ...recipient.wallet.bank_details,
        payout_method: method.type,
        account_details: method.accountDetails,
        verified: true,
      },
    });

    await auditService.logAction({
      userId: recipient.user_id,
      role: 'staff',
      action: 'verify_payout_method',
      details: { recipientId, method: method.type },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'payout:methodVerified', {
      recipientId,
      method: method.type,
    }, `staff:${recipientId}`);

    await notificationService.sendNotification({
      userId: recipient.user_id,
      notificationType: 'payout_method_verified',
      messageKey: 'payout.method_verified',
      messageParams: { method: method.type },
      role: 'staff',
      module: 'payout',
      languageCode: recipient.user?.preferred_language || 'en',
    });

    return { verified: true, method: method.type };
  } catch (error) {
    logger.error('Error verifying payout method', { error: error.message });
    throw error;
  }
}

/**
 * Retrieves payout records.
 * @param {number} merchantId - Merchant ID.
 * @returns {Promise<Array>} Payout history.
 */
async function getPayoutHistory(merchantId) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const wallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!wallet) throw new Error('Merchant wallet not found');

    const transactions = await WalletTransaction.findAll({
      where: {
        wallet_id: wallet.id,
        type: paymentConstants.TRANSACTION_TYPES.PAYOUT,
      },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'get_payout_history',
      details: { merchantId, transactionCount: transactions.length },
      ipAddress: '127.0.0.1',
    });

    return transactions;
  } catch (error) {
    logger.error('Error retrieving payout history', { error: error.message });
    throw error;
  }
}

module.exports = {
  configurePayoutSettings,
  processPayout,
  verifyPayoutMethod,
  getPayoutHistory,
};