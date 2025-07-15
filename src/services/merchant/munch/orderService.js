'use strict';

const { Op, sequelize } = require('sequelize');
const { Order, OrderItems, Customer, MenuInventory, MerchantBranch, Wallet, Payment } = sequelize.models;
const munchConstants = require('@constants/common/munchConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');
const { handleServiceError } = require('@utils/errorHandling');
const { formatDate, getCurrentTimestamp } = require('@utils/dateTimeUtils');

async function processOrder(orderId, items) {
  const transaction = await sequelize.transaction();

  try {
    if (!orderId || !items?.length) {
      throw new AppError(
        formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'),
        400,
        munchConstants.ERROR_CODES[0],
        null,
        { orderId, itemsCount: items?.length }
      );
    }

    const order = await Order.findByPk(orderId, {
      include: [
        { model: MerchantBranch, as: 'branch' },
        { model: Customer, as: 'customer' },
        { model: MenuInventory, as: 'orderedItems', through: { attributes: [] } },
      ],
      transaction,
    });
    if (!order) {
      throw new AppError(
        formatMessage('merchant', 'munch', 'en', 'errors.orderNotFound'),
        404,
        munchConstants.ERROR_CODES[0],
        null,
        { orderId }
      );
    }
    if (order.status !== munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[0]) {
      throw new AppError(
        formatMessage('merchant', 'munch', 'en', 'errors.orderAlreadyProcessed'),
        400,
        munchConstants.ERROR_CODES[0],
        null,
        { orderId, currentStatus: order.status }
      );
    }

    let totalAmount = 0;
    const orderItems = [];
    for (const item of items) {
      const menuItem = await MenuInventory.findByPk(item.menu_item_id, {
        include: [{ model: sequelize.models.ProductDiscount, as: 'discounts' }],
        transaction,
      });
      if (!menuItem || menuItem.availability_status !== 'in-stock') {
        throw new AppError(
          formatMessage('merchant', 'munch', 'en', 'errors.itemUnavailable', { itemId: item.menu_item_id }),
          400,
          munchConstants.ERROR_CODES[0],
          null,
          { menuItemId: item.menu_item_id }
        );
      }

      const quantity = item.quantity || 1;
      if (menuItem.quantity < quantity) {
        throw new AppError(
          formatMessage('merchant', 'munch', 'en', 'errors.insufficientStock', { name: menuItem.name }),
          400,
          munchConstants.ERROR_CODES[0],
          null,
          { menuItemId: item.menu_item_id, availableQuantity: menuItem.quantity }
        );
      }

      const itemPrice = menuItem.calculateFinalPrice() * quantity;
      totalAmount += itemPrice;

      orderItems.push({
        order_id: orderId,
        menu_item_id: item.menu_item_id,
        quantity,
        customization: item.customizations || null,
      });

      await menuItem.update({ quantity: menuItem.quantity - quantity }, { transaction });
    }

    await OrderItems.bulkCreate(orderItems, { transaction });
    await order.update(
      {
        total_amount: totalAmount,
        status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[1],
        items: orderItems,
        updated_at: getCurrentTimestamp(),
      },
      { transaction }
    );

    await transaction.commit();
    logger.logApiEvent('Order processed', { orderId, totalAmount, timestamp: getCurrentTimestamp() });
    return { orderId, status: order.status, totalAmount };
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Error processing order', { orderId, error: error.message });
    throw handleServiceError('processOrder', error, munchConstants.ERROR_CODES[0]);
  }
}

async function applyDietaryPreferences(customerId, items) {
  const transaction = await sequelize.transaction();

  try {
    if (!customerId || !items?.length) {
      throw new AppError(
        formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'),
        400,
        munchConstants.ERROR_CODES[0],
        null,
        { customerId, itemsCount: items?.length }
      );
    }

    const customer = await Customer.findByPk(customerId, { transaction });
    if (!customer) {
      throw new AppError(
        formatMessage('merchant', 'munch', 'en', 'errors.customerNotFound'),
        404,
        munchConstants.ERROR_CODES[0],
        null,
        { customerId }
      );
    }

    const preferences = customer.preferences?.dietary || [];
    if (!preferences.length) {
      await transaction.commit();
      logger.logApiEvent('No dietary preferences applied', { customerId, timestamp: getCurrentTimestamp() });
      return items;
    }

    const filteredItems = [];
    for (const item of items) {
      const menuItem = await MenuInventory.findByPk(item.menu_item_id, { transaction });
      if (!menuItem) continue;

      const itemTags = menuItem.tags || [];
      const isCompliant = preferences.every((pref) =>
        munchConstants.ORDER_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref) &&
        (itemTags.includes(pref) || pref === 'none')
      );
      if (isCompliant) filteredItems.push(item);
    }

    await transaction.commit();
    logger.logApiEvent('Dietary preferences applied', { customerId, filteredItemsCount: filteredItems.length, timestamp: getCurrentTimestamp() });
    return filteredItems;
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Error applying dietary preferences', { customerId, error: error.message });
    throw handleServiceError('applyDietaryPreferences', error, munchConstants.ERROR_CODES[0]);
  }
}

