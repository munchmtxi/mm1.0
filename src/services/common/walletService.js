'use strict';

/**
 * Wallet Service
 * Manages wallet operations for customer, driver, merchant, and staff roles across services
 * (mtables, munch, mtxi, mevents, mpark). Supports wallet creation, funding, withdrawals, payments,
 * balance checks, transaction history, and gamification rewards. Integrates with auditService,
 * notificationService, securityService, socketService, and paymentConstants.
 * Last Updated: June 25, 2025
 */

const { Wallet, WalletTransaction, User, sequelize } = require('@models');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const socketService = require('@services/common/socketService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const localizationConstants = require('@constants/common/localizationConstants');
const validation = require('@utils/validation');
const paymentConstants = require('@constants/common/paymentConstants');
const socketConstants = require('@constants/common/socketConstants');
const catchAsync = require('@utils/catchAsync');
const { Op } = require('sequelize');
const NodeCache = require('node-cache');
const Redis = require('ioredis');
const config = require('@config/config');

// Initialize cache for wallet queries
const walletCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

// Redis client for rate limiting
const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
});

/**
 * Creates a wallet for a user based on their role.
 * @param {string} userId - User ID.
 * @param {string} role - User role (customer, driver, merchant, staff).
 * @param {string} [languageCode] - Language code for localized messages.
 * @returns {Promise<Object>} Created wallet object.
 */
const createWallet = catchAsync(async (req, res, next) => {
  const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.body;

  // Validate inputs
  validation.validateRequiredFields({ userId, role }, ['userId', 'role']);

  // Ensure user exists
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError(
      localizationConstants.getMessage('wallet.user_not_found', languageCode),
      404,
      paymentConstants.ERROR_CODES.USER_NOT_FOUND
    );
  }

  // Validate role
  if (!paymentConstants.WALLET_SETTINGS.WALLET_TYPES.includes(role)) {
    throw new AppError(
      localizationConstants.getMessage('wallet.invalid_role', languageCode, { role }),
      400,
      paymentConstants.ERROR_CODES.INVALID_WALLET_TYPE
    );
  }

  // Check if wallet already exists
  const existingWallet = await Wallet.findOne({ where: { user_id: userId } });
  if (existingWallet) {
    throw new AppError(
      localizationConstants.getMessage('wallet.already_exists', languageCode),
      400,
      paymentConstants.ERROR_CODES.WALLET_ALREADY_EXISTS
    );
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
    ipAddress: req.ip || 'system-generated',
  });

  // Emit socket event
  await socketService.emit(
    global.io,
    socketConstants.SOCKET_EVENT_TYPES.WALLET_CREATED,
    {
      userId,
      role,
      walletId: wallet.id,
      auditAction: 'WALLET_CREATED',
      details: { walletType: role, currency: wallet.currency },
    },
    `${role}:${userId}`,
    languageCode
  );

  // Notify user
  await notificationService.sendNotification({
    userId,
    type: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_CREATED,
    messageKey: 'wallet.created',
    messageParams: { walletId: wallet.id },
    role,
    module: 'wallet',
    languageCode,
  });

  logger.info('Wallet created', { walletId: wallet.id, userId, role });
  res.status(201).json({ success: true, data: wallet });
});

/**
 * Adds funds to a wallet using a payment method.
 * @param {string} walletId - Wallet ID.
 * @param {number} amount - Amount to add.
 * @param {Object} paymentMethod - Payment method details (e.g., type, id).
 * @param {string} [languageCode] - Language code for localized messages.
 * @returns {Promise<Object>} Transaction object.
 */
