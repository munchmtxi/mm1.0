'use strict';

/**
 * Wallet Service
 * Manages wallet operations for all roles (admin, customer, driver, merchant, staff) across services
 * (mtables, munch, mtxi). Supports wallet creation, funding, withdrawals, payments, balance checks,
 * and transaction history. Integrates with auditService, securityService, socketService, and paymentConstants.
 * Last Updated: May 28, 2025
 */

const { Wallet, WalletTransaction, User } = require('@models');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const socketService = require('@services/common/socketService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization/localization');
const validation = require('@utils/validation');
const paymentConstants = require('@constants/common/paymentConstants');
const socketConstants = require('@constants/common/socketConstants');
const catchAsync = require('@utils/catchAsync');
const { Op } = require('sequelize');
const NodeCache = require('node-cache');

// Initialize cache for wallet queries
const walletCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

/**
 * Creates a wallet for a user based on their role.
 * @param {string} userId - User ID.
 * @param {string} role - User role (admin, customer, driver, merchant, staff).
 * @returns {Promise<Object>} Created wallet object.
 */
const createWallet = catchAsync(async (userId, role) => {
  // Validate inputs
  validation.validateRequiredFields({ userId, role }, ['userId', 'role']);

  // Ensure user exists
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404, paymentConstants.ERROR_CODES.USER_NOT_FOUND);
  }

  // Validate role
  if (!paymentConstants.WALLET_SETTINGS.WALLET_TYPES.includes(role)) {
    throw new AppError('Invalid role', 400, paymentConstants.ERROR_CODES.INVALID_WALLET_TYPE);
  }

  // Check if wallet already exists
  const existingWallet = await Wallet.findOne({ where: { user_id: userId } });
  if (existingWallet) {
    throw new AppError('Wallet already exists', 400, paymentConstants.ERROR_CODES.WALLET_ALREADY_EXISTS);
  }

  // Create wallet
  const wallet = await Wallet.create({
    user_id: userId,
    wallet_type: role,
    currency: paymentConstants.WALLET_SETTINGS.DEFAULT_CURRENCY,
    balance: 0,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Log audit event
  await auditService.logAction({
    userId,
    role,
    action: 'CREATE_WALLET',
    details: { walletId: wallet.id, walletType: role },
    ipAddress: 'system-generated',
  });

  // Emit socket event
  await socketService.emit(global.io, socketConstants.SOCKET_EVENT_TYPES.WALLET_CREATED, {
    userId,
    role,
    walletId: wallet.id,
    auditAction: 'WALLET_CREATED',
    details: { walletType: role, currency: wallet.currency },
  }, `user:${userId}`);

  // Notify user
  await notificationService.sendNotification({
    userId,
    type: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_CREATED,
    message: formatMessage(role, 'wallet', user.preferred_language || 'en', 'wallet.created', {
      walletId: wallet.id,
    }),
  });

  logger.info('Wallet created', { walletId: wallet.id, userId, role });
  return wallet;
});

/**
 * Adds funds to a wallet using a payment method.
 * @param {string} walletId - Wallet ID.
 * @param {number} amount - Amount to add.
 * @param {Object} paymentMethod - Payment method details (e.g., type, id).
 * @returns {Promise<Object>} Transaction object.
 */
