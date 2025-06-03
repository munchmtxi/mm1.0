'use strict';

const { Op } = require('sequelize');
const { MenuInventory, MerchantBranch, Merchant, Customer, User } = require('@models');
const munchConstants = require('@constants/customer/munch/munchConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function getMenuItems(restaurantId, transaction) {
  const branch = await MerchantBranch.findByPk(restaurantId, {
    include: [{ model: Merchant, as: 'merchant' }],
    transaction,
  });

  if (!branch) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.restaurant_not_found'),
      404,
      munchConstants.ERROR_CODES.RESTAURANT_NOT_FOUND
    );
  }

  const menuItems = await MenuInventory.findAll({
    where: { merchant_branch_id: restaurantId, is_active: true },
    include: [
      { model: ProductCategory, as: 'category' },
      { model: ProductDiscount, as: 'discount', where: { is_active: true }, required: false },
      { model: ProductPromotion, as: 'promotion', where: { is_active: true }, required: false },
    ],
    transaction,
  });

  const formattedMenu = menuItems.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.calculateFinalPrice(),
    currency: item.currency || munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY,
    dietaryFilters: item.dietary_filters || [],
    isAvailable: item.quantity_available > 0,
    category: item.category?.name,
    discount: item.discount?.percentage || 0,
    promotion: item.promotion?.name || null,
  }));

  logger.info('Menu items retrieved', { restaurantId, itemCount: formattedMenu.length });
  return { restaurantId, menuItems: formattedMenu };
}

async function checkItemAvailability(itemId, transaction) {
  const item = await MenuInventory.findByPk(itemId, { transaction });

  if (!item) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.menu_item_not_found'),
      404,
      munchConstants.ERROR_CODES.MENU_ITEM_NOT_FOUND
    );
  }

  const isAvailable = item.quantity_available > 0 && item.is_active;

  logger.info('Item availability checked', { itemId, isAvailable });
  return { itemId, isAvailable, quantityAvailable: item.quantity_available };
}

module.exports = { getMenuItems, checkItemAvailability };