const addFunds = catchAsync(async (req, res, next) => {
  const { walletId, amount, paymentMethod, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.body;

  // Rate limit check
  const rateLimitKey = `wallet:transaction:${walletId}:hourly`;
  const transactionCount = await redisClient.get(rateLimitKey);
  if (parseInt(transactionCount) >= paymentConstants.WALLET_SETTINGS.TRANSACTION_LIMIT_PER_HOUR) {
    throw new AppError(
      localizationConstants.getMessage('wallet.transaction_limit_exceeded', languageCode),
      429,
      paymentConstants.ERROR_CODES.TRANSACTION_LIMIT_EXCEEDED
    );
  }

  const wallet = await Wallet.findByPk(walletId);
  if (!wallet) {
    throw new AppError(
      localizationConstants.getMessage('wallet.not_found', languageCode),
      404,
      paymentConstants.ERROR_CODES.WALLET_NOT_FOUND
    );
  }

  // Validate payment method
  if (!paymentMethod || !Object.values(paymentConstants.PAYMENT_METHODS).includes(paymentMethod.type)) {
    throw new AppError(
      localizationConstants.getMessage('wallet.invalid_payment_method', languageCode),
      400,
      paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD
    );
  }
  await validation.validatePaymentMethod(paymentMethod);

  // Validate amount
  const depositLimits = paymentConstants.FINANCIAL_LIMITS.find((l) => l.type === 'DEPOSIT');
  if (!depositLimits || amount < depositLimits.min || amount > depositLimits.max) {
    throw new AppError(
      localizationConstants.getMessage('wallet.invalid_amount', languageCode, {
        min: depositLimits.min,
        max: depositLimits.max,
      }),
      400,
      paymentConstants.ERROR_CODES.INVALID_AMOUNT
    );
  }

  // Check daily transaction limit
  const today = new Date().setHours(0, 0, 0, 0);
  const dailyTransactionCount = await WalletTransaction.count({
    where: { wallet_id: walletId, created_at: { [Op.gte]: today } },
  });
  if (dailyTransactionCount >= paymentConstants.WALLET_SETTINGS.TRANSACTION_LIMIT_PER_DAY) {
    throw new AppError(
      localizationConstants.getMessage('wallet.transaction_limit_exceeded', languageCode),
      400,
      paymentConstants.ERROR_CODES.TRANSACTION_LIMIT_EXCEEDED
    );
  }

  // Start transaction
  const transaction = await sequelize.transaction(async (t) => {
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
      throw new AppError(
        localizationConstants.getMessage('wallet.transaction_failed', languageCode),
        400,
        paymentConstants.ERROR_CODES.TRANSACTION_FAILED
      );
    }

    // Update balance
    const newBalance = wallet.balance + amount;
    if (newBalance > paymentConstants.WALLET_SETTINGS.MAX_BALANCE) {
      throw new AppError(
        localizationConstants.getMessage('wallet.max_balance_exceeded', languageCode),
        400,
        paymentConstants.ERROR_CODES.INVALID_BALANCE
      );
    }

    // Create transaction
    const walletTransaction = await WalletTransaction.create(
      {
        wallet_id: walletId,
        type: paymentConstants.TRANSACTION_TYPES.DEPOSIT,
        amount,
        currency: wallet.currency,
        status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
        payment_method_id: tokenizedMethod.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction: t }
    );

    await wallet.update({ balance: newBalance, updated_at: new Date() }, { transaction: t });

    return walletTransaction;
  });

  // Update rate limit
  await redisClient.incr(rateLimitKey);
  await redisClient.expire(rateLimitKey, 3600);

  // Log audit event
  await auditService.logAction({
    userId: wallet.user_id,
    role: wallet.wallet_type,
    action: 'PROCESS_DEPOSIT',
    details: { walletId, amount, currency: wallet.currency, paymentMethodId: transaction.payment_method_id },
    ipAddress: req.ip || 'system-generated',
  });

  // Emit socket event
  await socketService.emit(
    global.io,
    socketConstants.SOCKET_EVENT_TYPES.TRANSACTION_COMPLETED,
    {
      userId: wallet.user_id,
      role: wallet.wallet_type,
      walletId,
      transactionId: transaction.id,
      amount,
      type: paymentConstants.TRANSACTION_TYPES.DEPOSIT,
      auditAction: 'TRANSACTION_SUCCESS',
      details: { amount, currency: wallet.currency },
    },
    `${wallet.wallet_type}:${wallet.user_id}`,
    languageCode
  );

  // Notify user
  await notificationService.sendNotification({
    userId: wallet.user_id,
    type: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DEPOSIT_CONFIRMED,
    messageKey: 'wallet.deposit_confirmed',
    messageParams: { amount, currency: wallet.currency },
    role: wallet.wallet_type,
    module: 'wallet',
    languageCode,
  });

  logger.info('Funds added', { walletId, transactionId: transaction.id, amount });
  res.status(200).json({ success: true, data: transaction });
});

