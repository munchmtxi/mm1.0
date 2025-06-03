'use strict';

const { Promotion, Customer, Wallet, Transaction } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const tipConstants = require('@constants/customer/tipConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { sequelize, Op } = require('sequelize');

async function redeemPromotion(customerId, promotionId, details, transaction) {
  const { serviceType, groupCustomerIds } = details;

  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);

  if (!tipConstants.TIP_SETTINGS.SERVICE_TYPES.includes(serviceType)) {
    throw new AppError('Invalid service type', 400, customerConstants.ERROR_CODES[6]);
  }

  const promotion = await Promotion.findByPk(promotionId, { transaction });
  if (!promotion) throw new AppError('Promotion not found', 404, customerConstants.ERROR_CODES[7]);
  if (!promotion.is_active || new Date() > promotion.expiry_date) {
    throw new AppError('Promotion expired or inactive', 400, customerConstants.ERROR_CODES[8]);
  }
  if (promotion.service_type !== 'all' && promotion.service_type !== serviceType) {
    throw new AppError('Promotion not applicable to service', 400, customerConstants.ERROR_CODES[6]);
  }

  const existingRedemption = await Promotion.count({
    where: { id: promotionId, customer_id: customerId, status: 'REDEEMED' },
    transaction,
  });
  if (existingRedemption > 0 && !promotion.is_reusable) {
    throw new AppError('Promotion already redeemed', 400, customerConstants.ERROR_CODES[9]);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: customer.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[1] },
    transaction,
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES[0]);

  let rewardAmount = promotion.reward_amount || 0;
  let discountPercentage = promotion.discount_percentage || 0;
  if (groupCustomerIds && groupCustomerIds.length > 0) {
    const maxFriends = serviceType === 'ride' ? customerConstants.MTXI_CONSTANTS.SHARED_RIDE_SETTINGS.MAX_FRIENDS : 3;
    if (groupCustomerIds.length > maxFriends) {
      throw new AppError('Too many group members', 400, customerConstants.ERROR_CODES[6]);
    }
    rewardAmount = rewardAmount / (groupCustomerIds.length + 1);
    discountPercentage = discountPercentage / (groupCustomerIds.length + 1);
  }

  if (promotion.type === 'CASHBACK' || promotion.type === 'REFERRAL') {
    const CASHBACK_LIMITS = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'CASHBACK');
    if (rewardAmount < CASHBACK_LIMITS.min || rewardAmount > CASHBACK_LIMITS.max) {
      throw new AppError('Invalid cashback amount', 400, paymentConstants.ERROR_CODES[3]);
    }

    await walletService.processTransaction(
      wallet.id,
      {
        type: paymentConstants.TRANSACTION_TYPES[8],
        amount: rewardAmount,
        currency: wallet.currency,
        status: paymentConstants.TRANSACTION_STATUSES[1],
      },
      { transaction }
    );

    for (const groupCustomerId of groupCustomerIds || []) {
      const groupCustomer = await Customer.findByPk(groupCustomerId, { transaction });
      if (!groupCustomer) throw new AppError('Group member not found', 404, customerConstants.ERROR_CODES[1]);
      const groupWallet = await Wallet.findOne({
        where: { user_id: groupCustomer.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[1] },
        transaction,
      });
      if (!groupWallet) throw new AppError('Group member wallet not found', 404, paymentConstants.ERROR_CODES[0]);
      await walletService.processTransaction(
        groupWallet.id,
        {
          type: paymentConstants.TRANSACTION_TYPES[8],
          amount: rewardAmount,
          currency: groupWallet.currency,
          status: paymentConstants.TRANSACTION_STATUSES[1],
        },
        { transaction }
      );
    }
  }

  await promotion.update(
    { status: 'REDEEMED', customer_id: customerId, redeemed_at: new Date() },
    { transaction }
  );

  logger.info('Promotion redeemed', { promotionId, customerId, serviceType });
  return promotion;
}

async function getAvailablePromotions(customerId, serviceType, transaction) {
  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);

  if (!tipConstants.TIP_SETTINGS.SERVICE_TYPES.includes(serviceType)) {
    throw new AppError('Invalid service type', 400, customerConstants.ERROR_CODES[6]);
  }

  const promotions = await Promotion.findAll({
    where: {
      is_active: true,
      expiry_date: { [Op.gt]: new Date() },
      [Op.or]: [
        { service_type: serviceType },
        { service_type: 'all' },
      ],
      [Op.or]: [
        { customer_id: null },
        { customer_id: customerId },
      ],
    },
    transaction,
  });

  const eligiblePromotions = [];
  for (const promotion of promotions) {
    const redemptionCount = await Promotion.count({
      where: { id: promotion.id, customer_id: customerId, status: 'REDEEMED' },
      transaction,
    });
    if (promotion.is_reusable || redemptionCount === 0) {
      eligiblePromotions.push(promotion);
    }
  }

  logger.info('Available promotions retrieved', { customerId, serviceType, count: eligiblePromotions.length });
  return eligiblePromotions;
}

async function cancelPromotionRedemption(customerId, promotionId, transaction) {
  const promotion = await Promotion.findOne({
    where: { id: promotionId, customer_id: customerId, status: 'REDEEMED' },
    transaction,
  });
  if (!promotion) throw new AppError('Promotion not found or not redeemed', 404, customerConstants.ERROR_CODES[7]);

  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);

  const wallet = await Wallet.findOne({
    where: { user_id: customer.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[1] },
    transaction,
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES[0]);

  if (promotion.type === 'CASHBACK' || promotion.type === 'REFERRAL') {
    const cashbackTransaction = await Transaction.findOne({
      where: { wallet_id: wallet.id, type: paymentConstants.TRANSACTION_TYPES[8] },
      transaction,
    });
    if (cashbackTransaction) {
      await walletService.processTransaction(
        wallet.id,
        {
          type: paymentConstants.TRANSACTION_TYPES[2],
          amount: cashbackTransaction.amount,
          currency: wallet.currency,
          status: paymentConstants.TRANSACTION_STATUSES[1],
        },
        { transaction }
      );
    }
  }

  await promotion.update(
    { status: 'CANCELLED', updated_at: new Date() },
    { transaction }
  );

  logger.info('Promotion redemption cancelled', { promotionId, customerId });
  return promotion;
}

module.exports = {
  redeemPromotion,
  getAvailablePromotions,
  cancelPromotionRedemption,
};