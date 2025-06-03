'use strict';

const { Op } = require('sequelize');
const { Order, OrderItems, Customer, User, Wallet, MenuInventory, MerchantBranch, Merchant, Cart, CartItem } = require('@models');
const munchConstants = require('@constants/customer/munch/munchConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function browseMerchants(customerId, { latitude, longitude, radiusKm, filters = {} }, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction
  });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'munch', customer?.user?.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      munchConstants.ERROR_CODES.CUSTOMER_NOT_FOUND
    );
  }

  const { dietaryPreferences, merchantType, orderType } = filters;
  const where = {
    status: munchConstants.MERCHANT_STATUSES[0], // active
  };

  if (merchantType && munchConstants.MUNCH_CONSTANTS.SUPPORTED_MERCHANT_TYPES.includes(merchantType)) {
    where.merchant_type = merchantType;
  }

  if (orderType && munchConstants.ORDER_CONSTANTS.ORDER_TYPES.includes(orderType)) {
    where[`${orderType}_enabled`] = true;
  }

  const merchants = await MerchantBranch.findAll({
    where,
    include: [{ model: Merchant, as: 'merchant' }],
    attributes: {
      include: [
        [
          sequelize.fn(
            'ST_Distance_Sphere',
            sequelize.col('location'),
            sequelize.fn('ST_MakePoint', longitude, latitude)
          ),
          'distance'
        ]
      ]
    },
    having: sequelize.where(
      sequelize.fn(
        'ST_Distance_Sphere',
        sequelize.col('location'),
        sequelize.fn('ST_MakePoint', longitude, latitude)
      ),
      '<=',
      Math.min(radiusKm, munchConstants.MUNCH_CONSTANTS.DELIVERY_SETTINGS.MAX_DELIVERY_RADIUS_KM) * 1000
    ),
    transaction
  });

  const filteredMerchants = [];
  for (const branch of merchants) {
    const menuItems = await MenuInventory.findAll({
      where: {
        branch_id: branch.id,
        is_published: true,
        availability_status: 'in-stock',
        ...(dietaryPreferences && {
          dietary_tags: { [Op.contains]: dietaryPreferences }
        })
      },
      transaction
    });
    if (menuItems.length > 0) {
      filteredMerchants.push({ branch, menuItems });
    }
  }

  return filteredMerchants;
}

async function addToCart(customerId, { itemId, quantity, customizations }, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction
  });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'munch', customer?.user?.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      munchConstants.ERROR_CODES.CUSTOMER_NOT_FOUND
    );
  }

  const menuItem = await MenuInventory.findByPk(itemId, { transaction });
  if (!menuItem || !menuItem.is_published || menuItem.quantity < quantity || menuItem.availability_status !== 'in-stock') {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.menu_item_not_found'),
      400,
      munchConstants.ERROR_CODES.MENU_ITEM_NOT_FOUND
    );
  }

  if (customizations?.dietaryPreferences && !customizations.dietaryPreferences.every(pref =>
    munchConstants.ORDER_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref))) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.invalid_dietary_filter'),
      400,
      munchConstants.ERROR_CODES.INVALID_DIETARY_FILTER
    );
  }

  let cart = await Cart.findOne({ where: { customer_id: customer.id }, transaction });
  if (!cart) {
    cart = await Cart.create({ customer_id: customer.id }, { transaction });
  }

  const cartItem = await CartItem.findOne({
    where: { cart_id: cart.id, menu_item_id: itemId, customization: customizations || {} },
    transaction
  });

  if (cartItem) {
    await cartItem.update({ quantity: cartItem.quantity + quantity }, { transaction });
  } else {
    await CartItem.create({
      cart_id: cart.id,
      menu_item_id: itemId,
      quantity,
      unit_price: menuItem.calculateFinalPrice(),
      customization: customizations || {},
    }, { transaction });
  }

  return cart;
}

