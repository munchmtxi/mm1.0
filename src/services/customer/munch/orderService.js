'use strict';

const { Op } = require('sequelize');
const {
  Order,
  OrderItems,
  Customer,
  User,
  Wallet,
  WalletTransaction,
  MenuInventory,
  MerchantBranch,
  Merchant,
  Cart,
  CartItem,
} = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const restaurantConstants = require('@constants/merchant/restaurantConstants');
const groceryConstants = require('@constants/merchant/groceryConstants');
const darkKitchenConstants = require('@constants/merchant/darkKitchenConstants');
const catererConstants = require('@constants/merchant/catererConstants');
const cafeConstants = require('@constants/merchant/cafeConstants');
const butcherConstants = require('@constants/merchant/butcherConstants');
const bakeryConstants = require('@constants/merchant/bakeryConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const merchantConstantsMap = {
  restaurant: restaurantConstants,
  grocery: groceryConstants,
  dark_kitchen: darkKitchenConstants,
  caterer: catererConstants,
  cafe: cafeConstants,
  butcher: butcherConstants,
  bakery: bakeryConstants,
};

async function browseMerchants(customerId, { latitude, longitude, radiusKm, filters = {} }, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const { dietaryPreferences, merchantType, orderType } = filters;
  const where = {
    is_active: true,
  };

  if (merchantType && customerConstants.MUNCH_CONSTANTS.SUPPORTED_MERCHANT_TYPES.includes(merchantType)) {
    where.merchant_type = merchantType;
  }

  if (orderType && customerConstants.MUNCH_CONSTANTS.ORDER_TYPES.includes(orderType)) {
    where[`${orderType}_enabled`] = true;
  }

  const maxRadius =
    merchantType && merchantConstantsMap[merchantType]?.MUNCH_CONSTANTS?.DELIVERY_SETTINGS?.MAX_DELIVERY_RADIUS_KM ||
    customerConstants.MUNCH_CONSTANTS.DELIVERY_SETTINGS.MAX_DELIVERY_RADIUS_KM;

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
          'distance',
        ],
      ],
    },
    having: sequelize.where(
      sequelize.fn(
        'ST_Distance_Sphere',
        sequelize.col('location'),
        sequelize.fn('ST_MakePoint', longitude, latitude)
      ),
      '<=',
      Math.min(radiusKm, maxRadius) * 1000
    ),
    transaction,
  });

  const filteredMerchants = [];
  for (const branch of merchants) {
    const merchantConstants = merchantConstantsMap[branch.merchant_type] || restaurantConstants;
    const menuItems = await MenuInventory.findAll({
      where: {
        branch_id: branch.id,
        is_published: true,
        availability_status: 'in-stock',
        ...(dietaryPreferences && {
          tags: { [Op.contains]: dietaryPreferences.filter(pref =>
            merchantConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref)),
        }),
      },
      transaction,
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
    transaction,
  });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const menuItem = await MenuInventory.findByPk(itemId, {
    include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }],
    transaction,
  });
  if (!menuItem || !menuItem.is_published || menuItem.quantity < quantity || menuItem.availability_status !== 'in-stock') {
    throw new AppError('Menu item not found or unavailable', 400, customerConstants.ERROR_CODES.ORDER_FAILED);
  }

  const merchantConstants = merchantConstantsMap[menuItem.branch.merchant_type] || restaurantConstants;
  if (
    customizations?.dietaryPreferences &&
    !customizations.dietaryPreferences.every(pref =>
      merchantConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref)
    )
  ) {
    throw new AppError('Invalid dietary filter', 400, merchantConstants.ERROR_CODES.INVALID_DIETARY_FILTER);
  }

  if (quantity > merchantConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.MAX_ORDER_ITEMS) {
    throw new AppError('Order items limit exceeded', 400, merchantConstants.ERROR_CODES.INVENTORY_LIMIT_EXCEEDED);
  }

  let cart = await Cart.findOne({ where: { customer_id: customer.id }, transaction });
  if (!cart) {
    cart = await Cart.create({ customer_id: customer.id }, { transaction });
  }

  const cartItem = await CartItem.findOne({
    where: { cart_id: cart.id, menu_item_id: itemId, customizations: customizations || {} },
    transaction,
  });

  if (cartItem) {
    const newQuantity = cartItem.quantity + quantity;
    if (newQuantity > merchantConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.MAX_ORDER_ITEMS) {
      throw new AppError('Order items limit exceeded', 400, merchantConstants.ERROR_CODES.INVENTORY_LIMIT_EXCEEDED);
    }
    await cartItem.update({ quantity: newQuantity }, { transaction });
  } else {
    await CartItem.create(
      {
        cart_id: cart.id,
        menu_item_id: itemId,
        quantity,
        unit_price: menuItem.calculateFinalPrice(),
        customizations: customizations || {},
        saved_for_later: false,
      },
      { transaction }
    );
  }

  return cart;
}