/**
 * Withdraws funds from a wallet to a destination with enhanced security.
 * @param {string} walletId - Wallet ID.
 * @param {number} amount - Amount to withdraw.
 * @param {Object} destination - Destination details (paymentMethodId, sessionToken, ipAddress).
 * @param {string} [languageCode] - Language code for localized messages.
 * @returns {Promise<Object>} Transaction object.
 */
const withdrawFunds = catchAsync(async (req, res, next) => {
  const {
    walletId,
    amount,
    destination: { paymentMethodId, sessionToken, ipAddress },
    languageCode = localizationConstants.DEFAULT_LANGUAGE,
  } = req.body;

  // Rate limit check
  const rateLimitKey = `wallet:transaction:${walletId}:hourly`;
  const transactionCount = await redisClient.get(rateLimitKey);
  if (parseInt(transactionCount) >= paymentConstants.WALLET_SETTINGS.TRANSACTION_LIMIT_PER_HOUR) {
    throw new AppError(
      localizationConstants.getMessage('wallet.transaction_limit_exceeded', languageCode),
      429,
      paymentConstants.ERROR_CODES.TRANSACTION_LIMIT_EXCEEDED
    );
  }

  const wallet = await Wallet.findByPk(walletId);
  if (!wallet) {
    throw new AppError(
      localizationConstants.getMessage('wallet.not_found', languageCode),
      404,
      paymentConstants.ERROR_CODES.WALLET_NOT_FOUND
    );
  }

  // Validate destination
  if (!paymentMethodId || !sessionToken || !ipAddress) {
    throw new AppError(
      localizationConstants.getMessage('wallet.invalid_destination', languageCode),
      400,
      paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD
    );
  }

  // Validate payment method
  const paymentMethodStatus = await securityService.verifyPaymentMethodToken(paymentMethodId);
  if (!paymentMethodStatus.valid) {
    throw new AppError(
      localizationConstants.getMessage('wallet.invalid_payment_method', languageCode),
      400,
      paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD
    );
  }

  // Validate amount
  const withdrawalLimits = paymentConstants.FINANCIAL_LIMITS.find((l) => l.type === 'WITHDRAWAL');
  if (!withdrawalLimits || amount < withdrawalLimits.min || amount > withdrawalLimits.max) {
    throw new AppError(
      localizationConstants.getMessage('wallet.invalid_amount', languageCode, {
        min: withdrawalLimits.min,
        max: withdrawalLimits.max,
      }),
      400,
      paymentConstants.ERROR_CODES.INVALID_AMOUNT
    );
  }
  if (wallet.balance < amount) {
    throw new AppError(
      localizationConstants.getMessage('wallet.insufficient_funds', languageCode),
      400,
      paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS
    );
  }

  // Security checks
  const kycStatus = await securityService.verifyKYC(wallet.user_id, paymentConstants.SECURITY_CONSTANTS.KYC_REQUIREMENTS);
  if (!kycStatus.verified) {
    throw new AppError(
      localizationConstants.getMessage('wallet.kyc_not_completed', languageCode),
      400,
      paymentConstants.ERROR_CODES.KYC_NOT_COMPLETED
    );
  }

  if (amount >= paymentConstants.SECURITY_CONSTANTS.AML_THRESHOLD) {
    const amlResult = await securityService.performAMLCheck(wallet.user_id, amount);
    if (!amlResult.passed) {
      throw new AppError(
        localizationConstants.getMessage('wallet.aml_check_failed', languageCode),
        400,
        paymentConstants.ERROR_CODES.AML_CHECK_FAILED
      );
    }
  }

  const mfaStatus = await securityService.verifyMFA(wallet.user_id, paymentConstants.SECURITY_CONSTANTS.MFA_METHODS);
  if (!mfaStatus.verified) {
    throw new AppError(
      localizationConstants.getMessage('wallet.mfa_failed', languageCode),
      400,
      paymentConstants.ERROR_CODES.MFA_FAILED
    );
  }

  const sessionStatus = await securityService.validateSessionToken(wallet.user_id, sessionToken, {
    expiryMinutes: paymentConstants.SECURITY_CONSTANTS.SESSION_TOKEN_EXPIRY_MINUTES,
  });
  if (!sessionStatus.valid) {
    throw new AppError(
      localizationConstants.getMessage('wallet.invalid_session_token', languageCode),
      401,
      paymentConstants.ERROR_CODES.INVALID_SESSION_TOKEN
    );
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
    throw new AppError(
      localizationConstants.getMessage('wallet.invalid_ip_address', languageCode),
      403,
      paymentConstants.ERROR_CODES.INVALID_IP_ADDRESS
    );
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
    throw new AppError(
      localizationConstants.getMessage('wallet.withdrawal_attempts_exceeded', languageCode),
      429,
      paymentConstants.ERROR_CODES.WITHDRAWAL_ATTEMPTS
    );
  }

  // Check daily transaction limit
  const today = new Date().setHours(0, 0, 0, 0);
  const dailyTransactionCount = await WalletTransaction.count({
    where: { wallet_id: walletId, created_at: { [Op.gte]: today } },
  });
  if (dailyTransactionCount >= paymentConstants.WALLET_SETTINGS.MAX_WALLET_TRANSACTIONS_PER_DAY) {
    throw new AppError(
      localizationConstants.getMessage('wallet.transaction_limit_exceeded', languageCode),
      400,
      paymentConstants.ERROR_CODES.TRANSACTION_LIMIT_EXCEEDED
    );
  }

  // Start transaction
  const transaction = await sequelize.transaction(async (t) => {
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
      await auditService.logAction(
        {
          userId: wallet.user_id,
          role: wallet.wallet_type,
          action: 'ANOMALY',
          details: { walletId, amount, riskScore },
          ipAddress,
        },
        { transaction: t }
      );
      throw new Error(localizationConstants.getMessage('wallet.anomaly_detected', languageCode));
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
      throw new Error(localizationConstants.getMessage('wallet.transaction_failed', languageCode));
    }

    // Create transaction
    const walletTransaction = await WalletTransaction.create(
      {
        wallet_id: walletId,
        type: paymentConstants.TRANSACTION_TYPES.WITHDRAWAL,
        amount,
        currency: wallet.currency,
        status: paymentConstants.SUCCESS_MESSAGES.WITHDRAWAL_SUCCESSFUL,
        payment_method_id: paymentMethodId,
        transaction_signature: transactionSignature,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction: t }
    );

    // Update balance
    const newBalance = wallet.balance - amount;
    await wallet.update({ balance: newBalance, updated_at: new Date() }, { transaction: t });

    return walletTransaction;
  });

  // Update rate limit
  await redisClient.incr(rateLimitKey);
  await redisClient.expire(rateLimitKey, 3600);

  // Log audit event
  await auditService.logAction({
    userId: wallet.user_id,
    role: wallet.wallet_type,
    action: 'PROCESS_WITHDRAWAL',
    details: { walletId, amount, currency: wallet.currency, paymentMethodId, ipAddress, transactionSignature: transaction.transaction_signature },
    ipAddress,
  });

  // Emit socket event
  await socketService.emit(
    global.io,
    socketConstants.SOCKET_EVENT_TYPES.TRANSACTION_COMPLETED,
    {
      userId: wallet.user_id,
      role: wallet.wallet_type,
      walletId,
      transactionId: transaction.id,
      amount,
      type: paymentConstants.TRANSACTION_TYPES.WITHDRAWAL,
      auditAction: 'TRANSACTION_SUCCESS',
      details: { amount, currency: wallet.currency },
    },
    `${wallet.wallet_type}:${wallet.user_id}`,
    languageCode
  );

  // Notify user
  await notificationService.sendNotification({
    userId: wallet.user_id,
    type: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WITHDRAWAL_PROCESSED,
    messageKey: 'wallet.withdrawal_confirmed',
    messageParams: { amount, currency: wallet.currency },
    role: wallet.wallet_type,
    module: 'wallet',
    languageCode,
  });

  logger.info('Withdrawal processed', { walletId, transactionId: transaction.id, amount });
  res.status(200).json({ success: true, transaction });
});

