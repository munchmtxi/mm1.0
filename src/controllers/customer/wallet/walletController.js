'use strict';

const { sequelize } = require('@models');
const { createWallet, addFunds, withdrawFunds, payWithWallet, getWalletBalance, getWalletTransactions, creditWallet } = require('@services/customer/wallet/walletService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const walletEvents = require('@socket/events/customer/wallet/walletEvents');
const paymentConstants = require('@constants/common/paymentConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const createWalletAction = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { customerId } = req.user;
    const wallet = await createWallet(customerId, transaction);

    // Notify customer
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_CREATED,
      messageKey: 'wallet.created',
      messageParams: { walletId: wallet.id },
      deliveryMethod: 'push',
      priority: 'medium',
      role: 'customer',
      module: 'wallet',
    }, transaction);

    // Log audit
    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'CREATE_WALLET',
      details: { walletId: wallet.id, currency: wallet.currency },
      ipAddress: req.ip,
    }, transaction);

    // Emit socket event
    socketService.emit(req.app.get('socketio'), walletEvents.WALLET_CREATED, {
      userId: customerId,
      walletId: wallet.id,
      currency: wallet.currency,
    }, `customer:${customerId}`);

    await transaction.commit();
    res.status(201).json({ status: 'success', data: wallet });
  } catch (error) {
    await transaction.rollback();
    logger.error('Wallet creation failed', { customerId: req.user.customerId, error: error.message });
    throw new AppError(`Wallet creation failed: ${error.message}`, error.statusCode || 500, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }
};

const addFundsAction = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { customerId } = req.user;
    const { walletId, amount, paymentMethod } = req.body;

    const transactionRecord = await addFunds(walletId, amount, paymentMethod, transaction);

    // Notify customer
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DEPOSIT_CONFIRMED,
      messageKey: 'wallet.deposit_confirmed',
      messageParams: { amount, currency: transactionRecord.currency },
      deliveryMethod: 'push',
      priority: 'medium',
      role: 'customer',
      module: 'wallet',
    }, transaction);

    // Log audit
    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'DEPOSIT_FUNDS',
      details: { walletId, amount, currency: transactionRecord.currency },
      ipAddress: req.ip,
    }, transaction);

    // Emit socket event
    socketService.emit(req.app.get('socketio'), walletEvents.FUNDS_ADDED, {
      userId: customerId,
      walletId,
      amount,
      currency: transactionRecord.currency,
    }, `customer:${customerId}`);

    await transaction.commit();
    res.status(200).json({ status: 'success', data: transactionRecord });
  } catch (error) {
    await transaction.rollback();
    logger.error('Add funds failed', { customerId: req.user.customerId, error: error.message });
    throw new AppError(`Add funds failed: ${error.message}`, error.statusCode || 500, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
};

const withdrawFundsAction = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { customerId } = req.user;
    const { walletId, amount, destination } = req.body;

    const transactionRecord = await withdrawFunds(walletId, amount, destination, transaction);

    // Notify customer
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WITHDRAWAL_PROCESSED,
      messageKey: 'wallet.withdrawal_confirmed',
      messageParams: { amount, currency: transactionRecord.currency },
      deliveryMethod: 'push',
      priority: 'medium',
      role: 'customer',
      module: 'wallet',
    }, transaction);

    // Log audit
    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'WITHDRAW_FUNDS',
      details: { walletId, amount, currency: transactionRecord.currency, bankName: destination.bankName },
      ipAddress: req.ip,
    }, transaction);

    // Emit socket event
    socketService.emit(req.app.get('socketio'), walletEvents.FUNDS_WITHDRAWN, {
      userId: customerId,
      walletId,
      amount,
      currency: transactionRecord.currency,
    }, `customer:${customerId}`);

    await transaction.commit();
    res.status(200).json({ status: 'success', data: transactionRecord });
  } catch (error) {
    await transaction.rollback();
    logger.error('Withdraw funds failed', { customerId: req.user.customerId, error: error.message });
    throw new AppError(`Withdraw funds failed: ${error.message}`, error.statusCode || 500, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
};

const payWithWalletAction = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { customerId } = req.user;
    const { walletId, serviceId, amount } = req.body;

    const payment = await payWithWallet(walletId, serviceId, amount, transaction);

    // Notify customer
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      messageKey: 'wallet.payment_confirmed',
      messageParams: { amount, currency: payment.currency, serviceId },
      deliveryMethod: 'push',
      priority: 'medium',
      role: 'customer',
      module: 'wallet',
    }, transaction);

    // Log audit
    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'PAYMENT_WITH_WALLET',
      details: { walletId, serviceId, amount, currency: payment.currency },
      ipAddress: req.ip,
    }, transaction);

    // Emit socket event
    socketService.emit(req.app.get('socketio'), walletEvents.PAYMENT_PROCESSED, {
      userId: customerId,
      walletId,
      serviceId,
      amount,
      currency: payment.currency,
    }, `customer:${customerId}`);

    await transaction.commit();
    res.status(200).json({ status: 'success', data: payment });
  } catch (error) {
    await transaction.rollback();
    logger.error('Payment with wallet failed', { customerId: req.user.customerId, error: error.message });
    throw new AppError(`Payment failed: ${error.message}`, error.statusCode || 500, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
};

const getWalletBalanceAction = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { customerId } = req.user;
    const { walletId } = req.params;

    const balance = await getWalletBalance(walletId, transaction);

    // Log audit
    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'GET_WALLET_BALANCE',
      details: { walletId, balance: balance.balance },
      ipAddress: req.ip,
    }, transaction);

    // Emit socket event
    socketService.emit(req.app.get('socketio'), walletEvents.BALANCE_RETRIEVED, {
      userId: customerId,
      walletId,
      balance: balance.balance,
      currency: balance.currency,
    }, `customer:${customerId}`);

    await transaction.commit();
    res.status(200).json({ status: 'success', data: balance });
  } catch (error) {
    await transaction.rollback();
    logger.error('Balance retrieval failed', { customerId: req.user.customerId, error: error.message });
    throw new AppError(`Balance retrieval failed: ${error.message}`, error.statusCode || 500, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }
};

