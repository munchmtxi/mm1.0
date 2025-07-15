'use strict';

const { Wallet, WalletTransaction, Staff, Merchant, PrivacySettings, Payout } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function getWalletBalance(staffId, securityService, socketService) {
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
    throw new AppError(`Balance retrieval failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('WALLET_NOT_FOUND') ? 'WALLET_NOT_FOUND' : 'TRANSACTION_FAILED');
  }
}

async function viewTransactionHistory(staffId, socketService) {
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
    throw new AppError(`History retrieval failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('WALLET_NOT_FOUND') ? 'WALLET_NOT_FOUND' : 'TRANSACTION_FAILED');
  }
}

async function requestWithdrawal(staffId, amount, ipAddress, securityService, notificationService, auditService, socketService) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const withdrawalLimit = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'WITHDRAWAL');
    if (amount > staff.wallet.balance) {
      throw new AppError('Insufficient balance', 400, paymentConstants.ERROR_CODES.includes('INSUFFICIENT_FUNDS') ? 'INSUFFICIENT_FUNDS' : 'INVALID_BALANCE');
    }
    if (amount < withdrawalLimit.min || amount > withdrawalLimit.max) {
      throw new AppError(`Withdrawal amount must be between ${withdrawalLimit.min} and ${withdrawalLimit.max}`, 400, 'INVALID_BALANCE');
    }

    await securityService.verifyMFA(staff.user_id);

    const encryptedBankDetails = await securityService.encryptData(staff.wallet.bank_details || {});
    const payout = await Payout.create({
      wallet_id: staff.wallet.id,
      staff_id: staffId,
      amount,
      currency: staff.wallet.currency,
      method: paymentConstants.PAYMENT_METHODS.includes('bank_transfer') ? 'bank_transfer' : 'default',
      status: paymentConstants.TRANSACTION_STATUSES[0], // 'pending'
    });

    await auditService.logAction({
      userId: staffId,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, amount, payoutId: payout.id, action: 'request_withdrawal' },
      ipAddress,
    });

    const message = formatMessage('wallet.withdrawal_requested', { amount, payoutId: payout.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WITHDRAWAL_PROCESSED,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:wallet:${staffId}`, 'wallet:withdrawal_requested', { staffId, amount, payoutId: payout.id });

    return payout;
  } catch (error) {
    logger.error('Withdrawal request failed', { error: error.message, staffId, amount });
    throw new AppError(`Withdrawal failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'INVALID_BALANCE');
  }
}

async function syncWithMerchant(staffId, merchantId, socketService) {
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
    throw new AppError(`Sync failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'WALLET_NOT_FOUND');
  }
}

async function updateWalletPreferences(staffId, preferences, ipAddress, notificationService, auditService, socketService) {
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
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, preferences, action: 'update_wallet_preferences' },
      ipAddress,
    });

    const message = formatMessage('wallet.preferences_updated', { staffId });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:wallet:${staffId}`, 'wallet:preferences_updated', { staffId, preferences });
  } catch (error) {
    logger.error('Wallet preferences update failed', { error: error.message, staffId });
    throw new AppError(`Preferences update failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('WALLET_NOT_FOUND') ? 'WALLET_NOT_FOUND' : 'TRANSACTION_FAILED');
  }
}

module.exports = {
  getWalletBalance,
  viewTransactionHistory,
  requestWithdrawal,
  syncWithMerchant,
  updateWalletPreferences
};