async function updateCart(customerId, { cartId, items }, transaction) {
  const customer = await Customer.findOne({ where: { user_id: customerId }, transaction });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const cart = await Cart.findOne({
    where: { id: cartId, customer_id: customer.id },
    include: [{ model: CartItem, as: 'items' }],
    transaction,
  });
  if (!cart) {
    throw new AppError('Cart not found', 404, customerConstants.ERROR_CODES.ORDER_FAILED);
  }

  for (const item of items) {
    const menuItem = await MenuInventory.findByPk(item.itemId, {
      include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }],
      transaction,
    });
    if (!menuItem || !menuItem.is_published || menuItem.quantity < item.quantity || menuItem.availability_status !== 'in-stock') {
      throw new AppError('Menu item not found or unavailable', 400, customerConstants.ERROR_CODES.ORDER_FAILED);
    }

    const merchantConstants = merchantConstantsMap[menuItem.branch.merchant_type] || restaurantConstants;
    if (item.quantity > merchantConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.MAX_ORDER_ITEMS) {
      throw new AppError('Order items limit exceeded', 400, merchantConstants.ERROR_CODES.INVENTORY_LIMIT_EXCEEDED);
    }

    const cartItem = cart.items.find(
      ci => ci.menu_item_id === item.itemId && JSON.stringify(ci.customizations) === JSON.stringify(item.customizations || {})
    );
    if (item.quantity === 0) {
      if (cartItem) await cartItem.destroy({ transaction });
    } else {
      if (cartItem) {
        await cartItem.update({ quantity: item.quantity, customizations: item.customizations || {} }, { transaction });
      } else {
        await CartItem.create(
          {
            cart_id: cart.id,
            menu_item_id: item.itemId,
            quantity: item.quantity,
            unit_price: menuItem.calculateFinalPrice(),
            customizations: item.customizations || {},
            saved_for_later: false,
          },
          { transaction }
        );
      }
    }
  }

  return cart;
}

async function placeOrder(customerId, { cartId, branchId, deliveryLocation }, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const branch = await MerchantBranch.findByPk(branchId, {
    include: [{ model: Merchant, as: 'merchant' }],
    transaction,
  });
  if (!branch || !branch.is_active) {
    throw new AppError('Merchant branch not found or inactive', 404, customerConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
  }

  const merchantConstants = merchantConstantsMap[branch.merchant_type] || restaurantConstants;
  const cart = await Cart.findByPk(cartId, {
    include: [{ model: CartItem, as: 'items', include: [{ model: MenuInventory, as: 'menuItem' }] }],
    transaction,
  });
  if (!cart || cart.customer_id !== customer.id) {
    throw new AppError('Cart not found', 404, customerConstants.ERROR_CODES.ORDER_FAILED);
  }

  if (!cart.items || cart.items.length === 0) {
    throw new AppError('Invalid order items', 400, customerConstants.ERROR_CODES.ORDER_FAILED);
  }

  let totalAmount = 0;
  const orderItems = [];

  for (const item of cart.items) {
    const menuItem = item.menuItem;
    if (!menuItem || menuItem.quantity < item.quantity) {
      throw new AppError('Insufficient stock', 400, merchantConstants.ERROR_CODES.INVENTORY_LIMIT_EXCEEDED);
    }

    totalAmount += item.unit_price * item.quantity;
    orderItems.push({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      customization: item.customizations,
    });

    await menuItem.update({ quantity: menuItem.quantity - item.quantity }, { transaction });
  }

  if (
    totalAmount < merchantConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.MIN_ORDER_AMOUNT ||
    totalAmount > merchantConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.MAX_ORDER_AMOUNT
  ) {
    throw new AppError('Order amount out of range', 400, customerConstants.ERROR_CODES.ORDER_FAILED);
  }

  const wallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
  if (!wallet || wallet.balance < totalAmount) {
    throw new AppError('Insufficient funds', 400, customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS);
  }

  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const order = await Order.create(
    {
      customer_id: customer.id,
      merchant_id: branch.merchant_id,
      branch_id: branchId,
      total_amount: totalAmount,
      currency: branch.currency || paymentConstants.WALLET_SETTINGS.DEFAULT_CURRENCY,
      status: merchantConstants.MUNCH_CONSTANTS.ORDER_STATUSES[0],
      payment_status: paymentConstants.TRANSACTION_STATUSES.PENDING,
      order_number: orderNumber,
      delivery_location: deliveryLocation,
      items: cart.items.map(item => ({
        itemId: item.menu_item_id,
        quantity: item.quantity,
        customizations: item.customizations,
      })),
      is_feedback_requested: false,
    },
    { transaction }
  );

  for (const item of orderItems) {
    await OrderItems.create({ ...item, order_id: order.id }, { transaction });
  }

  // Deduct wallet balance and create transaction
  await wallet.update({ balance: wallet.balance - totalAmount }, { transaction });
  await WalletTransaction.create(
    {
      wallet_id: wallet.id,
      type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
      amount: totalAmount,
      currency: wallet.currency,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      description: `Payment for order ${orderNumber}`,
    },
    { transaction }
  );

  await cart.destroy({ transaction });
  return { order, wallet, totalAmount };
}

async function updateOrder(orderId, updates, transaction) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
      { model: OrderItems, as: 'orderedItems' },
      { model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] },
    ],
    transaction,
  });
  if (!order) {
    throw new AppError('Order not found', 404, customerConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }

  const merchantConstants = merchantConstantsMap[order.branch.merchant_type] || restaurantConstants;
  if (!merchantConstants.MUNCH_CONSTANTS.ORDER_STATUSES.slice(0, 2).includes(order.status)) {
    throw new AppError('Cannot update order', 400, merchantConstants.ERROR_CODES.CANNOT_CANCEL_ORDER);
  }

  let additionalAmount = 0;
  const updatedItems = updates.items || [];

  for (const updatedItem of updatedItems) {
    const orderItem = order.orderedItems.find(item => item.menu_item_id === updatedItem.itemId);
    const menuItem = await MenuInventory.findByPk(updatedItem.itemId, { transaction });

    if (!menuItem || !menuItem.is_published || menuItem.availability_status !== 'in-stock') {
      throw new AppError('Menu item not found or unavailable', 400, merchantConstants.ERROR_CODES.INVALID_DIETARY_FILTER);
    }

    const quantityDiff = updatedItem.quantity - (orderItem?.quantity || 0);
    if (quantityDiff > menuItem.quantity) {
      throw new AppError('Insufficient stock', 400, merchantConstants.ERROR_CODES.INVENTORY_LIMIT_EXCEEDED);
    }

    const itemPrice = menuItem.calculateFinalPrice();
    additionalAmount += itemPrice * quantityDiff;

    if (orderItem) {
      if (updatedItem.quantity === 0) {
        await orderItem.destroy({ transaction });
      } else {
        await orderItem.update({ quantity: updatedItem.quantity, customization: updatedItem.customizations || {} }, { transaction });
      }
    } else if (updatedItem.quantity > 0) {
      await OrderItems.create(
        {
          order_id: order.id,
          menu_item_id: updatedItem.itemId,
          quantity: updatedItem.quantity,
          unit_price: itemPrice,
          customization: updatedItem.customizations || {},
        },
        { transaction }
      );
    }

    await menuItem.update({ quantity: menuItem.quantity - quantityDiff }, { transaction });
  }

  if (additionalAmount > 0) {
    const wallet = await Wallet.findOne({ where: { user_id: order.customer.user_id }, transaction });
    if (!wallet || wallet.balance < additionalAmount) {
      throw new AppError('Insufficient funds', 400, customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS);
    }
    await wallet.update({ balance: wallet.balance - additionalAmount }, { transaction });
    await WalletTransaction.create(
      {
        wallet_id: wallet.id,
        type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
        amount: additionalAmount,
        currency: wallet.currency,
        status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
        description: `Additional payment for order ${order.order_number}`,
      },
      { transaction }
    );
    await order.update({ total_amount: order.total_amount + additionalAmount }, { transaction });
  }

  return { order, wallet, additionalAmount };
}