/**
 * Processes a payment from a wallet for a service.
 * @param {string} walletId - Wallet ID.
 * @param {string} serviceId - Service ID (mtables, munch, mtxi, mevents, mpark).
 * @param {number} amount - Payment amount.
 * @param {string} [languageCode] - Language code for for localized errors.
 * @returns {Promise<Object>} Transaction object.
 */
const payWithWallet = catchAsync(async (req, res, next) => {
    const { walletId, serviceId, amount, languageCode } = localizationConstants.DEFAULT_LANGUAGE;
    
    // Rate limit check
    const rateLimitKey = `wallet:transaction:${walletId}:hourly`;
    const transactionCount = await redisClient.get(rateLimitKey);
    if (parseInt(transactionCount) >= paymentConstants.WALLET_SETTINGS.MAX_WALLET_TRANSACTIONS_PER_HOUR) {
        throw new AppError(
            localizationConstants.getMessage('wallet.transaction_limit_exceeded', languageCode),
            429,
            paymentConstants.ERROR_CODES.TRANSACTION_LIMIT_EXCEEDED
        );
    }
    
    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
        throw new AppError(
            localizationConstants.getMessage('wallet.not_found', languageCode),
            404,
            paymentConstants.ERROR_CODES.WALLET_NOT_FOUND
        );
    }
    
    // Validate service
    const validServices = ['mtables', 'munch', 'mtxi', 'mevents', 'mpark'];
    if (!serviceId || !validServices.includes(serviceId)) {
        throw new AppError(
            localizationConstants.getMessage('wallet.invalid_service_id', languageCode),
            400,
            paymentConstants.ERROR_CODES.INVALID_SERVICE
        );
    }
    
    // Validate amount
    const paymentLimits = paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT');
    if (!paymentLimits || amount < paymentLimits.min || amount > paymentLimits.max_amount) {
        throw new AppError(
            localizationConstants.getMessage('wallet.invalid_amount', languageCode, {
                min: paymentLimits.min,
                max: paymentLimits.max
            }),
            400,
            paymentConstants.ERROR_CODES.INVALID_AMOUNT
        );
    }
    if (wallet.balance < amount) {
        throw new AppError(
            localizationConstants.getMessage('wallet.insufficient_funds', languageCode),
            400,
            paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS
        );
    }
    
    // Check daily transaction limit
    const today = new Date().setHours(0, 0, 0, 0);
    const dailyTransactionCount = await WalletTransaction.count({
        where: { wallet_id: walletId, created_at: { [Op.gte]: today } },
    });
    if (dailyTransactionCount >= paymentConstants.WALLET_SETTINGS.MAXIMUM_WALLET_TRANSACTIONS_PER_DAY) {
        throw new AppError(
            localizationConstants.getMessage('wallet.transaction_limit_exceeded', languageCode),
            400,
            paymentConstants.ERROR_CODES.TRANSACTION_LIMIT_EXCEEDED
        );
    }
    
    // Start transaction
    const transaction = await sequelize.transaction(async (t) => {
        // Create transaction
        const walletTransaction = await WalletTransaction.create(
            {
                wallet_id: walletId,
                type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
                amount,
                currency: wallet.currency,
                status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
                description: `Payment for service: serviceId:${serviceId}`,
                created_at: new Date(),
                updated_at: new Date(),
            },
            { transaction: t }
        );
        
        // Update balance
        const newBalance = wallet.balance - amount;
        await wallet.update({ balance: newBalance, updated_at: new Date() }, { transaction: t });
        
        return walletTransaction;
    };
    
    // Update rate limit
    await redisClient.incr(rateLimitKey);
    await redisClient.expire(rateLimitKey, 3600);
    
    // Log audit event
    await auditService.logAction({
        userId: wallet.user_id,
        role: wallet.wallet_type,
        action: 'PROCESS_PAYMENT',
        details: { walletId, serviceId, amount, currency: wallet.currency },
        ipAddress: req.ip || 'system-generated',
    });
    
    // Emit socket event
    await socketService.emit(
        global.io,
        socketConstants.SOCKET_EVENT_TYPES.TRANSACTION_COMPLETED,
        {
            userId: wallet.user_id,
            role: wallet.wallet_type,
            walletId,
            transactionId: transaction.id,
            amount,
            type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
            auditAction: 'TRANSACTION_SUCCESS',
            details: { serviceId, amount, currency: wallet.currency },
        },
        `${wallet.wallet_type}:${wallet.user_id}`,
        languageCode
    );
    
    // Notify user
    await notificationService.sendNotification({
        userId: wallet.user_id,
        type: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
        messageKey: 'wallet.payment_confirmed',
        messageParams: { amount, serviceId, currency: wallet.currency },
        role: wallet.wallet_type,
        module: 'wallet',
        languageCode,
    });
    
    logger.info('Payment processed', { walletId, transactionId: transaction.id, serviceId, amount });
    res.status(200).json({ success: true, data: transaction });
});