async function updateCart(customerId, { cartId, items }, transaction) {
  const cart = await Cart.findOne({
    where: { id: cartId, customer_id: (await Customer.findOne({ where: { user_id: customerId }, transaction })).id },
    include: [{ model: CartItem, as: 'items' }],
    transaction
  });
  if (!cart) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.cart_not_found'),
      404,
      munchConstants.ERROR_CODES.CART_NOT_FOUND
    );
  }

  for (const item of items) {
    const menuItem = await MenuInventory.findByPk(item.itemId, { transaction });
    if (!menuItem || !menuItem.is_published || menuItem.quantity < item.quantity || menuItem.availability_status !== 'in-stock') {
      throw new AppError(
        formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.menu_item_not_found'),
        400,
        munchConstants.ERROR_CODES.MENU_ITEM_NOT_FOUND
      );
    }

    const cartItem = cart.items.find(ci => ci.menu_item_id === item.itemId && JSON.stringify(ci.customization) === JSON.stringify(item.customizations || {}));
    if (item.quantity === 0) {
      if (cartItem) await cartItem.destroy({ transaction });
    } else {
      if (cartItem) {
        await cartItem.update({ quantity: item.quantity, customization: item.customizations || {} }, { transaction });
      } else {
        await CartItem.create({
          cart_id: cart.id,
          menu_item_id: item.itemId,
          quantity: item.quantity,
          unit_price: menuItem.calculateFinalPrice(),
          customization: item.customizations || {},
        }, { transaction });
      }
    }
  }

  return cart;
}

async function placeOrder(customerId, { cartId, branchId, deliveryLocation }, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction
  });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'munch', customer?.user?.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      munchConstants.ERROR_CODES.CUSTOMER_NOT_FOUND
    );
  }

  const branch = await MerchantBranch.findByPk(branchId, { transaction });
  if (!branch) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.restaurant_not_found'),
      404,
      munchConstants.ERROR_CODES.RESTAURANT_NOT_FOUND
    );
  }

  const cart = await Cart.findByPk(cartId, {
    include: [{ model: CartItem, as: 'items' }],
    transaction
  });
  if (!cart || cart.customer_id !== customer.id) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.cart_not_found'),
      404,
      munchConstants.ERROR_CODES.CART_NOT_FOUND
    );
  }

  if (!cart.items || cart.items.length === 0) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.invalid_order_items'),
      400,
      munchConstants.ERROR_CODES.INVALID_ORDER_ITEMS
    );
  }

  let totalAmount = 0;
  const orderItems = [];

  for (const item of cart.items) {
    const menuItem = await MenuInventory.findByPk(item.menu_item_id, {
      include: [{ model: ProductDiscount, as: 'discounts', where: { is_active: true }, required: false }],
      transaction
    });
    if (!menuItem || menuItem.quantity < item.quantity) {
      throw new AppError(
        formatMessage('customer', 'munch', customer.user.preferred_language, 'error.insufficient_stock'),
        400,
        munchConstants.ERROR_CODES.INSUFFICIENT_STOCK
      );
    }

    totalAmount += item.unit_price * item.quantity;
    orderItems.push({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      customization: item.customization,
    });

    await menuItem.update({ quantity: menuItem.quantity - item.quantity }, { transaction });
  }

  const wallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
  if (!wallet || wallet.balance < totalAmount) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.insufficient_funds'),
      400,
      munchConstants.ERROR_CODES.INSUFFICIENT_FUNDS
    );
  }

  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const order = await Order.create({
    customer_id: customer.id,
    merchant_id: branch.merchant_id,
    branch_id: branchId,
    total_amount: totalAmount,
    currency: branch.currency,
    status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[0],
    payment_status: munchConstants.PAYMENT_CONSTANTS.PAYMENT_STATUSES[0],
    order_number: orderNumber,
    delivery_location: deliveryLocation,
    items: cart.items.map(item => ({
      itemId: item.menu_item_id,
      quantity: item.quantity,
      customizations: item.customization,
    })),
  }, { transaction });

  for (const item of orderItems) {
    await OrderItems.create({ ...item, order_id: order.id }, { transaction });
  }

  await cart.destroy({ transaction });
  return { order, wallet, totalAmount };
}

