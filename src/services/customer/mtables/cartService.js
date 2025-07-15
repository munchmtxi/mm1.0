'use strict';

const { Op } = require('sequelize');
const { Cart, CartItem, Customer, MerchantBranch, MenuInventory, ProductDiscount, ProductModifier } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function addToCart({ customerId, branchId, items, transaction }) {
  if (!customerId || !branchId || !items || !Array.isArray(items) || items.length === 0) {
    throw new AppError(mtablesConstants.ERROR_TYPES[0], 400, 'INVALID_INPUT');
  }

  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) {
    throw new AppError(mtablesConstants.ERROR_TYPES[10], 400, 'INVALID_CUSTOMER_ID');
  }

  const branch = await MerchantBranch.findByPk(branchId, { transaction });
  if (!branch) {
    throw new AppError(mtablesConstants.ERROR_TYPES[21], 400, 'INVALID_BRANCH_ID');
  }

  let cart = await Cart.findOne({ where: { customer_id: customerId }, transaction });
  if (!cart) {
    cart = await Cart.create({ customer_id: customerId }, { transaction });
  }

  const validItems = [];
  for (const item of items) {
    const { menuItemId, quantity, customizations } = item;
    if (!menuItemId || !quantity || quantity < 1) {
      throw new AppError(mtablesConstants.ERROR_TYPES[0], 400, 'INVALID_INPUT');
    }

    const menuItem = await MenuInventory.findByPk(menuItemId, {
      where: { branch_id: branchId, availability_status: 'in-stock' },
      include: [
        {
          model: ProductDiscount,
          as: 'discounts',
          where: { is_active: true, start_date: { [Op.lte]: new Date() }, [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: new Date() } }] },
          required: false,
        },
        { model: ProductModifier, as: 'modifiers' },
      ],
      transaction,
    });
    if (!menuItem) {
      throw new AppError(mtablesConstants.ERROR_TYPES[23], 400, 'INVALID_MENU_ITEM');
    }

    if (customizations) {
      const validModifiers = menuItem.modifiers.map(modifier => modifier.id);
      for (const customization of customizations) {
        if (!validModifiers.includes(customization.modifierId)) {
          throw new AppError(mtablesConstants.ERROR_TYPES[25], 400, 'INVALID_CUSTOMIZATIONS');
        }
      }
    }

    validItems.push({
      cart_id: cart.id,
      menu_item_id: menuItemId,
      quantity,
      unit_price: menuItem.calculateFinalPrice(),
      customizations,
    });
  }

  await CartItem.destroy({ where: { cart_id: cart.id, saved_for_later: false }, transaction });
  const cartItems = await CartItem.bulkCreate(validItems, { transaction });

  return { cart, cartItems };
}

async function updateCart({ customerId, cartId, items, transaction }) {
  if (!customerId || !cartId || !items || !Array.isArray(items)) {
    throw new AppError(mtablesConstants.ERROR_TYPES[0], 400, 'INVALID_INPUT');
  }

  const cart = await Cart.findOne({ where: { id: cartId, customer_id: customerId }, transaction });
  if (!cart) {
    throw new AppError(mtablesConstants.ERROR_TYPES[22], 400, 'INVALID_CART_ID');
  }

  const validItems = [];
  for (const item of items) {
    const { menuItemId, quantity, customizations } = item;
    if (!menuItemId || !quantity || quantity < 1) {
      throw new AppError(mtablesConstants.ERROR_TYPES[0], 400, 'INVALID_INPUT');
    }

    const menuItem = await MenuInventory.findByPk(menuItemId, {
      where: { branch_id: cart.branch_id, availability_status: 'in-stock' },
      include: [
        {
          model: ProductDiscount,
          as: 'discounts',
          where: { is_active: true, start_date: { [Op.lte]: new Date() }, [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: new Date() } }] },
          required: false,
        },
        { model: ProductModifier, as: 'modifiers' },
      ],
      transaction,
    });
    if (!menuItem) {
      throw new AppError(mtablesConstants.ERROR_TYPES[23], 400, 'INVALID_MENU_ITEM');
    }

    if (customizations) {
      const validModifiers = menuItem.modifiers.map(modifier => modifier.id);
      for (const customization of customizations) {
        if (!validModifiers.includes(customization.modifierId)) {
          throw new AppError(mtablesConstants.ERROR_TYPES[25], 400, 'INVALID_CUSTOMIZATIONS');
        }
      }
    }

    validItems.push({
      cart_id: cart.id,
      menu_item_id: menuItemId,
      quantity,
      unit_price: menuItem.calculateFinalPrice(),
      customizations,
    });
  }

  await CartItem.destroy({ where: { cart_id: cart.id, saved_for_later: false }, transaction });
  const cartItems = await CartItem.bulkCreate(validItems, { transaction });

  return { cart, cartItems };
}

async function clearCart({ customerId, cartId, transaction }) {
  const cart = await Cart.findOne({ where: { id: cartId, customer_id: customerId }, transaction });
  if (!cart) {
    throw new AppError(mtablesConstants.ERROR_TYPES[22], 400, 'INVALID_CART_ID');
  }

  await CartItem.destroy({ where: { cart_id: cart.id }, transaction });
  return { cart };
}

async function getCart({ customerId, cartId, transaction }) {
  const cart = await Cart.findOne({
    where: { id: cartId, customer_id: customerId },
    include: [
      {
        model: CartItem,
        as: 'items',
        include: [{ model: MenuInventory, as: 'menu_item' }],
      },
    ],
    transaction,
  });
  if (!cart) {
    throw new AppError(mtablesConstants.ERROR_TYPES[22], 400, 'INVALID_CART_ID');
  }

  return { cart };
}

module.exports = {
  addToCart,
  updateCart,
  clearCart,
  getCart,
};