'use strict';

const { Op, sequelize } = require('sequelize');
const { InDiningOrder, MenuInventory, Customer, Booking, Table, Merchant, MerchantBranch, Address, ProductDiscount, ProductModifier, OrderItems } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const staffConstants = require('@constants/staff/staffConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function processExtraOrder(bookingId, items, ipAddress, transaction = null) {
  try {
    if (!bookingId || !items || !Array.isArray(items) || !items.length) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS, 400);
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Table, as: 'table', include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant', attributes: ['id', 'preferred_language', 'currency'] }, { model: Address, as: 'addressRecord' }] }] },
        { model: Customer, as: 'customer', attributes: ['id', 'user_id'] },
      ],
      transaction,
    });
    if (!booking || booking.status !== customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[2]) { // checked_in
      throw new AppError(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND, 400);
    }

    const menuItems = await MenuInventory.findAll({
      where: {
        id: items.map(item => item.menu_item_id),
        availability_status: 'in-stock',
        branch_id: booking.branch_id,
      },
      include: [
        {
          model: ProductDiscount,
          as: 'discounts',
          where: { is_active: true, start_date: { [Op.lte]: new Date() }, end_date: { [Op.gte]: new Date() } },
          required: false,
        },
        { model: ProductModifier, as: 'modifiers' },
      ],
      transaction,
    });
    if (menuItems.length !== items.length) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS, 400);
    }

    for (const item of items) {
      if (item.quantity < mtablesConstants.CART_SETTINGS.MIN_QUANTITY_PER_ITEM || item.quantity > mtablesConstants.CART_SETTINGS.MAX_QUANTITY_PER_ITEM) {
        throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS, 400);
      }
      if (item.customizations) {
        const modifiers = await ProductModifier.findAll({
          where: { id: item.customizations.map(c => c.modifier_id), menu_item_id: item.menu_item_id },
          transaction,
        });
        if (modifiers.length !== item.customizations.length) {
          throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_MODIFIER, 400);
        }
      }
    }

    const totalAmount = items.reduce((sum, item) => {
      const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
      let price = menuItem.calculateFinalPrice();
      if (item.customizations) {
        item.customizations.forEach(c => {
          const modifier = menuItem.modifiers.find(m => m.id === c.modifier_id);
          if (modifier) price += modifier.price_adjustment;
        });
      }
      return sum + (price * item.quantity);
    }, 0);

    const staff = await sequelize.models.Staff.findOne({
      where: { branch_id: booking.branch_id, availability_status: staffConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES[0] }, // AVAILABLE
      transaction,
    });

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const estimatedCompletionTime = new Date(Date.now() + Math.max(...menuItems.map(mi => mi.preparation_time_minutes || merchantConstants.BUSINESS_SETTINGS.DEFAULT_PREP_TIME_MINUTES)) * 60 * 1000);

    const order = await InDiningOrder.create({
      customer_id: booking.customer_id,
      merchant_id: booking.merchant_id,
      branch_id: booking.branch_id,
      table_id: booking.table_id,
      staff_id: staff?.id,
      order_number: orderNumber,
      status: customerConstants.MUNCH_CONSTANTS.ORDER_STATUSES[0], // pending
      preparation_status: customerConstants.MUNCH_CONSTANTS.ORDER_STATUSES[0], // pending
      total_amount: totalAmount,
      currency: booking.branch.merchant.currency || customerConstants.CUSTOMER_SETTINGS.SUPPORTED_CURRENCIES[5], // MWK
      payment_status: merchantConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[0], // pending
      estimated_completion_time: estimatedCompletionTime,
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction });

    await OrderItems.bulkCreate(items.map(item => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: menuItems.find(mi => mi.id === item.menu_item_id).calculateFinalPrice(),
      customization: item.customizations || null,
      created_at: new Date(),
      updated_at: new Date(),
    })), { transaction });

    logger.info(`Extra order processed: ${order.id}`);
    return {
      orderId: order.id,
      bookingId,
      tableId: booking.table_id,
      branchId: booking.branch_id,
      totalAmount,
      language: booking.branch.merchant.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, // en
      action: merchantConstants.SUCCESS_MESSAGES[0], // order_processed
    };
  } catch (error) {
    logger.error(`processExtraOrder failed: ${error.message}`, { bookingId, items });
    throw error;
  }
}

