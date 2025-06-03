'use strict';

const { Wallet, WalletTransaction, User, CustomerProfile, Payment } = require('@models');
const pointService = require('./pointService');
const { formatMessage } = require('@utils/localization');
const paymentConstants = require('@constants/customerConstants');
const customerConstants = require('@constants/customerConstants.js');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

async function createWallet(customerId, transaction) {
  const customer = await sequelize.models.Customer.findOne({
    where: { user_id: customerId} },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.customer_not_found'), 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const existingWallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
  if (existingWallet) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.wallet_already_exists'), 400, paymentConstants.ERROR_CODES.WALLET_ALREADY_EXISTS);
  }

  const wallet = await Wallet.create({
    user_id: customerId,
    type: customerConstants.WALLET_CONSTANTS.WALLET_TYPE,
    currency: customerConstants.CUSTOMER_SETTINGS.DEFAULT_CURRENCY,
    balance: 0,
  }, { transaction });

  // Award points for wallet creation
  await pointService.awardPoints({
    userId: customerId,
    action: 'create_wallet',
    points: 50, // Fixed points for wallet creation
    referenceId: wallet.id,
    referenceType: 'Wallet',
  }, transaction);

  logger.info('Customer wallet created', { walletId: wallet.id, customerId });
  return wallet;
}

async function addFunds(walletId, amount, paymentMethod, transaction) {
  const wallet = await Wallet.findByPk(walletId, { transaction });
  if (!wallet) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.wallet_not_found'), 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  // Validate amount
  const depositLimit = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'DEPOSIT');
  if (amount < depositLimit.min || amount > depositLimit.max) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.invalid_amount'), 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);
  }

  // Validate payment method
  if (!paymentConstants.PAYMENT_METHODS.includes(paymentMethod.type)) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.invalid_payment_method'), 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
  }

  // Create transaction
  const transactionRecord = await WalletTransaction.create({
    wallet_id: walletId,
    type: paymentConstants.TRANSACTION_TYPES.DEPOSIT,
    amount,
    currency: wallet.currency,
    status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
    payment_method_id: paymentMethod.id,
  }, { transaction });

  // Update balance
  const newBalance = parseFloat(wallet.balance) + amount;
  if (newBalance > paymentConstants.WALLET_SETTINGS.MAX_BALANCE) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.invalid_balance'), 400, paymentConstants.ERROR_CODES.INVALID_BALANCE);
  }
  await wallet.update({ balance: newBalance }, { transaction });

  // Award points for deposit
  await pointService.awardPoints({
    userId: wallet.user_id,
    action: 'deposit_funds',
    points: Math.floor(amount * 5), // 5 points per currency unit
    referenceId: transactionRecord.id,
    referenceType: 'WalletTransaction',
  }, transaction);

  logger.info('Funds added to wallet', { walletId, transactionId: transactionRecord.id, amount });
  return transactionRecord;
}

async function withdrawFunds(walletId, amount, destination, transaction) {
  const wallet = await Wallet.findByPk(walletId, { transaction });
  if (!wallet) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.wallet_not_found'), 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  // Validate amount
  const withdrawalLimit = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'WITHDRAWAL');
  if (amount < withdrawalLimit.min || amount > withdrawalLimit.max) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.invalid_amount'), 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);
  }
  if (wallet.balance < amount) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.insufficient_funds'), 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
  }

  // Validate destination
  if (!destination.accountNumber || !destination.bankName) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.invalid_payment_method'), 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
  }

  // Create transaction
  const transactionRecord = await WalletTransaction.create({
    wallet_id: walletId,
    type: paymentConstants.TRANSACTION_TYPES.WITHDRAWAL,
    amount,
    currency: wallet.currency,
    status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
    payment_method_id: destination.id,
  }, { transaction });

  // Update balance
  const newBalance = parseFloat(wallet.balance) - amount;
  await wallet.update({ balance: newBalance }, { transaction });

  // Award points for withdrawal
  await pointService.awardPoints({
    userId: wallet.user_id,
    action: 'withdraw_funds',
    points: 20, // Fixed points for withdrawal
    referenceId: transactionRecord.id,
    referenceType: 'WalletTransaction',
  }, transaction);

  logger.info('Funds withdrawn from wallet', { walletId, transactionId: transactionRecord.id, amount });
  return transactionRecord;
}

