'use strict';

const { Op } = require('sequelize');
const {
  InDiningOrder,
  MenuInventory,
  Cart,
  CartItem,
  Customer,
  MerchantBranch,
  Table,
  ProductDiscount,
  OrderItems,
  Review,
} = require('@models');
const customerConstants = require('@constants/customer/customerConstants'); // Updated constant reference
const paymentConstants = require('@constants/paymentConstants');
const dateTimeUtils = require('@utils/dateTimeUtils');

async function createInDiningOrder({ customerId, branchId, tableId, cartId, notes, transaction }) {
  if (!customerId || !branchId || !tableId || !cartId) {
    throw new Error(customerConstants.ERROR_TYPES[0]); // INVALID_INPUT
  }

  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer || !customerConstants.CUSTOMER_STATUSES.includes(customer.status)) {
    throw new Error(customerConstants.ERROR_TYPES[10]); // INVALID_CUSTOMER_ID
  }

  const branch = await MerchantBranch.findByPk(branchId, { transaction });
  if (!branch || !customerConstants.MTABLES_CONSTANTS.SUPPORTED_MERCHANT_TYPES.includes(branch.type)) {
    throw new Error(customerConstants.ERROR_TYPES[21]); // INVALID_BRANCH_ID
  }

  const table = await Table.findByPk(tableId, {
    where: { branch_id: branchId, status: customerConstants.TABLE_STATUSES[1] }, // RESERVED
    transaction,
  });
  if (!table) {
    throw new Error(customerConstants.ERROR_TYPES[6]); // TABLE_NOT_AVAILABLE
  }

  const activeOrders = await InDiningOrder.count({
    where: { customer_id: customerId, status: { [Op.in]: customerConstants.ORDER_STATUSES.slice(0, 3) } }, // PENDING, PREPARING, COMPLETED
    transaction,
  });
  if (activeOrders >= customerConstants.CUSTOMER_SETTINGS.MAX_ACTIVE_ORDERS) {
    throw new Error(customerConstants.ERROR_TYPES[12]); // MAX_BOOKINGS_EXCEEDED
  }

  const cart = await Cart.findByPk(cartId, {
    where: { customer_id: customerId },
    include: [{ model: CartItem, as: 'items', include: [{ model: MenuInventory, as: 'menuItem' }] }],
    transaction,
  });
  if (!cart || !cart.items.length || cart.items.length > customerConstants.CART_SETTINGS.MAX_ITEMS_PER_CART) {
    throw new Error(customerConstants.ERROR_TYPES[22]); // INVALID_CART
  }

  const items = cart.items.filter(item => !item.saved_for_later);
  if (!items.length) {
    throw new Error(customerConstants.ERROR_TYPES[22]); // INVALID_CART
  }

  let totalAmount = 0;
  const orderItems = [];
  let maxPreparationTime = 0;

  for (const item of items) {
    if (item.quantity < customerConstants.CART_SETTINGS.MIN_QUANTITY_PER_ITEM || item.quantity > customerConstants.CART_SETTINGS.MAX_QUANTITY_PER_ITEM) {
      throw new Error(customerConstants.ERROR_TYPES[0]); // INVALID_INPUT
    }

    const menuItem = await MenuInventory.findByPk(item.menu_item_id, {
      include: [{
        model: ProductDiscount,
        as: 'discounts',
        where: { is_active: true, start_date: { [Op.lte]: new Date() }, [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: new Date() } }] },
      }],
      transaction,
    });
    if (!menuItem || menuItem.availability_status !== 'in-stock') {
      throw new Error(customerConstants.ERROR_TYPES[23]); // INVALID_MENU_ITEM
    }

    const finalPrice = menuItem.calculateFinalPrice();
    totalAmount += finalPrice * item.quantity;

    if (menuItem.preparation_time_minutes && menuItem.preparation_time_minutes > maxPreparationTime) {
      maxPreparationTime = menuItem.preparation_time_minutes;
    }

    orderItems.push({
      order_id: null,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      customization: item.customizations,
    });
  }

  if (totalAmount < customerConstants.FINANCIAL_SETTINGS.MIN_DEPOSIT_AMOUNT) {
    throw new Error(customerConstants.ERROR_TYPES[25]); // WALLET_INSUFFICIENT_FUNDS
  }

  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const estimatedCompletionTime = maxPreparationTime ? dateTimeUtils.addDaysToDate(new Date(), 0, maxPreparationTime * 60) : null;

  const order = await InDiningOrder.create(
    {
      customer_id: customerId,
      branch_id: branchId,
      table_id: tableId,
      order_number: orderNumber,
      status: customerConstants.ORDER_STATUSES[0], // PENDING
      preparation_status: customerConstants.ORDER_STATUSES[0], // PENDING
      total_amount: totalAmount.toFixed(2),
      currency: paymentConstants.WALLET_SETTINGS.DEFAULT_CURRENCY,
      payment_status: customerConstants.PAYMENT_STATUSES[0], // PENDING
      notes,
      estimated_completion_time: estimatedCompletionTime,
    },
    { transaction }
  );

  for (const orderItem of orderItems) {
    orderItem.order_id = order.id;
    await OrderItems.create(orderItem, { transaction });
  }

  await CartItem.destroy({ where: { cart_id: cartId, saved_for_later: false }, transaction });

  return { order, customer, branch, table };
}

