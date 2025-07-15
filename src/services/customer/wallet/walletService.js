'use strict';

const { Wallet, WalletTransaction, User, Customer, Payment } = require('@models');
const paymentConstants = require('@constants/common/paymentConstants');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const customerConstants = require('@constants/customer/customerConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

async function createWallet(customerId, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const existingWallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
  if (existingWallet) {
    throw new AppError('Wallet already exists', 400, paymentConstants.ERROR_CODES.WALLET_ALREADY_EXISTS);
  }

  const wallet = await Wallet.create({
    user_id: customerId,
    type: customerWalletConstants.WALLET_CONSTANTS.WALLET_TYPE,
    currency: paymentConstants.WALLET_SETTINGS.SUPPORTED_CURRENCIES[0], // Default to first supported currency (USD)
    balance: 0,
  }, { transaction });

  logger.info('Customer wallet created', { walletId: wallet.id, customerId });
  return wallet;
}

async function addFunds(walletId, amount, paymentMethod, transaction) {
  const wallet = await Wallet.findByPk(walletId, { transaction });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  // Validate amount
  const depositLimit = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'DEPOSIT');
  if (amount < depositLimit.min || amount > depositLimit.max) {
    throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);
  }

  // Validate payment method
  if (!paymentConstants.PAYMENT_METHODS.includes(paymentMethod.type.toUpperCase())) {
    throw new AppError('Invalid payment method', 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
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
    throw new AppError('Balance exceeds maximum limit', 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);
  }
  await wallet.update({ balance: newBalance }, { transaction });

  logger.info('Funds added to wallet', { walletId, transactionId: transactionRecord.id, amount });
  return transactionRecord;
}

async function withdrawFunds(walletId, amount, destination, transaction) {
  const wallet = await Wallet.findByPk(walletId, { transaction });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  // Validate amount
  const withdrawalLimit = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'WITHDRAWAL');
  if (amount < withdrawalLimit.min || amount > withdrawalLimit.max) {
    throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);
  }
  if (wallet.balance < amount) {
    throw new AppError('Insufficient funds', 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
  }

  // Validate destination
  if (!destination.accountNumber || !destination.bankName) {
    throw new AppError('Invalid payment method', 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
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

  logger.info('Funds withdrawn from wallet', { walletId, transactionId: transactionRecord.id, amount });
  return transactionRecord;
}

async function payWithWallet(walletId, serviceId, amount, transaction) {
  const wallet = await Wallet.findByPk(walletId, { transaction });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  // Validate amount
  const paymentLimit = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'ORDER_PAYMENT');
  if (amount < paymentLimit.min || amount > paymentLimit.max) {
    throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);
  }
  if (wallet.balance < amount) {
    throw new AppError('Insufficient funds', 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
  }

  // Create payment record
  const payment = await Payment.create({
    customer_id: wallet.user_id,
    order_id: serviceId,
    amount,
    payment_method: customerWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS[2], // digital_wallet
    status: customerWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1], // completed
    transaction_id: `TXN_${Date.now()}`,
  }, { transaction });

  // Create wallet transaction
  const transactionRecord = await WalletTransaction.create({
    wallet_id: walletId,
    type: paymentConstants.TRANSACTION_TYPES.ORDER_PAYMENT,
    amount,
    currency: wallet.currency,
    status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
  }, { transaction });

  // Update balance
  const newBalance = parseFloat(wallet.balance) - amount;
  await wallet.update({ balance: newBalance }, { transaction });

  logger.info('Payment processed with wallet', { walletId, paymentId: payment.id, amount });
  return payment;
}

async function getWalletBalance(walletId, transaction) {
  const wallet = await Wallet.findByPk(walletId, {
    attributes: ['id', 'balance', 'currency', 'type'],
    transaction,
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
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
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
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
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  // Validate amount
  const rewardLimit = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'GAMIFICATION_REWARD');
  if (amount < rewardLimit.min || amount > rewardLimit.max) {
    throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);
  }

  // Validate currency
  if (currency !== wallet.currency) {
    throw new AppError('Currency mismatch', 400, paymentConstants.ERROR_CODES.CURRENCY_MISMATCH);
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
    throw new AppError('Balance exceeds maximum limit', 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);
  }
  await wallet.update({ balance: newBalance }, { transaction });

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