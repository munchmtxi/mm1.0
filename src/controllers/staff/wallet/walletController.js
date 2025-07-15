'use strict';

const walletService = require('@services/staff/wallet/walletService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function getWalletBalance(req, res, next) {
  try {
    const { staffId } = req.params;
    const balance = await walletService.getWalletBalance(staffId, securityService, socketService);
    return res.status(200).json({
      success: true,
      data: balance,
      message: 'Wallet balance retrieved successfully'
    });
  } catch (error) {
    logger.error('Wallet balance retrieval failed', { error: error.message });
    next(error);
  }
}

async function viewTransactionHistory(req, res, next) {
  try {
    const { staffId } = req.params;
    const transactions = await walletService.viewTransactionHistory(staffId, socketService);
    return res.status(200).json({
      success: true,
      data: transactions,
      message: 'Transaction history retrieved successfully'
    });
  } catch (error) {
    logger.error('Transaction history retrieval failed', { error: error.message });
    next(error);
  }
}

async function requestWithdrawal(req, res, next) {
  try {
    const { staffId, amount } = req.body;
    const ipAddress = req.ip;
    const payout = await walletService.requestWithdrawal(staffId, amount, ipAddress, securityService, notificationService, auditService, socketService);
    return res.status(201).json({
      success: true,
      data: payout,
      message: 'Withdrawal request submitted successfully'
    });
  } catch (error) {
    logger.error('Withdrawal request failed', { error: error.message });
    next(error);
  }
}

async function syncWithMerchant(req, res, next) {
  try {
    const { staffId, merchantId } = req.body;
    await walletService.syncWithMerchant(staffId, merchantId, socketService);
    return res.status(200).json({
      success: true,
      message: 'Wallet synchronized with merchant successfully'
    });
  } catch (error) {
    logger.error('Merchant sync failed', { error: error.message });
    next(error);
  }
}

async function updateWalletPreferences(req, res, next) {
  try {
    const { staffId, preferences } = req.body;
    const ipAddress = req.ip;
    await walletService.updateWalletPreferences(staffId, preferences, ipAddress, notificationService, auditService, socketService);
    return res.status(200).json({
      success: true,
      message: 'Wallet preferences updated successfully'
    });
  } catch (error) {
    logger.error('Wallet preferences update failed', { error: error.message });
    next(error);
  }
}

module.exports = {
  getWalletBalance,
  viewTransactionHistory,
  requestWithdrawal,
  syncWithMerchant,
  updateWalletPreferences
};