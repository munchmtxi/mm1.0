'use strict';

const { sequelize, Merchant, MerchantBranch, Payment, Wallet, WalletTransaction } = require('@models');
const merchantConstants = require('@constants/merchant/merchantRevenueStreamConstants');
const restaurantConstants = require('@constants/merchant/restaurantConstants');
const parkingLotConstants = require('@constants/merchant/parkingLotConstants');
const groceryConstants = require('@constants/merchant/groceryConstants');
const darkKitchenConstants = require('@constants/merchant/darkKitchenConstants');
const catererConstants = require('@constants/merchant/catererConstants');
const cafeConstants = require('@constants/merchant/cafeConstants');
const butcherConstants = require('@constants/merchant/butcherConstants');
const bakeryConstants = require('@constants/merchant/bakeryConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/appError');
const { roundToDecimal, clamp } = require('@utils/mathUtils');
const { getCurrentTimestamp } = require('@utils/dateTimeUtils');

async function calculateEarnings(merchantId, serviceType, transactionAmount, isPremium = false) {
  try {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');

    const businessType = merchant.business_type;
    const serviceConstants = {
      restaurant: restaurantConstants,
      parking_lot: parkingLotConstants,
      grocery: groceryConstants,
      dark_kitchen: darkKitchenConstants,
      caterer: catererConstants,
      cafe: cafeConstants,
      butcher: butcherConstants,
      bakery: bakeryConstants,
    }[businessType];

    if (!serviceConstants?.BUSINESS_SETTINGS?.services?.includes(serviceType)) {
      throw new AppError('Invalid service type for merchant', 400, 'INVALID_SERVICE_TYPE');
    }

    const serviceConfig = merchantConstants.MERCHANT_REVENUE_STREAMS[serviceType.toUpperCase()];
    if (!serviceConfig) throw new AppError('Invalid service type', 400, 'INVALID_SERVICE_TYPE');

    const commissionRate = isPremium
      ? serviceConfig.MERCHANT_EARNINGS.PREMIUM_SUBSCRIPTION_PERCENTAGE
      : serviceConfig.MERCHANT_EARNINGS.BASE_PERCENTAGE;
    const processingFee = serviceConfig.MERCHANT_EARNINGS.DEDUCTIONS.MERCHANT_PROCESSING_FEE;

    const commission = clamp(
      roundToDecimal((transactionAmount * commissionRate) / 100, 2),
      serviceConfig.MERCHANT_EARNINGS.DEDUCTIONS.PLATFORM_COMMISSION.MIN_COMMISSION,
      serviceConfig.MERCHANT_EARNINGS.DEDUCTIONS.PLATFORM_COMMISSION.MAX_COMMISSION
    );
    const merchantShare = roundToDecimal(
      isPremium
        ? (transactionAmount * serviceConfig.MERCHANT_EARNINGS.PREMIUM_SUBSCRIPTION_SHARE) / 100
        : (transactionAmount * serviceConfig.MERCHANT_EARNINGS.BASE_SHARE) / 100,
      2
    );

    const countryCode = Object.keys(merchantConstants.MERCHANT_REVENUE_SETTINGS.COUNTRY_CURRENCY_MAP)
      .find(key => merchantConstants.MERCHANT_REVENUE_SETTINGS.COUNTRY_CURRENCY_MAP[key] === merchant.currency);
    const taxRate = merchantConstants.MERCHANT_REVENUE_SETTINGS.TAX_COMPLIANCE.TAX_RATES[countryCode]?.VAT || 0;
    const taxAmount = roundToDecimal(merchantShare * taxRate, 2);

    const netEarnings = roundToDecimal(merchantShare - commission - processingFee - taxAmount, 2);

    return {
      grossEarnings: transactionAmount,
      merchantShare,
      commission,
      processingFee,
      taxAmount,
      netEarnings,
      currency: merchant.currency,
      timestamp: getCurrentTimestamp(),
    };
  } catch (error) {
    logger.logErrorEvent('Error calculating earnings', { merchantId, serviceType, error: error.message });
    throw new AppError(`Failed to calculate earnings: ${error.message}`, 500, 'CALCULATION_ERROR', null, { merchantId, serviceType });
  }
}

async function applySubscriptionFee(merchantId, planName) {
  const transaction = await sequelize.transaction();
  try {
    const merchant = await Merchant.findByPk(merchantId, { transaction });
    if (!merchant) throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');

    const plan = merchantConstants.SUBSCRIPTION_COSTS.PLANS.find(p => p.NAME === planName);
    if (!plan) throw new AppError('Invalid subscription plan', 400, 'INVALID_SUBSCRIPTION_PLAN');

    const wallet = await Wallet.findOne({ where: { merchant_id: merchantId }, transaction });
    if (!wallet) throw new AppError('Merchant wallet not found', 404, 'WALLET_NOT_FOUND');

    const countryCode = Object.keys(merchantConstants.MERCHANT_REVENUE_SETTINGS.COUNTRY_CURRENCY_MAP)
      .find(key => merchantConstants.MERCHANT_REVENUE_SETTINGS.COUNTRY_CURRENCY_MAP[key] === merchant.currency);
    const fee = roundToDecimal(plan.PRICE[countryCode], 2);
    if (wallet.balance < fee) throw new AppError('Insufficient wallet balance for subscription', 400, 'INSUFFICIENT_BALANCE');

    wallet.balance = roundToDecimal(wallet.balance - fee, 2);
    await wallet.save({ transaction });

    const walletTransaction = await WalletTransaction.create({
      wallet_id: wallet.id,
      type: 'subscription_fee',
      amount: fee,
      currency: wallet.currency,
      status: 'completed',
      description: `${planName} subscription fee`,
      created_at: getCurrentTimestamp(),
    }, { transaction });

    const payment = await Payment.create({
      merchant_id: merchantId,
      amount: fee,
      payment_method: 'wallet',
      status: 'completed',
      transaction_id: `SUB-${walletTransaction.id}`,
      provider: 'wallet',
      payment_details: { plan: planName },
      created_at: getCurrentTimestamp(),
    }, { transaction });

    await transaction.commit();

    logger.logApiEvent('Subscription fee applied', { merchantId, planName, amount: fee });

    return {
      transactionId: payment.transaction_id,
      amount: fee,
      plan: planName,
      status: payment.status,
      timestamp: getCurrentTimestamp(),
    };
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Error applying subscription fee', { merchantId, planName, error: error.message });
    throw new AppError(`Failed to apply subscription fee: ${error.message}`, 500, 'SUBSCRIPTION_ERROR', null, { merchantId, planName });
  }
}