async function payWithWallet(walletId, serviceId, amount, transaction) {
  const wallet = await Wallet.findByPk(walletId, { transaction });
  if (!wallet) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.wallet_not_found'), 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  // Validate amount
  const paymentLimit = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'PAYMENT');
  if (amount < paymentLimit.min || amount > paymentLimit.max) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.invalid_amount'), 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);
  }
  if (wallet.balance < amount) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.insufficient_funds'), 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
  }

  // Create payment record
  const payment = await Payment.create({
    customer_id: wallet.user_id,
    order_id: serviceId,
    amount,
    payment_method: customerConstants.WALLET_CONSTANTS.PAYMENT_METHODS.WALLET_TRANSFER,
    status: customerConstants.WALLET_CONSTANTS.PAYMENT_STATUSES.COMPLETED,
    transaction_id: `TXN_${Date.now()}`,
  }, { transaction });

  // Create wallet transaction
  const transactionRecord = await WalletTransaction.create({
    wallet_id: walletId,
    type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
    amount,
    currency: wallet.currency,
    status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
  }, { transaction });

  // Update balance
  const newBalance = parseFloat(wallet.balance) - amount;
  await wallet.update({ balance: newBalance }, { transaction });

  // Award points for payment
  await pointService.awardPoints({
    userId: wallet.user_id,
    action: 'payment_with_wallet',
    points: Math.floor(amount * 3), // 3 points per currency unit
    referenceId: payment.id,
    referenceType: 'Payment',
  }, transaction);

  logger.info('Payment processed with wallet', { walletId, paymentId: payment.id, amount });
  return payment;
}

async function getWalletBalance(walletId, transaction) {
  const wallet = await Wallet.findByPk(walletId, {
    attributes: ['id', 'balance', 'currency', 'type'],
    transaction,
  });
  if (!wallet) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.wallet_not_found'), 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  logger.info('Wallet balance retrieved', { walletId, balance: wallet.balance });
  return {
    walletId: wallet.id,
    balance: wallet.balance,
    currency: wallet.currency,
    type: wallet.type,
  };
}

async function getWalletTransactions(walletId) {
  const wallet = await Wallet.findByPk(walletId);
  if (!wallet) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.wallet_not_found'), 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  const transactions = await WalletTransaction.findAll({
    where: { wallet_id: walletId },
    order: [['created_at', 'DESC']],
  });

  logger.info('Wallet transactions retrieved', { walletId, transactionCount: transactions.length });
  return transactions;
}

async function creditWallet(creditData, transaction) {
  const { userId, amount, currency, transactionType, description } = creditData;

  const wallet = await Wallet.findOne({ where: { user_id: userId }, transaction });
  if (!wallet) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.wallet_not_found'), 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  // Validate amount
  const rewardLimit = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'CASHBACK');
  if (amount < rewardLimit.min || amount > rewardLimit.max) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.invalid_amount'), 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);
  }

  // Validate currency
  if (currency !== wallet.currency) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.currency_mismatch'), 400, paymentConstants.ERROR_CODES.CURRENCY_MISMATCH);
  }

  // Create transaction
  const transactionRecord = await WalletTransaction.create({
    wallet_id: wallet.id,
    type: transactionType,
    amount,
    currency,
    status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
    description,
  }, { transaction });

  // Update balance
  const newBalance = parseFloat(wallet.balance) + amount;
  if (newBalance > paymentConstants.WALLET_SETTINGS.MAX_BALANCE) {
    throw new AppError(formatMessage('customer', 'wallet', 'en', 'error.invalid_balance'), 400, paymentConstants.ERROR_CODES.INVALID_BALANCE);
  }
  await wallet.update({ balance: newBalance }, { transaction });

  // Award points for gamification reward
  await pointService.awardPoints({
    userId,
    action: 'gamification_reward',
    points: Math.floor(amount * 10), // 10 points per currency unit
    referenceId: transactionRecord.id,
    referenceType: 'WalletTransaction',
  }, transaction);

  logger.info('Gamification reward credited', { walletId: wallet.id, transactionId: transactionRecord.id, amount });
  return transactionRecord;
}

module.exports = {
  createWallet,
  addFunds,
  withdrawFunds,
  payWithWallet,
  getWalletBalance,
  getWalletTransactions,
  creditWallet,
};