async function updateInDiningOrder({ orderId, status, preparationStatus, notes, transaction }) {
  const order = await InDiningOrder.findByPk(orderId, {
    include: [{ model: Table, as: 'table' }, { model: MerchantBranch, as: 'branch' }],
    transaction,
  });
  if (!order || order.status === customerConstants.ORDER_STATUSES[3]) { // CANCELLED
    throw new Error(customerConstants.ERROR_TYPES[24]); // ORDER_NOT_FOUND
  }

  if (status && !customerConstants.ORDER_STATUSES.includes(status)) {
    throw new Error(customerConstants.ERROR_TYPES[0]); // INVALID_INPUT
  }
  if (preparationStatus && !['pending', 'in_progress', 'completed'].includes(preparationStatus)) {
    throw new Error(customerConstants.ERROR_TYPES[0]); // INVALID_INPUT
  }

  if (status === customerConstants.ORDER_STATUSES[3]) { // CANCELLED
    await order.update(
      { status: customerConstants.ORDER_STATUSES[3], payment_status: customerConstants.PAYMENT_STATUSES[3], updated_at: new Date() }, // CANCELLED, REFUNDED
      { transaction }
    );
    await order.table.update({ status: customerConstants.TABLE_STATUSES[0] }, { transaction }); // AVAILABLE
  } else {
    await order.update(
      {
        status: status || order.status,
        preparation_status: preparationStatus || order.preparation_status,
        notes: notes || order.notes,
        updated_at: new Date(),
      },
      { transaction }
    );
  }

  return { order };
}

async function submitOrderFeedback({ orderId, customerId, rating, comment, transaction }) {
  const order = await InDiningOrder.findByPk(orderId, { transaction });
  if (!order || order.status === customerConstants.ORDER_STATUSES[3]) { // CANCELLED
    throw new Error(customerConstants.ERROR_TYPES[24]); // ORDER_NOT_FOUND
  }
  if (order.customer_id !== customerId) {
    throw new Error(customerConstants.ERROR_TYPES[10]); // INVALID_CUSTOMER_ID
  }
  if (rating < customerConstants.FEEDBACK_SETTINGS.MIN_RATING || rating > customerConstants.FEEDBACK_SETTINGS.MAX_RATING) {
    throw new Error(customerConstants.ERROR_TYPES[15]); // INVALID_FEEDBACK_RATING
  }

  const review = await Review.create(
    {
      customer_id: customerId,
      merchant_id: order.branch.merchant_id,
      service_type: 'in_dining_order',
      service_id: orderId,
      rating,
      comment,
      status: 'pending',
      is_positive: rating >= customerConstants.FEEDBACK_SETTINGS.POSITIVE_RATING_THRESHOLD,
    },
    { transaction }
  );

  return { feedback: review, order };
}

async function getInDiningOrderHistory({ customerId, branchId, transaction }) {
  const where = {};
  if (customerId) where.customer_id = customerId;
  if (branchId) where.branch_id = branchId;

  if (!Object.keys(where).length) {
    throw new Error(customerConstants.ERROR_TYPES[0]); // INVALID_INPUT
  }

  const orders = await InDiningOrder.findAll({
    where,
    include: [
      { model: Table, as: 'table' },
      { model: MerchantBranch, as: 'branch' },
      { model: OrderItems, as: 'orderItems', include: [{ model: MenuInventory, as: 'menuItem' }] },
    ],
    order: [['created_at', 'DESC']],
    transaction,
  });

  return orders;
}

module.exports = {
  createInDiningOrder,
  updateInDiningOrder,
  submitOrderFeedback,
  getInDiningOrderHistory,
};