'use strict';

const { Wallet, Driver, WalletTransaction, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const driverWalletConstants = require('@constants/driver/driverWalletConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { handleServiceError } = require('@utils/errorHandling');
const { roundToDecimal } = require('@utils/mathUtils');
const { getStartOfDay, getEndOfDay } = require('@utils/dateTimeUtils');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function getWalletBalance(driverId, currency = localizationConstants.DEFAULT_CURRENCY) {
  try {
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
    }

    const wallet = await Wallet.findOne({
      where: { user_id: driver.user_id, type: driverWalletConstants.WALLET_CONSTANTS.WALLET_TYPE },
    });
    if (!wallet) {
      throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
    }

    const todayStart = getStartOfDay(new Date());
    const todayEnd = getEndOfDay(new Date());
    const recentTransactions = await WalletTransaction.findAll({
      where: {
        wallet_id: wallet.id,
        created_at: { [Op.between]: [todayStart, todayEnd] },
      },
      limit: 5,
      order: [['created_at', 'DESC']],
    });

    logger.info('Wallet balance retrieved', { driverId, walletId: wallet.id, currency });
    return {
      driverId,
      walletId: wallet.id,
      balance: roundToDecimal(parseFloat(wallet.balance), 2),
      lockedBalance: roundToDecimal(parseFloat(wallet.locked_balance || 0), 2),
      currency: localizationConstants.SUPPORTED_CURRENCIES.includes(currency) ? currency : wallet.currency,
      recentTransactions: recentTransactions.map(t => ({
        amount: roundToDecimal(parseFloat(t.amount), 2),
        type: t.type,
        status: t.status,
        created_at: t.created_at,
      })),
      supportedCurrencies: localizationConstants.SUPPORTED_CURRENCIES,
    };
  } catch (error) {
    throw handleServiceError('getWalletBalance', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

async function updateBalance(driverId, amount, type, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!driverWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.includes(type)) {
    throw new AppError('Invalid transaction type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const limits = paymentConstants.FINANCIAL_LIMITS.find(l => l.type === type.toUpperCase());
  if (!limits || amount < limits.min || amount > limits.max) {
    throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: driverWalletConstants.WALLET_CONSTANTS.WALLET_TYPE },
    include: [{ model: WalletTransaction, as: 'transactions' }],
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  const transaction = await sequelize.transaction();
  try {
    const newBalance = roundToDecimal(parseFloat(wallet.balance) + amount, 2);
    if (
      newBalance < paymentConstants.WALLET_SETTINGS.MIN_BALANCE ||
      newBalance > paymentConstants.WALLET_SETTINGS.MAX_BALANCE
    ) {
      throw new AppError('Balance out of bounds', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
    }

    await wallet.update({ balance: newBalance, currency }, { transaction });
    await WalletTransaction.create({
      wallet_id: wallet.id,
      type,
      amount: roundToDecimal(amount, 2),
      currency,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      description: `Balance update: ${type}`,
    }, { transaction });

    await transaction.commit();
    logger.info('Balance updated', { driverId, amount, type, newBalance, currency });
    return {
      driverId,
      walletId: wallet.id,
      balance: newBalance,
      currency,
      transactionType: type,
    };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('updateBalance', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

async function lockBalance(driverId, amount) {
  if (amount <= 0) {
    throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: driverWalletConstants.WALLET_CONSTANTS.WALLET_TYPE },
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  if (parseFloat(wallet.balance) < amount) {
    throw new AppError('Insufficient funds', 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
  }

  const transaction = await sequelize.transaction();
  try {
    const lockedBalance = roundToDecimal(parseFloat(wallet.locked_balance || 0) + amount, 2);
    await wallet.update({ locked_balance: lockedBalance }, { transaction });
    await WalletTransaction.create({
      wallet_id: wallet.id,
      type: 'lock',
      amount: roundToDecimal(amount, 2),
      currency: wallet.currency,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      description: 'Balance locked',
    }, { transaction });

    await transaction.commit();
    logger.info('Balance locked', { driverId, amount, lockedBalance });
    return { driverId, amount, lockedBalance, currency: wallet.currency };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('lockBalance', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

async function unlockBalance(driverId, amount) {
  if (amount <= 0) {
    throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: driverWalletConstants.WALLET_CONSTANTS.WALLET_TYPE },
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  const currentLocked = parseFloat(wallet.locked_balance || 0);
  if (currentLocked < amount) {
    throw new AppError('Insufficient locked funds', 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
  }

  const transaction = await sequelize.transaction();
  try {
    const lockedBalance = roundToDecimal(currentLocked - amount, 2);
    await wallet.update({ locked_balance: lockedBalance }, { transaction });
    await WalletTransaction.create({
      wallet_id: wallet.id,
      type: 'unlock',
      amount: roundToDecimal(amount, 2),
      currency: wallet.currency,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      description: 'Balance unlocked',
    }, { transaction });

    await transaction.commit();
    logger.info('Balance unlocked', { driverId, amount, lockedBalance });
    return { driverId, amount, lockedBalance, currency: wallet.currency };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('unlockBalance', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

async function convertBalance(driverId, targetCurrency) {
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(targetCurrency)) {
    throw new AppError('Invalid target currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: driverWalletConstants.WALLET_CONSTANTS.WALLET_TYPE },
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  try {
    // Mock conversion rate (in a real system, fetch from an external API)
    const conversionRates = {
      USD: { EUR: 0.85, GBP: 0.73, MWK: 1700 },
      EUR: { USD: 1.18, GBP: 0.86, MWK: 2000 },
      GBP: { USD: 1.37, EUR: 1.16, MWK: 2300 },
      MWK: { USD: 0.00059, EUR: 0.0005, GBP: 0.00043 },
    };
    const rate = conversionRates[wallet.currency]?.[targetCurrency] || 1;
    const convertedBalance = roundToDecimal(parseFloat(wallet.balance) * rate, 2);
    const convertedLockedBalance = roundToDecimal(parseFloat(wallet.locked_balance || 0) * rate, 2);

    logger.info('Balance converted', { driverId, fromCurrency: wallet.currency, toCurrency: targetCurrency });
    return {
      driverId,
      walletId: wallet.id,
      balance: convertedBalance,
      lockedBalance: convertedLockedBalance,
      originalCurrency: wallet.currency,
      targetCurrency,
    };
  } catch (error) {
    throw handleServiceError('convertBalance', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

async function estimateTaxImpact(driverId, amount, transactionType) {
  if (!driverWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.includes(transactionType)) {
    throw new AppError('Invalid transaction type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (amount <= 0) {
    throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  try {
    const taxRate = payoutConstants.DRIVER_REVENUE_SETTINGS.TAX_RATES[driver.country]?.VAT || 0;
    const taxAmount = roundToDecimal(amount * taxRate, 2);
    const netAmount = roundToDecimal(amount - taxAmount, 2);

    logger.info('Tax impact estimated', { driverId, amount, transactionType, taxAmount });
    return {
      driverId,
      amount,
      transactionType,
      taxAmount,
      netAmount,
      currency: localizationConstants.COUNTRY_CURRENCY_MAP[driver.country] || localizationConstants.DEFAULT_CURRENCY,
      taxRate,
    };
  } catch (error) {
    throw handleServiceError('estimateTaxImpact', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

module.exports = {
  getWalletBalance,
  updateBalance,
  lockBalance,
  unlockBalance,
  convertBalance,
  estimateTaxImpact,
};