async function updateOrderStatus(orderId, status) {
  const transaction = await sequelize.transaction();

  try {
    if (!orderId || !status) {
      throw new AppError(
        formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'),
        400,
        munchConstants.ERROR_CODES[0],
        null,
        { orderId, status }
      );
    }

    if (!munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes(status)) {
      throw new AppError(
        formatMessage('merchant', 'munch', 'en', 'errors.invalidStatus'),
        400,
        munchConstants.ERROR_CODES[0],
        null,
        { status }
      );
    }

    const order = await Order.findByPk(orderId, {
      include: [{ model: Customer, as: 'customer' }, { model: MerchantBranch, as: 'branch' }],
      transaction,
    });
    if (!order) {
      throw new AppError(
        formatMessage('merchant', 'munch', 'en', 'errors.orderNotFound'),
        404,
        munchConstants.ERROR_CODES[0],
        null,
        { orderId }
      );
    }

    await order.update({ status, updated_at: getCurrentTimestamp() }, { transaction });

    await transaction.commit();
    logger.logApiEvent('Order status updated', { orderId, status, timestamp: getCurrentTimestamp() });
    return { orderId, status };
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Error updating order status', { orderId, status, error: error.message });
    throw handleServiceError('updateOrderStatus', error, munchConstants.ERROR_CODES[0]);
  }
}

async function payOrderWithWallet(orderId, walletId) {
  const transaction = await sequelize.transaction();

  try {
    if (!orderId || !walletId) {
      throw new AppError(
        formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'),
        400,
        munchConstants.ERROR_CODES[0],
        null,
        { orderId, walletId }
      );
    }

    const order = await Order.findByPk(orderId, {
      include: [
        { model: Customer, as: 'customer' },
        { model: MerchantBranch, as: 'branch' },
      ],
      transaction,
    });
    if (!order) {
      throw new AppError(
        formatMessage('merchant', 'munch', 'en', 'errors.orderNotFound'),
        404,
        munchConstants.ERROR_CODES[0],
        null,
        { orderId }
      );
    }
    if (order.payment_status === 'paid') {
      throw new AppError(
        formatMessage('merchant', 'munch', 'en', 'errors.orderAlreadyPaid'),
        400,
        munchConstants.ERROR_CODES[0],
        null,
        { orderId }
      );
    }

    const wallet = await Wallet.findByPk(walletId, { transaction });
    if (!wallet || wallet.user_id !== order.customer_id) {
      throw new AppError(
        formatMessage('merchant', 'munch', 'en', 'errors.invalidWallet'),
        400,
        munchConstants.ERROR_CODES[0],
        null,
        { walletId, customerId: order.customer_id }
      );
    }
    if (wallet.balance < order.total_amount) {
      throw new AppError(
        formatMessage('merchant', 'munch', 'en', 'errors.walletInsufficientFunds'),
        400,
        munchConstants.ERROR_CODES[12],
        null,
        { walletId, balance: wallet.balance, required: order.total_amount }
      );
    }

    await wallet.update(
      { balance: wallet.balance - order.total_amount },
      { transaction }
    );

    await Payment.create(
      {
        order_id: orderId,
        customer_id: order.customer_id,
        merchant_id: order.merchant_id,
        amount: order.total_amount,
        payment_method: munchConstants.WALLET_CONSTANTS.PAYMENT_METHODS[0], // 'wallet'
        status: munchConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1], // 'completed'
        currency: order.currency,
        transaction_id: `WALLET-${orderId}-${Date.now()}`,
        provider: 'internal_wallet',
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      { transaction }
    );

    await order.update(
      { payment_status: munchConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1], updated_at: getCurrentTimestamp() },
      { transaction }
    );

    await transaction.commit();
    logger.logApiEvent('Wallet payment processed', { orderId, walletId, amount: order.total_amount, timestamp: getCurrentTimestamp() });
    return { orderId, paymentStatus: 'paid', amount: order.total_amount };
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Error processing wallet payment', { orderId, walletId, error: error.message });
    throw handleServiceError('payOrderWithWallet', error, munchConstants.ERROR_CODES[0]);
  }
}

module.exports = {
  processOrder,
  applyDietaryPreferences,
  updateOrderStatus,
  payOrderWithWallet,
};