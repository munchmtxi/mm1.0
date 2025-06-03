'use strict';

const { Op } = require('sequelize');
const { Promotion, ProductPromotion, Customer, Order, Wallet, PromotionRedemption, MenuInventory, MerchantBranch } = require('@models');
const munchConstants = require('@constants/customer/munch/munchConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function redeemPromotion(customerId, promotionId, orderId, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      munchConstants.ERROR_CODES.CUSTOMER_NOT_FOUND
    );
  }

  const promotion = await Promotion.findByPk(promotionId, { transaction });
  if (!promotion || !['munch', 'all'].includes(promotion.service_type)) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.promotion_not_found'),
      404,
      munchConstants.ERROR_CODES.PROMOTION_NOT_FOUND
    );
  }

  if (!promotion.is_active || promotion.status !== munchConstants.PROMOTION_CONSTANTS.STATUSES[0] || new Date(promotion.expiry_date) < new Date()) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.invalid_promotion'),
      400,
      munchConstants.ERROR_CODES.INVALID_PROMOTION
    );
  }

  const existingRedemption = await PromotionRedemption.findOne({
    where: { promotion_id: promotionId, customer_id: customer.id },
    transaction,
  });
  if (existingRedemption && !promotion.is_reusable) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.promotion_already_redeemed'),
      400,
      munchConstants.ERROR_CODES.PROMOTION_ALREADY_REDEEMED
    );
  }

  let order, totalAmount = 0;
  if (orderId) {
    order = await Order.findByPk(orderId, {
      include: [{ model: MerchantBranch, as: 'branch' }, { model: OrderItems, as: 'orderedItems' }],
      transaction,
    });
    if (!order || order.customer_id !== customer.id) {
      throw new AppError(
        formatMessage('customer', 'munch', customer.user.preferred_language, 'error.order_not_found'),
        404,
        munchConstants.ERROR_CODES.ORDER_NOT_FOUND
      );
    }
    totalAmount = order.total_amount;
  }

  let discountAmount = 0;
  if (promotion.type === munchConstants.PROMOTION_CONSTANTS.TYPES[0] && orderId) {
    discountAmount = promotion.discount_percentage ? (promotion.discount_percentage / 100) * totalAmount : promotion.reward_amount;
  } else if (promotion.type === munchConstants.PROMOTION_CONSTANTS.TYPES[1]) {
    discountAmount = promotion.reward_amount;
  }

  let wallet;
  if (discountAmount > 0) {
    wallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
    if (!wallet) {
      throw new AppError(
        formatMessage('customer', 'munch', customer.user.preferred_language, 'error.wallet_not_found'),
        404,
        munchConstants.ERROR_CODES.WALLET_NOT_FOUND
      );
    }
  }

  const redemption = await PromotionRedemption.create({
    promotion_id: promotionId,
    customer_id: customer.id,
    order_id: orderId || null,
    redeemed_at: new Date(),
  }, { transaction });

  await promotion.update({
    status: munchConstants.PROMOTION_CONSTANTS.STATUSES[1],
    redeemed_at: new Date(),
  }, { transaction });

  if (order) {
    const appliedPromotions = order.applied_promotions || [];
    appliedPromotions.push({ promotionId, discountAmount });
    await order.update({
      applied_promotions: appliedPromotions,
      total_amount: totalAmount - discountAmount,
    }, { transaction });
  }

  logger.info('Promotion redeemed', { customerId, promotionId, discountAmount });
  return { promotionId, discountAmount, status: munchConstants.PROMOTION_CONSTANTS.STATUSES[1], wallet, redemptionId: redemption.id, currency: order ? order.currency : munchConstants.PAYMENT_CONSTANTS.DEFAULT_CURRENCY };
}

async function getAvailablePromotions(customerId, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      munchConstants.ERROR_CODES.CUSTOMER_NOT_FOUND
    );
  }

  const promotions = await Promotion.findAll({
    where: {
      [Op.or]: [{ customer_id: customer.id }, { customer_id: null }],
      service_type: { [Op.in]: ['munch', 'all'] },
      is_active: true,
      status: munchConstants.PROMOTION_CONSTANTS.STATUSES[0],
      expiry_date: { [Op.gte]: new Date() },
    },
    transaction,
  });

  const productPromotions = await ProductPromotion.findAll({
    where: {
      is_active: true,
      customer_eligibility: { [Op.in]: ['all', customer.order_count > 1 ? 'returning' : 'new'] },
      [Op.or]: [
        { end_date: null },
        { end_date: { [Op.gte]: new Date() } },
      ],
    },
    include: [
      { model: MenuInventory, as: 'promotionItems', attributes: ['id', 'name'] },
      { model: MerchantBranch, as: 'merchant', attributes: ['id', 'name'] },
    ],
    transaction,
  });

  const availablePromotions = [
    ...promotions.map(p => ({
      id: p.id,
      type: p.type,
      reward_amount: p.reward_amount,
      discount_percentage: p.discount_percentage,
      expiry_date: p.expiry_date,
      is_reusable: p.is_reusable,
    })),
    ...productPromotions.map(p => ({
      id: p.id,
      type: p.type,
      value: p.value,
      code: p.code,
      name: p.name,
      items: p.promotionItems.map(item => ({ id: item.id, name: item.name })),
      merchant: p.merchant?.name,
      start_date: p.start_date,
      end_date: p.end_date,
    })),
  ];

  logger.info('Available promotions retrieved', { customerId, promotionCount: availablePromotions.length });
  return { customerId, promotions: availablePromotions };
}

module.exports = { redeemPromotion, getAvailablePromotions };