async function updateOrder(orderId, updates, transaction) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
      { model: OrderItems, as: 'orderedItems' },
      { model: MerchantBranch, as: 'branch' },
    ],
    transaction
  });
  if (!order) {
    throw new AppError(
      formatMessage('customer', 'munch', order?.customer?.user?.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.order_not_found'),
      404,
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND
    );
  }

  if (![munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[0], munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[1]].includes(order.status)) {
    throw new AppError(
      formatMessage('customer', 'munch', order.customer.user.preferred_language, 'error.cannot_update_order'),
      400,
      munchConstants.ERROR_CODES.CANNOT_UPDATE_ORDER
    );
  }

  let additionalAmount = 0;
  const updatedItems = updates.items || [];

  for (const updatedItem of updatedItems) {
    const orderItem = order.orderedItems.find(item => item.menu_item_id === updatedItem.itemId);
    const menuItem = await MenuInventory.findByPk(updatedItem.itemId, {
      include: [{ model: ProductDiscount, as: 'discounts', where: { is_active: true }, required: false }],
      transaction
    });

    if (!menuItem || !menuItem.is_published || menuItem.availability_status !== 'in-stock') {
      throw new AppError(
        formatMessage('customer', 'munch', order.customer.user.preferred_language, 'error.menu_item_not_found'),
        400,
        munchConstants.ERROR_CODES.MENU_ITEM_NOT_FOUND
      );
    }

    const quantityDiff = updatedItem.quantity - (orderItem?.quantity || 0);
    if (quantityDiff > menuItem.quantity) {
      throw new AppError(
        formatMessage('customer', 'munch', order.customer.user.preferred_language, 'error.insufficient_stock'),
        400,
        munchConstants.ERROR_CODES.INSUFFICIENT_STOCK
      );
    }

    const itemPrice = menuItem.calculateFinalPrice();
    additionalAmount += itemPrice * quantityDiff;

    if (orderItem) {
      await orderItem.update({ quantity: updatedItem.quantity, customization: updatedItem.customizations || [] }, { transaction });
    } else {
      await OrderItems.create({
        order_id: order.id,
        menu_item_id: updatedItem.itemId,
        quantity: updatedItem.quantity,
        unit_price: itemPrice,
        customization: updatedItem.customizations || [],
      }, { transaction });
    }

    await menuItem.update({ quantity: menuItem.quantity - quantityDiff }, { transaction });
  }

  if (additionalAmount > 0) {
    const wallet = await Wallet.findOne({ where: { user_id: order.customer.user_id }, transaction });
    if (!wallet || wallet.balance < additionalAmount) {
      throw new AppError(
        formatMessage('customer', 'munch', order.customer.user.preferred_language, 'error.insufficient_funds'),
        400,
        munchConstants.ERROR_CODES.INSUFFICIENT_FUNDS
      );
    }
    await order.update({ total_amount: order.total_amount + additionalAmount }, { transaction });
    return { order, wallet, additionalAmount };
  }

  return { order, additionalAmount: 0 };
}

async function cancelOrder(orderId, transaction) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
      { model: OrderItems, as: 'orderedItems' },
    ],
    transaction
  });
  if (!order) {
    throw new AppError(
      formatMessage('customer', 'munch', order?.customer?.user?.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.order_not_found'),
      404,
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND
    );
  }

  if (order.status === munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[6]) {
    throw new AppError(
      formatMessage('customer', 'munch', order.customer.user.preferred_language, 'error.order_already_cancelled'),
      400,
      munchConstants.ERROR_CODES.ORDER_ALREADY_CANCELLED
    );
  }

  if ([munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[4], munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[5]].includes(order.status)) {
    throw new AppError(
      formatMessage('customer', 'munch', order.customer.user.preferred_language, 'error.cannot_cancel_order'),
      400,
      munchConstants.ERROR_CODES.CANNOT_CANCEL_ORDER
    );
  }

  await order.update({ status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[6] }, { transaction });

  for (const item of order.orderedItems) {
    const menuItem = await MenuInventory.findByPk(item.menu_item_id, { transaction });
    if (menuItem) {
      await menuItem.update({ quantity: menuItem.quantity + item.quantity }, { transaction });
    }
  }

  if (order.payment_status === munchConstants.PAYMENT_CONSTANTS.PAYMENT_STATUSES[1]) {
    const wallet = await Wallet.findOne({ where: { user_id: order.customer.user_id }, transaction });
    if (!wallet) {
      throw new AppError(
        formatMessage('customer', 'munch', order.customer.user.preferred_language, 'error.wallet_not_found'),
        404,
        munchConstants.ERROR_CODES.WALLET_NOT_FOUND
      );
    }
    return { order, wallet, refundAmount: order.total_amount };
  }

  return { order, refundProcessed: false };
}

module.exports = { browseMerchants, addToCart, updateCart, placeOrder, updateOrder, cancelOrder };