async function applyDietaryFilters(customerId, items, ipAddress, transaction = null) {
  try {
    if (!customerId || !items || !Array.isArray(items) || !items.length) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS, 400);
    }

    const customer = await Customer.findByPk(customerId, { attributes: ['id', 'preferences'], transaction });
    if (!customer) {
      throw new AppError(customerConstants.ERROR_CODES[1], 404); // CUSTOMER_NOT_FOUND
    }

    const dietaryPreferences = customer.preferences?.dietary || [];
    if (!dietaryPreferences.length) {
      return { items, filteredItemCount: items.length, language: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, action: merchantConstants.SUCCESS_MESSAGES[0] }; // order_processed
    }

    const menuItems = await MenuInventory.findAll({
      where: { id: items.map(item => item.menu_item_id), availability_status: 'in-stock' },
      include: [{ model: ProductAttribute, as: 'attributes' }],
      transaction,
    });

    const filteredItems = items.filter(item => {
      const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
      if (!menuItem) return false;
      const dietaryInfo = menuItem.attributes.map(attr => attr.type) || [];
      return dietaryPreferences.every(pref => dietaryInfo.includes(pref));
    });

    if (!filteredItems.length) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS, 400);
    }

    logger.info(`Dietary filters applied: ${customerId}`);
    return {
      items: filteredItems,
      filteredItemCount: filteredItems.length,
      language: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, // en
      action: merchantConstants.SUCCESS_MESSAGES[0], // order_processed
    };
  } catch (error) {
    logger.error(`applyDietaryFilters failed: ${error.message}`, { customerId, items });
    throw error;
  }
}

async function updateOrderStatus(orderId, status, ipAddress, transaction = null) {
  try {
    if (!orderId || !customerConstants.MUNCH_CONSTANTS.ORDER_STATUSES.includes(status)) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS, 400);
    }

    const order = await InDiningOrder.findByPk(orderId, {
      include: [
        { model: Booking, as: 'booking', include: [{ model: Table, as: 'table' }, { model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant', attributes: ['id', 'preferred_language'] }] }] },
        { model: Customer, as: 'customer', attributes: ['id', 'user_id'] },
      ],
      transaction,
    });
    if (!order) {
      throw new AppError(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND, 404);
    }

    const preparationStatus = status === customerConstants.MUNCH_CONSTANTS.ORDER_STATUSES[3] ? customerConstants.MUNCH_CONSTANTS.ORDER_STATUSES[2] : // ready -> preparing
                        status === customerConstants.MUNCH_CONSTANTS.ORDER_STATUSES[2] ? customerConstants.MUNCH_CONSTANTS.ORDER_STATUSES[2] : // preparing -> preparing
                        status; // otherwise keep status
    await order.update({
      status,
      preparation_status: preparationStatus,
      updated_at: new Date(),
    }, { transaction });

    if (status === customerConstants.MUNCH_CONSTANTS.ORDER_STATUSES[3] && order.booking?.table) { // ready
      await order.booking.table.update({ status: mtablesConstants.TABLE_STATUSES[2] }, { transaction }); // OCCUPIED
    }

    logger.info(`Order status updated: ${orderId}`);
    return {
      orderId,
      status,
      tableId: order.table_id,
      branchId: order.branch_id,
      language: order.branch.merchant.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, // en
      action: mtablesConstants.SUCCESS_MESSAGES[13], // ORDER_STATUS_UPDATED
    };
  } catch (error) {
    logger.error(`updateOrderStatus failed: ${error.message}`, { orderId, status });
    throw error;
  }
}

async function payOrderWithWallet(orderId, walletId, ipAddress, transaction = null) {
  try {
    if (!orderId || !walletId) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS, 400);
    }

    const order = await InDiningOrder.findByPk(orderId, {
      include: [
        { model: Booking, as: 'booking', include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant', attributes: ['id', 'preferred_language', 'currency'] }] }] },
        { model: Customer, as: 'customer', attributes: ['id', 'user_id'] },
      ],
      transaction,
    });
    if (!order || order.payment_status === merchantConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1]) { // completed
      throw new AppError(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND, 400);
    }

    const wallet = await sequelize.models.Wallet.findByPk(walletId, { transaction });
    if (!wallet || wallet.user_id !== order.customer.user_id) {
      throw new AppError(merchantConstants.ERROR_CODES[2], 400); // PAYMENT_FAILED
    }

    if (order.total_amount < merchantConstants.WALLET_CONSTANTS.PAYOUT_SETTINGS.MIN_PAYOUT_AMOUNT || order.total_amount > merchantConstants.WALLET_CONSTANTS.PAYOUT_SETTINGS.MAX_PAYOUT_AMOUNT) {
      throw new AppError(merchantConstants.ERROR_CODES[2], 400); // PAYMENT_FAILED
    }

    await order.update({
      payment_status: merchantConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1], // completed
      updated_at: new Date(),
    }, { transaction });

    logger.info(`Order payment processed: ${orderId}`);
    return {
      orderId,
      paymentId: `PAY-${orderId}-${Date.now()}`,
      amount: order.total_amount,
      branchId: order.branch_id,
      language: order.branch.merchant.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, // en
      action: merchantConstants.SUCCESS_MESSAGES[1], // payment_completed
    };
  } catch (error) {
    logger.error(`payOrderWithWallet failed: ${error.message}`, { orderId, walletId });
    throw error;
  }
}

module.exports = { processExtraOrder, applyDietaryFilters, updateOrderStatus, payOrderWithWallet };