const getWalletTransactionsAction = async (req, res) => {
  try {
    const { customerId } = req.user;
    const { walletId } = req.params;

    const transactions = await getWalletTransactions(walletId);

    // Log audit
    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'GET_TRANSACTION_HISTORY',
      details: { walletId, transactionCount: transactions.length },
      ipAddress: req.ip,
    });

    // Emit socket event
    socketService.emit(req.app.get('socketio'), walletEvents.TRANSACTIONS_RETRIEVED, {
      userId: customerId,
      walletId,
      transactionCount: transactions.length,
    }, `customer:${customerId}`);

    res.status(200).json({ status: 'success', data: transactions });
  } catch (error) {
    logger.error('Transaction history retrieval failed', { customerId: req.user.customerId, error: error.message });
    throw new AppError(`Transaction history retrieval failed: ${error.message}`, error.statusCode || 500, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }
};

const creditWalletAction = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { customerId } = req.user;
    const { userId, amount, currency, transactionType, description } = req.body;

    const transactionRecord = await creditWallet({ userId, amount, currency, transactionType, description }, transaction);

    // Notify customer
    await notificationService.sendNotification({
      userId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.GAMIFICATION_REWARD,
      messageKey: 'wallet.gamification_reward',
      messageParams: { amount, currency, description },
      deliveryMethod: 'push',
      priority: 'medium',
      role: 'customer',
      module: 'wallet',
    }, transaction);

    // Log audit
    await auditService.logAction({
      userId,
      role: 'customer',
      action: 'GAMIFICATION_REWARD',
      details: { walletId: transactionRecord.wallet_id, amount, currency, description },
      ipAddress: req.ip,
    }, transaction);

    // Emit socket event
    socketService.emit(req.app.get('socketio'), walletEvents.GAMIFICATION_REWARD, {
      userId,
      walletId: transactionRecord.wallet_id,
      amount,
      currency,
      description,
    }, `customer:${userId}`);

    await transaction.commit();
    res.status(200).json({ status: 'success', data: transactionRecord });
  } catch (error) {
    await transaction.rollback();
    logger.error('Gamification reward failed', { customerId: req.user.customerId, error: error.message });
    throw new AppError(`Gamification reward failed: ${error.message}`, error.statusCode || 500, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
};

module.exports = {
  createWalletAction,
  addFundsAction,
  withdrawFundsAction,
  payWithWalletAction,
  getWalletBalanceAction,
  getWalletTransactionsAction,
  creditWalletAction,
};