async function recordAnalytics(merchantId, serviceType, metric, value) {
  try {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');

    const businessType = merchant.business_type;
    const serviceConstants = {
      restaurant: restaurantConstants,
      parking_lot: parkingLotConstants,
      grocery: groceryConstants,
      dark_kitchen: darkKitchenConstants,
      caterer: catererConstants,
      cafe: cafeConstants,
      butcher: butcherConstants,
      bakery: bakeryConstants,
    }[businessType];

    if (!serviceConstants?.ANALYTICS_CONSTANTS?.METRICS?.includes(metric)) {
      throw new AppError('Invalid metric for merchant type', 400, 'INVALID_METRIC');
    }

    logger.logApiEvent('Analytics recorded', { merchantId, serviceType, metric, value, timestamp: getCurrentTimestamp() });
  } catch (error) {
    logger.logErrorEvent('Error recording analytics', { merchantId, serviceType, metric, error: error.message });
    throw new AppError(`Failed to record analytics: ${error.message}`, 500, 'ANALYTICS_ERROR', null, { merchantId, serviceType, metric });
  }
}

async function manageRevenueRules(merchantId, rulesUpdate) {
  const transaction = await sequelize.transaction();
  try {
    const merchant = await Merchant.findByPk(merchantId, { include: [{ model: MerchantBranch, as: 'branches' }], transaction });
    if (!merchant) throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');

    const { serviceType, commissionRate, processingFee, payoutSchedule } = rulesUpdate;

    // Validate service type
    const businessType = merchant.business_type;
    const serviceConstants = {
      restaurant: restaurantConstants,
      parking_lot: parkingLotConstants,
      grocery: groceryConstants,
      dark_kitchen: darkKitchenConstants,
      caterer: catererConstants,
      cafe: cafeConstants,
      butcher: butcherConstants,
      bakery: bakeryConstants,
    }[businessType];

    if (serviceType && !serviceConstants?.BUSINESS_SETTINGS?.services?.includes(serviceType)) {
      throw new AppError('Invalid service type for merchant', 400, 'INVALID_SERVICE_TYPE');
    }

    // Fetch or initialize custom revenue settings
    let revenueSettings = merchant.revenue_settings || {
      customCommissionRates: {},
      customProcessingFees: {},
      customPayoutSchedule: {},
    };

    // Update commission rate
    if (commissionRate) {
      if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 100) {
        throw new AppError('Invalid commission rate: must be a number between 0 and 100', 400, 'INVALID_COMMISSION_RATE');
      }
      revenueSettings.customCommissionRates[serviceType] = roundToDecimal(commissionRate, 2);
    }

    // Update processing fee
    if (processingFee) {
      if (typeof processingFee !== 'number' || processingFee < 0) {
        throw new AppError('Invalid processing fee: must be a non-negative number', 400, 'INVALID_PROCESSING_FEE');
      }
      revenueSettings.customProcessingFees[serviceType] = roundToDecimal(processingFee, 2);
    }

    // Update payout schedule
    if (payoutSchedule) {
      const validFrequencies = ['daily', 'weekly', 'monthly'];
      if (!validFrequencies.includes(payoutSchedule.frequency)) {
        throw new AppError('Invalid payout frequency', 400, 'INVALID_PAYOUT_FREQUENCY');
      }
      if (typeof payoutSchedule.minThreshold !== 'number' || payoutSchedule.minThreshold < 0) {
        throw new AppError('Invalid minimum payout threshold', 400, 'INVALID_PAYOUT_THRESHOLD');
      }
      revenueSettings.customPayoutSchedule[serviceType] = {
        frequency: payoutSchedule.frequency,
        minThreshold: roundToDecimal(payoutSchedule.minThreshold, 2),
      };
    }

    // Persist updated settings
    merchant.revenue_settings = revenueSettings;
    await merchant.save({ transaction });

    // Log changes
    logger.logApiEvent('Revenue rules updated', {
      merchantId,
      serviceType,
      updates: { commissionRate, processingFee, payoutSchedule },
      timestamp: getCurrentTimestamp(),
    });

    await transaction.commit();

    return {
      merchantId,
      updatedRules: revenueSettings,
      timestamp: getCurrentTimestamp(),
    };
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Error managing revenue rules', { merchantId, rulesUpdate, error: error.message });
    throw new AppError(`Failed to manage revenue rules: ${error.message}`, 500, 'REVENUE_RULES_ERROR', null, { merchantId, rulesUpdate });
  }
}

module.exports = {
  calculateEarnings,
  applySubscriptionFee,
  recordAnalytics,
  manageRevenueRules,
};