/**
 * Retrieves the balance of a wallet.
 * @param {string} walletId - Wallet ID.
 * @param {string} [languageCode] - Language code for localized messages.
 * @returns {Promise<Object>} Wallet balance details.
 */
const getWalletBalance = catchAsync(async (req, res, next) => {
    const { walletId, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.query;
    
    // Check cache
    const cacheKey = `balance_${walletId}`;
    const cachedBalance = walletCache.get(cacheKey);
    if (cachedBalance) {
        logger.info('Balance retrieved from cache', { walletId });
        return res.status(200).json({ success: true, data: cachedBalance });
    }
    
    const wallet = await Wallet.findByPk(walletId, {
        attributes: ['id', 'balance', 'currency', 'wallet_type'],
    });
    if (!wallet) {
        throw new AppError(
            localizationConstants.getMessage('wallet.not_found', languageCode),
            404,
            paymentConstants.ERROR_CODES.WALLET_NOT_FOUND
        );
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
        action: 'balance',
        details: { walletId },
        ipAddress: req.ip || 'system-generated',
    });
    
    // Emit socket event
    await socketService.emit(
        global.io,
        socketConstants.SOCKET_EVENT_TYPES.WALLET_UPDATED,
        {
            userId: wallet.user_id,
            role: wallet.wallet_type,
            walletId,
            balance: wallet.balance,
            auditAction: 'BALANCE_CHECK',
            details: { currency: wallet.currency },
        },
        `${wallet.wallet_type}:${wallet.user_id}`,
        languageCode
    });
    
    logger.info('Balance retrieved', { walletId, balance: wallet.balance });
    res.status(200).json({ success: true, data: balanceData });
});