const addFunds = catchAsync(async (walletId, amount, paymentMethod) => {
  const wallet = await Wallet.findByPk(walletId);
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  // Validate payment method
  if (!paymentMethod || !Object.values(paymentConstants.PAYMENT_METHODS).includes(paymentMethod.type)) {
    throw new AppError('Invalid payment method', 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
  }
  await validation.validatePaymentMethod(paymentMethod);

  // Validate amount
  const depositLimits = paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'DEPOSIT');
  if (!depositLimits || amount < depositLimits.min || amount > depositLimits.max) {
    throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);
  }

  // Check daily transaction limit
  const today = new Date().setHours(0, 0, 0, 0);
  const transactionCount = await WalletTransaction.count({
    where: { wallet_id: walletId, created_at: { [Op.gte]: today } },
  });
  if (transactionCount >= paymentConstants.WALLET_SETTINGS.TRANSACTION_LIMIT_PER_DAY) {
    throw new AppError('Daily transaction limit exceeded', 400, paymentConstants.ERROR_CODES.TRANSACTION_LIMIT_EXCEEDED);
  }

  // Tokenize and process payment
  const tokenizedMethod = await securityService.tokenizePaymentMethod(paymentMethod, {
    provider: paymentConstants.SECURITY_CONSTANTS.TOKENIZATION_PROVIDER,
  });
  const paymentResult = await securityService.processPayment({
    paymentMethodId: tokenizedMethod.id,
    amount,
    currency: wallet.currency,
    provider: paymentConstants.SECURITY_CONSTANTS.TOKENIZATION_PROVIDER,
  });
  if (paymentResult.status !== 'success') {
    throw new AppError('Payment processing failed', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }

  // Update balance
  const newBalance = wallet.balance + amount;
  if (newBalance > paymentConstants.WALLET_SETTINGS.MAX_BALANCE) {
    throw new AppError('Maximum balance exceeded', 400, paymentConstants.ERROR_CODES.INVALID_BALANCE);
  }

  // Create transaction
  const transaction = await WalletTransaction.create({
    wallet_id: walletId,
    type: paymentConstants.TRANSACTION_TYPES.DEPOSIT,
    amount,
    currency: wallet.currency,
    status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
    payment_method_id: tokenizedMethod.id,
    created_at: new Date(),
    updated_at: new Date(),
  });

  await wallet.update({ balance: newBalance, updated_at: new Date() });

  // Log audit event
  await auditService.logAction({
    userId: wallet.user_id,
    role: wallet.wallet_type,
    action: 'PROCESS_DEPOSIT',
    details: { walletId, amount, currency: wallet.currency, paymentMethodId: tokenizedMethod.id },
    ipAddress: 'system-generated',
  });

  // Emit socket event
  await socketService.emit(global.io, socketConstants.SOCKET_EVENT_TYPES.TRANSACTION_COMPLETED, {
    userId: wallet.user_id,
    role: wallet.wallet_type,
    walletId,
    transactionId: transaction.id,
    amount,
    type: paymentConstants.TRANSACTION_TYPES.DEPOSIT,
    auditAction: 'TRANSACTION_SUCCESS',
    details: { amount, currency: wallet.currency },
  }, `user:${wallet.user_id}`);

  // Notify user
  await notificationService.sendNotification({
    userId: wallet.user_id,
    type: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DEPOSIT_CONFIRMED,
    message: formatMessage(
      wallet.wallet_type,
      'wallet',
      (await User.findByPk(wallet.user_id)).preferred_language || 'en',
      'wallet.deposit_confirmed',
      { amount, currency: wallet.currency }
    ),
  });

  logger.info('Funds added', { walletId, transactionId: transaction.id, amount });
  return transaction;
});

/**
 * Withdraws funds from a wallet to a destination with enhanced security.
 * @param {string} walletId - Wallet ID.
 * @param {number} amount - Amount to withdraw.
 * @param {Object} destination - Destination details (paymentMethodId, sessionToken, ipAddress).
 * @returns {Promise<Object>} Transaction object.
 */
