'use strict';

const { Wallet, WalletTransaction, User, Customer, Payment } = require('@models');
const walletService = require('@services/common/walletService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const customerConstants = require('@constants/customer/customerConstants');
const customerGamificationConstants = require('@constants/customer/customerGamificationConstants'); // Added import
const paymentConstants = require('@constants/common/paymentConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { sequelize } = require('@models');
const catchAsync = require('@utils/catchAsync');

module.exports = {
  createWallet: catchAsync(async (req, res, next) => {
    const { userId } = req.user;
    const { languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.body;
    const ipAddress = req.ip;

    const transaction = await sequelize.transaction();
    try {
      const wallet = await walletService.createWallet(userId, transaction);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.WALLET_CREATED,
        details: { walletId: wallet.id },
        ipAddress,
      }, transaction);

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // announcement
        messageKey: 'wallet.created',
        messageParams: { walletId: wallet.id },
        role: 'customer',
        module: 'payments/wallet',
        languageCode,
      });

      await socketService.emit(req.io, 'WALLET_CREATED', {
        userId,
        role: 'customer',
        walletId: wallet.id,
        auditAction: 'WALLET_CREATED',
      }, `customer:${userId}`, languageCode);

      const walletActivationAction = customerGamificationConstants.GAMIFICATION_ACTIONS.wallet.find(a => a.action === 'ADD_FUNDS'); // Updated reference
      await pointService.awardPoints(userId, walletActivationAction.action, walletActivationAction.points, {
        io: req.io,
        role: 'customer',
        languageCode,
        walletId: wallet.id,
      });

      await transaction.commit();

      const message = formatMessage('customer', 'payments/wallet', languageCode, 'wallet.created_success', { walletId: wallet.id });
      logger.logApiEvent('Wallet created', { userId, walletId: wallet.id });
      res.status(201).json({ success: true, message, data: wallet });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Wallet creation failed', { userId, error: error.message });
      next(error);
    }
  }),

  addFunds: catchAsync(async (req, res, next) => {
    const { userId } = req.user;
    const { walletId, amount, paymentMethod, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.body;
    const ipAddress = req.ip;

    const transaction = await sequelize.transaction();
    try {
      const transactionRecord = await walletService.addFunds(walletId, amount, paymentMethod, transaction);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.WALLET_FUNDED,
        details: { walletId, amount, transactionId: transactionRecord.id },
        ipAddress,
      }, transaction);

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // announcement
        messageKey: 'wallet.funded',
        messageParams: { amount, currency: transactionRecord.currency },
        role: 'customer',
        module: 'payments/wallet',
        languageCode,
      });

      await socketService.emit(req.io, 'WALLET_FUNDED', {
        userId,
        role: 'customer',
        walletId,
        amount,
        transactionId: transactionRecord.id,
        auditAction: 'WALLET_FUNDED',
      }, `customer:${userId}`, languageCode);

      const topUpAction = customerGamificationConstants.GAMIFICATION_ACTIONS.wallet.find(a => a.action === 'ADD_FUNDS'); // Updated reference
      await pointService.awardPoints(userId, topUpAction.action, topUpAction.points, {
        io: req.io,
        role: 'customer',
        languageCode,
        walletId,
      });

      await transaction.commit();

      const message = formatMessage('customer', 'payments/wallet', languageCode, 'wallet.funded_success', { amount, currency: transactionRecord.currency });
      logger.logApiEvent('Funds added', { userId, walletId, transactionId: transactionRecord.id });
      res.status(200).json({ success: true, message, data: transactionRecord });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Add funds failed', { userId, walletId, error: error.message });
      next(error);
    }
  }),

  withdrawFunds: catchAsync(async (req, res, next) => {
    const { userId } = req.user;
    const { walletId, amount, destination, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.body;
    const ipAddress = req.ip;

    const transaction = await sequelize.transaction();
    try {
      const transactionRecord = await walletService.withdrawFunds(walletId, amount, destination, transaction);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.WALLET_WITHDRAWAL,
        details: { walletId, amount, transactionId: transactionRecord.id },
        ipAddress,
      }, transaction);

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // announcement
        messageKey: 'wallet.withdrawn',
        messageParams: { amount, currency: transactionRecord.currency },
        role: 'customer',
        module: 'payments/wallet',
        languageCode,
      });

      await socketService.emit(req.io, 'WALLET_WITHDRAWN', {
        userId,
        role: 'customer',
        walletId,
        amount,
        transactionId: transactionRecord.id,
        auditAction: 'WALLET_WITHDRAWAL',
      }, `customer:${userId}`, languageCode);

      const withdrawalAction = customerGamificationConstants.GAMIFICATION_ACTIONS.wallet.find(a => a.action === 'WITHDRAWAL'); // Updated reference
      if (withdrawalAction) {
        await pointService.awardPoints(userId, withdrawalAction.action, withdrawalAction.points, {
          io: req.io,
          role: 'customer',
          languageCode,
          walletId,
        });
      }

      await transaction.commit();

      const message = formatMessage('customer', 'payments/wallet', languageCode, 'wallet.withdrawn_success', { amount, currency: transactionRecord.currency });
      logger.logApiEvent('Funds withdrawn', { userId, walletId, transactionId: transactionRecord.id });
      res.status(200).json({ success: true, message, data: transactionRecord });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Withdraw funds failed', { userId, walletId, error: error.message });
      next(error);
    }
  }),

  payWithWallet: catchAsync(async (req, res, next) => {
    const { userId } = req.user;
    const { walletId, serviceId, amount, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.body;
    const ipAddress = req.ip;

    const transaction = await sequelize.transaction();
    try {
      const payment = await walletService.payWithWallet(walletId, serviceId, amount, transaction);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.WALLET_PAYMENT,
        details: { walletId, serviceId, amount, paymentId: payment.id },
        ipAddress,
      }, transaction);

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // announcement
        messageKey: 'wallet.payment_processed',
        messageParams: { amount, currency: paymentConstants.WALLET_SETTINGS.SUPPORTED_CURRENCIES[0] },
        role: 'customer',
        module: 'payments/wallet',
        languageCode,
      });

      await socketService.emit(req.io, 'WALLET_PAYMENT_PROCESSED', {
        userId,
        role: 'customer',
        walletId,
        serviceId,
        amount,
        paymentId: payment.id,
        auditAction: 'WALLET_PAYMENT',
      }, `customer:${userId}`, languageCode);

      const paymentAction = customerGamificationConstants.GAMIFICATION_ACTIONS.wallet.find(a => a.action === 'ORDER_PAYMENT'); // Updated reference
      await pointService.awardPoints(userId, paymentAction.action, paymentAction.points, {
        io: req.io,
        role: 'customer',
        languageCode,
        walletId,
      });

      await transaction.commit();

      const message = formatMessage('customer', 'payments/wallet', languageCode, 'wallet.payment_success', { amount, serviceId });
      logger.logApiEvent('Payment processed', { userId, walletId, paymentId: payment.id });
      res.status(200).json({ success: true, message, data: payment });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Payment failed', { userId, walletId, error: error.message });
      next(error);
    }
  }),

  getWalletBalance: catchAsync(async (req, res, next) => {
    const { userId } = req.user;
    const { walletId, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.query;
    const ipAddress = req.ip;

    const transaction = await sequelize.transaction();
    try {
      const balance = await walletService.getWalletBalance(walletId, transaction);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.WALLET_BALANCE_CHECKED,
        details: { walletId, balance: balance.balance },
        ipAddress,
      }, transaction);

      await transaction.commit();

      const message = formatMessage('customer', 'payments/wallet', languageCode, 'wallet.balance_retrieved', { balance: balance.balance, currency: balance.currency });
      logger.logApiEvent('Wallet balance retrieved', { userId, walletId, balance: balance.balance });
      res.status(200).json({ success: true, message, data: balance });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Get wallet balance failed', { userId, walletId, error: error.message });
      next(error);
    }
  }),

  getWalletTransactions: catchAsync(async (req, res, next) => {
    const { userId } = req.user;
    const { walletId, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.query;
    const ipAddress = req.ip;

    try {
      const transactions = await walletService.getWalletTransactions(walletId);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.WALLET_TRANSACTIONS_VIEWED,
        details: { walletId, transactionCount: transactions.length },
        ipAddress,
      });

      const message = formatMessage('customer', 'payments/wallet', languageCode, 'wallet.transactions_retrieved', { count: transactions.length });
      logger.logApiEvent('Wallet transactions retrieved', { userId, walletId, transactionCount: transactions.length });
      res.status(200).json({ success: true, message, data: transactions });
    } catch (error) {
      logger.logErrorEvent('Get wallet transactions failed', { userId, walletId, error: error.message });
      next(error);
    }
  }),

  creditWalletForReward: catchAsync(async (req, res, next) => {
    const { userId } = req.user;
    const { walletId, amount, rewardId, description, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.body;
    const ipAddress = req.ip;

    const transaction = await sequelize.transaction();
    try {
      const transactionRecord = await walletService.creditWallet({
        userId,
        amount,
        currency: paymentConstants.WALLET_SETTINGS.SUPPORTED_CURRENCIES[0], // USD
        transactionType: paymentConstants.TRANSACTION_TYPES.GAMIFICATION_REWARD,
        description,
      }, transaction);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.WALLET_REWARD_CREDITED,
        details: { walletId, amount, rewardId, transactionId: transactionRecord.id },
        ipAddress,
      }, transaction);

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // announcement
        messageKey: 'wallet.reward_credited',
        messageParams: { amount, currency: transactionRecord.currency, rewardId },
        role: 'customer',
        module: 'payments/wallet',
        languageCode,
      });

      await socketService.emit(req.io, 'WALLET_REWARD_CREDITED', {
        userId,
        role: 'customer',
        walletId,
        amount,
        rewardId,
        transactionId: transactionRecord.id,
        auditAction: 'WALLET_REWARD_CREDITED',
      }, `customer:${userId}`, languageCode);

      await transaction.commit();

      const message = formatMessage('customer', 'payments/wallet', languageCode, 'wallet.reward_credited_success', { amount, rewardId });
      logger.logApiEvent('Reward credited', { userId, walletId, transactionId: transactionRecord.id });
      res.status(200).json({ success: true, message, data: transactionRecord });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Reward credit failed', { userId, walletId, error: error.message });
      next(error);
    }
  }),
};