async function cancelOrder(orderId, transaction) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
      { model: OrderItems, as: 'orderedItems' },
      { model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] },
    ],
    transaction,
  });
  if (!order) {
    throw new AppError('Order not found', 404, customerConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }

  const merchantConstants = merchantConstantsMap[order.branch.merchant_type] || restaurantConstants;
  if (order.status === merchantConstants.MUNCH_CONSTANTS.ORDER_STATUSES[6]) {
    throw new AppError('Order already cancelled', 400, merchantConstants.ERROR_CODES.ORDER_ALREADY_CANCELLED);
  }

  if (merchantConstants.MUNCH_CONSTANTS.ORDER_STATUSES.slice(4, 6).includes(order.status)) {
    throw new AppError('Cannot cancel order', 400, merchantConstants.ERROR_CODES.CANNOT_CANCEL_ORDER);
  }

  await order.update({ status: merchantConstants.MUNCH_CONSTANTS.ORDER_STATUSES[6] }, { transaction });

  for (const item of order.orderedItems) {
    const menuItem = await MenuInventory.findByPk(item.menu_item_id, { transaction });
    if (menuItem) {
      await menuItem.update({ quantity: menuItem.quantity + item.quantity }, { transaction });
    }
  }

  if (order.payment_status === paymentConstants.TRANSACTION_STATUSES.PAID) {
    const wallet = await Wallet.findOne({ where: { user_id: order.customer.user_id }, transaction });
    if (!wallet) {
      throw new AppError('Wallet not found', 404, customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES.WALLET_NOT_FOUND);
    }
    await wallet.update({ balance: wallet.balance + order.total_amount }, { transaction });
    await WalletTransaction.create(
      {
        wallet_id: wallet.id,
        type: paymentConstants.TRANSACTION_TYPES.REFUNDED,
        amount: order.total_amount,
        currency: wallet.currency,
        status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
        description: `Refund for cancelled order ${order.order_number}`,
      },
      { transaction }
    );
    await order.update({ payment_status: paymentConstants.TRANSACTION_STATUSES.REFUNDED }, { transaction });
    return { order, wallet, refundAmount: order.total_amount };
  }

  return { order, refundProcessed: false };
}

module.exports = { browseMerchants, addToCart, updateCart, placeOrder, updateOrder, cancelOrder };