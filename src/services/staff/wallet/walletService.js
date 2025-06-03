'use strict';

/**
 * walletService.js
 * Manages staff wallet operations for munch. Handles balance retrieval, transaction history,
 * withdrawals, merchant synchronization, and preferences.
 * Last Updated: May 26, 2025
 */

const { Wallet, WalletTransaction, Staff, Merchant, PrivacySettings, Payout } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Retrieves staff wallet balance.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Object>} Wallet balance and currency.
 */
async function getWalletBalance(staffId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await securityService.verifyMFA(staff.user_id);

    socketService.emit(`munch:wallet:${staffId}`, 'wallet:balance_retrieved', {
      staffId,
      balance: staff.wallet.balance,
      currency: staff.wallet.currency,
    });

    return { balance: staff.wallet.balance, currency: staff.wallet.currency };
  } catch (error) {
    logger.error('Wallet balance retrieval failed', { error: error.message, staffId });
    throw new AppError(`Balance retrieval failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Displays wallet transaction history.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Array>} Transaction records.
 */
async function viewTransactionHistory(staffId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const transactions = await WalletTransaction.findAll({
      where: { wallet_id: staff.wallet.id },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    socketService.emit(`munch:wallet:${staffId}`, 'wallet:history_retrieved', { staffId, transactions });

    return transactions;
  } catch (error) {
    logger.error('Transaction history retrieval failed', { error: error.message, staffId });
    throw new AppError(`History retrieval failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Submits a withdrawal request.
 * @param {number} staffId - Staff ID.
 * @param {number} amount - Withdrawal amount.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Payout record.
 */
async function requestWithdrawal(staffId, amount, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    if (amount > staff.wallet.balance) {
      throw new AppError('Insufficient balance', 400, staffConstants.STAFF_ERROR_CODES.INSUFFICIENT_BALANCE);
    }

    await securityService.verifyMFA(staff.user_id);

    const encryptedBankDetails = await securityService.encryptData(staff.wallet.bank_details);
    const payout = await Payout.create({
      wallet_id: staff.wallet.id,
      staff_id: staffId,
      amount,
      currency: staff.wallet.currency,
      method: 'bank_transfer',
      status: 'pending',
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, amount, payoutId: payout.id, action: 'request_withdrawal' },
      ipAddress,
    });

    const message = localization.formatMessage('wallet.withdrawal_requested', { amount, payoutId: payout.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:wallet:${staffId}`, 'wallet:withdrawal_requested', { staffId, amount, payoutId: payout.id });

    return payout;
  } catch (error) {
    logger.error('Withdrawal request failed', { error: error.message, staffId, amount });
    throw new AppError(`Withdrawal failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Synchronizes wallet data with merchant.
 * @param {number} staffId - Staff ID.
 * @param {number} merchantId - Merchant ID.
 * @returns {Promise<void>}
 */
async function syncWithMerchant(staffId, merchantId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    const merchant = await Merchant.findByPk(merchantId);
    if (!staff || !staff.wallet || !merchant) {
      throw new AppError('Staff or merchant not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    if (staff.merchant_id !== merchantId) {
      throw new AppError('Staff not associated with merchant', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    await Wallet.update(
      { merchant_id: merchantId },
      { where: { id: staff.wallet.id } }
    );

    socketService.emit(`munch:wallet:${staffId}`, 'wallet:merchant_synced', { staffId, merchantId });

  } catch (error) {
    logger.error('Merchant sync failed', { error: error.message, staffId, merchantId });
    throw new AppError(`Sync failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Sets wallet notification preferences.
 * @param {number} staffId - Staff ID.
 * @param {Object} preferences - Notification preferences.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<void>}
 */
async function updateWalletPreferences(staffId, preferences, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: PrivacySettings, as: 'user' }] });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await PrivacySettings.update(
      { notificationPreferences: preferences },
      { where: { user_id: staff.user_id } }
    );

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, preferences, action: 'update_wallet_preferences' },
      ipAddress,
    });

    const message = localization.formatMessage('wallet.preferences_updated', { staffId });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:wallet:${staffId}`, 'wallet:preferences_updated', { staffId, preferences });
  } catch (error) {
    logger.error('Wallet preferences update failed', { error: error.message, staffId });
    throw new AppError(`Preferences update failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.STAFF_ERROR);
  }
}

module.exports = {
  getWalletBalance,
  viewTransactionHistory,
  requestWithdrawal,
  syncWithMerchant,
  updateWalletPreferences,
};