/**
 * Retrieves transaction history for a wallet.
 * @param {string} walletId - Wallet ID.
 * @param {string} [languageCode] - Language code for localized messages.
 * @returns {Promise<Array>} Array of transaction objects.
 */
const getWalletTransactions = catchAsync(async (req, res, next) => {
    const { walletId, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.query;
    
    const wallet = await Wallet.findByPk(walletId);
    if (!wallet) {
        throw new AppError(
            localizationConstants.getMessage('wallet.not_found', languageCode),
            404,
            paymentConstants.ERROR_CODES.WALLET_NOT_FOUND
        );
    }
    
    // Check cache
    const cacheKey = `transactions_${walletId}`;
    const cachedTransactions = walletCache.get(cacheKey);
    if (cachedTransactions) {
        logger.info('Transactions retrieved from cache', { walletId });
        return res.status(200).json({ success: true, data: cachedTransactions });
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
        ipAddress: req.ip || 'system-generated',
    });
    
    // Emit socket event
    await socketService.emit(
        global.io,
        socketConstants.SOCKET_EVENT_TYPES.TRANSACTION_HISTORY,
        {
            userId: wallet.user_id,
            role: wallet.wallet_type,
            walletId,
            transactionCount: transactions.length,
            auditAction: 'TRANSACTION_HISTORY_RETRIEVED',
            details: { walletId },
        },
        `${wallet.wallet_type}:${wallet.user_id}`,
        languageCode
    );
    
    logger.info('Transaction history retrieved', { walletId, transactionCount: transactions.length });
    res.status(200).json({ success: true, data: transactions });
});