const withdrawFunds = catchAsync(async (walletId, amount, { paymentMethodId, sessionToken, ipAddress }) => {
  const wallet = await Wallet.findByPk(walletId);
  if (!wallet) {
    throw new AppError('Wallet not found', '404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  // Validate destination
  if (!paymentMethodId || !sessionToken || !ipAddress) {
    throw new AppError('Invalid destination details', 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
  }

  // Validate payment method
  const paymentMethod = wallet.payment_methods?.find(method => method.id === paymentMethodId);
  if (!paymentMethod || !paymentConstants.PAYMENT_METHODS.includes(paymentMethod.type)) {
    throw new AppError('Invalid payment method', '400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
  }
  const paymentMethodStatus = await securityService.verifyPaymentMethodToken(paymentMethodId);
  if (!paymentMethodStatus.valid) {
    throw new AppError('Invalid payment method token', '400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
  }

  // Validate amount
  const withdrawalLimits = paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'WITHDRAWAL');
  if (!withdrawalLimits || amount < withdrawalLimits.min || amount > withdrawalLimits.max) {
    throw new AppError('Invalid withdrawal amount', '400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);
  }
  if (wallet.balance < amount) {
    throw new AppError('Insufficient funds', '400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
  }

  // Security checks
  const kycStatus = await securityService.verifyKYC(wallet.user_id, paymentConstants.SECURITY_CONSTANTS.KYC_REQUIREMENTS);
  if (!kycStatus.verified) {
    throw new AppError('KYC not completed', '400, paymentConstants.ERROR_CODES.KYC_NOT_COMPLETED);
  }

  if (amount >= paymentConstants.SECURITY_CONSTANTS.AML_THRESHOLD) {
    const amlResult = await securityService.performAMLCheck(wallet.user_id, amount);
    if (!amlResult.passed) {
      throw new AppError('AML check failed', '400, paymentConstants.ERROR_CODES.AML_CHECK_FAILED);
    }
  }

  const mfaStatus = await securityService.verifyMFA(wallet.user_id, paymentConstants.SECURITY_CONSTANTS.MFA_METHODS);
  if (!mfaStatus.verified) {
    throw new AppError('MFA verification required', '400, paymentConstants.ERROR_CODES.MFA_FAILED);
  }

  const sessionStatus = await securityService.validateSessionToken(wallet.user_id, sessionToken, {
    expiryMinutes: paymentConstants.SECURITY_CONSTANTS.SESSION_TOKEN_EXPIRY_MINUTES,
  });
  if (!sessionStatus.valid) {
    throw new AppError('Invalid session token', '401, paymentConstants.ERROR_CODES.INVALID_SESSION_TOKEN);
  }

  const user = await User.findByPk(wallet.user_id);
  if (!user.trusted_ips.includes(ipAddress)) {
    await auditService.logAction({
      userId: wallet.user_id,
      role: wallet.wallet_type,
      action: 'SUSPICIOUS_WITHDRAWAL_ATTEMPT',
      details: { walletId, ipAddress },
      ipAddress,
    });
    throw new AppError('Untrusted IP address', '403, paymentConstants.ERROR_CODES.INVALID_IP_ADDRESS);
  }

  // Check withdrawal attempt limit
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const withdrawalAttempts = await WalletTransaction.count({
    where: {
      wallet_id: walletId,
      type: paymentConstants.TRANSACTION_TYPES.WITHDRAWAL,
      created_at: { [Op.gte]: oneHourAgo },
    },
  });
  if (withdrawalAttempts >= paymentConstants.SECURITY_CONSTANTS.MAX_WITHDRAWAL_ATTEMPTS_PER_HOUR) {
    throw new AppError('Maximum withdrawal attempts exceeded', '429, paymentConstants.ERROR_CODES.WITHDRAWAL_ATTEMPTS_EXCEEDED);
  }

  // Check daily transaction limit
  const today = new Date().setHours(0, 0, 0, 0);
  const transactionCount = await WalletTransaction.count({
    where: { wallet_id: walletId, created_at: { [Op.gte]: today } },
  });
  if (transactionCount >= paymentConstants.WALLET_SETTINGS.TRANSACTION_LIMIT_PER_DAY) {
    throw new AppError('Daily transaction limit exceeded', '400, paymentConstants.ERROR_CODES.TRANSACTION_LIMIT_EXCEEDED);
  }

  // Risk scoring
  const riskScore = await securityService.calculateTransactionRisk({
    userId: wallet.user_id,
    walletId,
    amount,
    paymentMethodId,
    ipAddress,
    transactionType: paymentConstants.TRANSACTION_TYPES.WITHDRAWAL,
  });
  if (riskScore > paymentConstants.SECURITY_CONSTANTS.ANOMALY_RISK_THRESHOLD) {
    await auditService.logAction({
      userId: wallet.user_id,
      role: wallet.wallet_type,
      action: 'ANOMALOUS_WITHDRAWAL',
      details: { walletId, amount, riskScore },
      ipAddress,
    });
    throw new AppError('Anomalous transaction detected', '403, paymentConstants.ERROR_CODES.ANOMALY_DETECTED);
  }

  // Sign transaction
  const transactionData = { wallet_id: walletId, amount, currency: wallet.currency, payment_method_id: paymentMethodId };
  const transactionSignature = await securityService.signTransaction(transactionData, {
    algorithm: paymentConstants.SECURITY_CONSTANTS.ENCRYPTION_ALGORITHM,
  });

  // Process withdrawal
  const withdrawalResult = await securityService.processWithdrawal({
    paymentMethodId,
    amount,
    currency: wallet.currency,
    provider: paymentConstants.SECURITY_CONSTANTS.TOKENIZATION_PROVIDER,
    transactionSignature,
  });
  if (withdrawalResult.status !== 'success') {
    throw new AppError('Withdrawal processing failed', '400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }

  // Create transaction
  const transaction = await WalletTransaction.create({
    wallet_id: walletId,
    type: paymentConstants.TRANSACTION_TYPES.WITHDRAWAL,
    amount,
    currency: wallet.currency,
    status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
    payment_method_id: paymentMethodId,
    transaction_signature: transactionSignature,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Update balance
  const newBalance = wallet.balance - amount;
  await wallet.update({ balance: newBalance, updated_at: new Date() });

  // Log audit event
  await auditService.logAction({
    userId: wallet.user_id,
    role: wallet.wallet_type,
    action: 'PROCESS_WITHDRAWAL',
    details: { walletId, amount, currency: wallet.currency, paymentMethodId, ipAddress, transactionSignature },
    ipAddress,
  });

  // Emit socket event
  await socketService.emit(global.io, socketConstants.SOCKET_EVENT_TYPES.TRANSACTION_COMPLETED, {
    userId: wallet.user_id,
    role: wallet.wallet_type,
    walletId,
    transactionId: transaction.id,
    amount,
    type: paymentConstants.TRANSACTION_TYPES.WITHDRAWAL,
    auditAction: 'TRANSACTION_SUCCESS',
    details: { amount, currency: wallet.currency },
  }, `user:${wallet.user_id}`);

  // Notify user
  await notificationService.sendNotification({
    userId: wallet.user_id,
    type: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WITHDRAWAL_PROCESSED,
    message: formatMessage(wallet.wallet_type, 'wallet', user.preferred_language || 'en', 'wallet.withdrawal_confirmed', {
      amount,
      currency: wallet.currency,
    }),
  });

  logger.info('Withdrawal processed', { walletId, transactionId: transaction.id, amount });
  return transaction;
});

/**
 * Processes a payment from a wallet for a service.
 * @param {string} walletId - Wallet ID.
 * @param {string} serviceId - Service ID (mtables, munch, mtxi).
 * @param {number} amount - Payment amount.
 * @returns {Promise<Object>} Transaction object.
 */
const payWithWallet = catchAsync(async (walletId, serviceId, amount) => {
  const wallet = await Wallet.findByPk(walletId);
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  // Validate service
  const validServices = ['mtables', 'munch', 'mtxi'];
  if (!serviceId || !validServices.includes(serviceId)) {
    throw new AppError('Invalid service ID', 400, paymentConstants.ERROR_CODES.INVALID_SERVICE);
  }

  // Validate amount
  const paymentLimits = paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT');
  if (!paymentLimits || amount < paymentLimits.min || amount > paymentLimits.max) {
    throw new AppError('Invalid payment amount', 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);
  }
  if (wallet.balance < amount) {
    throw new AppError('Insufficient funds', 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
  }

  // Check daily transaction limit
  const today = new Date().setHours(0, 0, 0, 0);
  const transactionCount = await WalletTransaction.count({
    where: { wallet_id: walletId, created_at: { [Op.gte]: today } },
  });
  if (transactionCount >= paymentConstants.WALLET_SETTINGS.TRANSACTION_LIMIT_PER_DAY) {
    throw new AppError('Daily transaction limit exceeded', 400, paymentConstants.ERROR_CODES.TRANSACTION_LIMIT_EXCEEDED);
  }

  // Create transaction
  const transaction = await WalletTransaction.create({
    wallet_id: walletId,
    type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
    amount,
    currency: wallet.currency,
    status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
    description: `Payment for service: ${serviceId}`,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Update balance
  const newBalance = wallet.balance - amount;
  await wallet.update({ balance: newBalance, updated_at: new Date() });

  // Log audit event
  await auditService.logAction({
    userId: wallet.user_id,
    role: wallet.wallet_type,
    action: 'PROCESS_PAYMENT',
    details: { walletId, serviceId, amount, currency: wallet.currency },
    ipAddress: 'system-generated',
  });

  // Emit socket event
  await socketService.emit(global.io, socketConstants.SOCKET_EVENT_TYPES.TRANSACTION_COMPLETED, {
    userId: wallet.user_id,
    role: wallet.wallet_type,
    walletId,
    transactionId: transaction.id,
    amount,
    type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
    auditAction: 'TRANSACTION_SUCCESS',
    details: { serviceId, amount, currency: wallet.currency },
  }, `user:${wallet.user_id}`);

  // Notify user
  await notificationService.sendNotification({
    userId: wallet.user_id,
    type: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
    message: formatMessage(wallet.wallet_type, 'wallet', (await User.findByPk(wallet.user_id)).preferred_language || 'en', 'wallet.payment_confirmed', {
      amount,
      currency: wallet.currency,
      serviceId,
    }),
  });

  logger.info('Payment processed', { walletId, transactionId: transaction.id, serviceId, amount });
  return transaction;
});

/**
 * Retrieves the balance of a wallet.
 * @param {string} walletId - Wallet ID.
 * @returns {Promise<Object>} Wallet balance details.
 */
const getWalletBalance = catchAsync(async (walletId) => {
  // Check cache
  const cacheKey = `balance_${walletId}`;
  const cachedBalance = walletCache.get(cacheKey);
  if (cachedBalance) {
    logger.info('Balance retrieved from cache', { walletId });
    return cachedBalance;
  }

  const wallet = await Wallet.findByPk(walletId, {
    attributes: ['id', 'balance', 'currency', 'wallet_type'],
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  const balanceData = {
    walletId: wallet.id,
    balance: wallet.balance,
    currency: wallet.currency,
    walletType: wallet.wallet_type,
  };

  // Cache result
  walletCache.set(cacheKey, balanceData);

  // Log audit event
  await auditService.logAction({
    userId: wallet.user_id,
    role: wallet.wallet_type,
    action: 'GET_WALLET_BALANCE',
    details: { walletId },
    ipAddress: 'system-generated',
  });

  // Emit socket event
  await socketService.emit(global.io, socketConstants.SOCKET_EVENT_TYPES.WALLET_UPDATED, {
    userId: wallet.user_id,
    role: wallet.wallet_type,
    walletId,
    balance: wallet.balance,
    auditAction: 'BALANCE_CHECK',
    details: { currency: wallet.currency },
  }, `user:${wallet.user_id}`);

  logger.info('Balance retrieved', { walletId, balance: wallet.balance });
  return balanceData;
});

/**
 * Retrieves transaction history for a wallet.
 * @param {string} walletId - Wallet ID.
 * @returns {Promise<Array>} Array of transaction objects.
 */
const getWalletTransactions = catchAsync(async (walletId) => {
  const wallet = await Wallet.findByPk(walletId);
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  // Check cache
  const cacheKey = `transactions_${walletId}`;
  const cachedTransactions = walletCache.get(cacheKey);
  if (cachedTransactions) {
    logger.info('Transactions retrieved from cache', { walletId });
    return cachedTransactions;
  }

  const transactions = await WalletTransaction.findAll({
    where: { wallet_id: walletId },
    order: [['created_at', 'DESC']],
  });

  // Cache result
  walletCache.set(cacheKey, transactions);

  // Log audit event
  await auditService.logAction({
    userId: wallet.user_id,
    role: wallet.wallet_type,
    action: 'GET_TRANSACTION_HISTORY',
    details: { walletId, transactionCount: transactions.length },
    ipAddress: 'system-generated',
  });

  // Emit socket event
  await socketService.emit(global.io, socketConstants.SOCKET_EVENT_TYPES.TRANSACTION_HISTORY, {
    userId: wallet.user_id,
    role: wallet.wallet_type,
    walletId,
    transactionCount: transactions.length,
    auditAction: 'TRANSACTION_HISTORY_RETRIEVED',
    details: { walletId },
  }, `user:${wallet.user_id}`);

  logger.info('Transaction history retrieved', { walletId, transactionCount: transactions.length });
  return transactions;
});

module.exports = {
  createWallet,
  addFunds,
  withdrawFunds,
  payWithWallet,
  getWalletBalance,
  getWalletTransactions,
};