/**
 * Credits a wallet for a gamification reward.
 * @param {string} walletId - Wallet ID.
 * @param {number} amount - Reward amount to credit.
 * @param {string} rewardId - Gamification reward ID.
 * @param {string} description - Reward description.
 * @param {string} [languageCode] - Language code for localized messages.
 * @returns {Promise<Object>} Transaction object.
 */
const creditWalletForReward = catchAsync(async (req, res, next) => {
    const { walletId, amount, rewardId, description, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.body;
    
    // Rate limit check
    const rateLimitKey = `wallet:reward:${walletId}:hourly`;
    const rewardCount = await redisClient.get(rateLimitKey);
    if (parseInt(rewardCount) >= paymentConstants.WALLET_SETTINGS.MAX_REWARD_TRANSACTIONS_PER_HOUR) {
        throw new AppError(
            localizationConstants.getMessage('wallet.reward_limit_exceeded', languageCode),
            429,
            paymentConstants.ERROR_CODES.REWARD_LIMIT_EXCEEDED
        );
    }
    
    const wallet = await Wallet.findByPk(walletId);
    if (!wallet) {
        throw new AppError(
            localizationConstants.getMessage('wallet.not_found', languageCode),
            404,
            paymentConstants.ERROR_CODES.WALLET_NOT_FOUND
        );
    }
    
    // Validate amount
    if (amount <= 0) {
        throw new AppError(
            localizationConstants.getMessage('wallet.invalid_amount', languageCode, { min: 0.01 }),
            400,
            paymentConstants.ERROR_CODES.INVALID_AMOUNT
        );
    }
    
    // Start transaction
    const transaction = await sequelize.transaction(async (t) => {
        // Update balance
        const newBalance = wallet.balance + amount;
        if (newBalance > paymentConstants.WALLET_SETTINGS.MAXIMUM_BALANCE) {
            throw new Error(localizationConstants.getMessage('wallet.max_balance_exceeded', languageCode));
        }
        
        // Create transaction
        const walletTransaction = await WalletTransaction.create(
            {
                wallet_id: walletId,
                type: paymentConstants.TRANSACTION_TYPES.GAMIFICATION_REWARD,
                amount,
                currency: wallet.currency,
                status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
                description: description || `Gamification reward: ${rewardId}`,
                created_at: new Date(),
                updated_at: new Date(),
            },
            { transaction: t }
        );
        
        await wallet.update({ balance: newBalance, updated_at: new Date() }, { transaction: t });
        
        return walletTransaction;
    });
    
    // Update rate limit
    await redisClient.incr(rateLimitKey);
    await redisClient.expire(rateLimitKey, 3600);
    
    // Log audit event
    await auditService.logAction({
        userId: wallet.user_id,
        role: wallet.wallet_type,
        action: 'PROCESS_REWARD_CREDIT',
        details: { walletId, amount, rewardId, currency: wallet.currency },
        ipAddress: req.ip || 'system-generated',
    });
    
    // Emit socket event
    await socketService.emit(
        global.io,
        socketConstants.SOCKET_EVENT_TYPES.GAMIFICATION_REWARD_REDEEMED,
        {
            userId: wallet.user_id,
            role: wallet.wallet_type,
            walletId,
            transactionId: transaction.id,
            amount,
            rewardId,
            auditAction: 'REWARD_SUCCESS',
            details: { amount, currency: wallet.currency, description: transaction.description },
        },
        `${wallet.wallet_type}:${wallet.user_id}`,
        languageCode
    );
    
    // Notify user
    await notificationService.sendNotification({
        userId: wallet.user_id,
        type: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.REWARD_CREDITED,
        messageKey: 'wallet.reward_credited',
        messageParams: { amount, currency: wallet.currency, reward: description },
        role: wallet.wallet_type,
        module: 'wallet',
        languageCode,
    });
    
    logger.info('Wallet credited for reward', { walletId, transactionId: transaction.id, amount, rewardId });
    res.status(200).json({ success: true, data: transaction });
});

module.exports = {
    createWallet,
    addFunds,
    withdrawFunds,
    payWithWallet,
    getWalletBalance,
    getWalletTransactions,
    creditWalletForReward,
};