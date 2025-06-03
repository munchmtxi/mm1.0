'use strict';

const { Op, sequelize } = require('sequelize');
const {
  InDiningOrder,
  MenuInventory,
  Customer,
  Booking,
  Cart,
  CartItem,
  Feedback,
  Staff,
  ProductDiscount,
  ProductModifier,
  ProductRecommendationAnalytics,
} = require('@models');
const mtablesConstants = require('@constants/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');

async function addToCart({ customerId, branchId, items, transaction }) {
  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new Error('Customer not found');

  const branch = await sequelize.models.MerchantBranch.findByPk(branchId, { transaction });
  if (!branch) throw new Error('Branch not found');

  const menuItems = await MenuInventory.findAll({
    where: { id: items.map(item => item.menu_item_id), availability_status: 'in-stock', branch_id: branchId },
    include: [{ model: ProductDiscount, as: 'discounts', where: { is_active: true, start_date: { [Op.lte]: new Date() }, end_date: { [Op.gte]: new Date() } }, required: false }],
    transaction,
  });
  if (menuItems.length !== items.length) throw new Error('Some items unavailable');

  for (const item of items) {
    if (item.customizations) {
      const modifiers = await ProductModifier.findAll({
        where: { id: item.customizations.map(c => c.modifier_id), menu_item_id: item.menu_item_id },
        transaction,
      });
      if (modifiers.length !== item.customizations.length) throw new Error('Invalid customizations');
    }
  }

  let [cart] = await Cart.findOrCreate({
    where: { customer_id: customerId },
    defaults: { customer_id: customerId, created_at: new Date(), updated_at: new Date() },
    transaction,
  });

  await CartItem.destroy({ where: { cart_id: cart.id }, transaction });
  await CartItem.bulkCreate(
    items.map(item => ({
      cart_id: cart.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: menuItems.find(mi => mi.id === item.menu_item_id).calculateFinalPrice(),
      customizations: item.customizations || null,
      created_at: new Date(),
      updated_at: new Date(),
    })),
    { transaction }
  );

  return cart;
}

async function createOrder({ bookingId, items, isPreOrder, cartId, dietaryPreferences, paymentMethodId, recommendationData, transaction }) {
  const booking = await Booking.findByPk(bookingId, {
    include: [{ model: sequelize.models.Table, as: 'table' }, { model: sequelize.models.MerchantBranch, as: 'branch' }],
    transaction,
  });
  if (!booking || ![customerConstants.BOOKING_STATUSES.CONFIRMED, customerConstants.BOOKING_STATUSES.CHECKED_IN].includes(booking.status)) {
    throw new Error('Invalid booking status');
  }

  if (isPreOrder && (new Date(`${booking.booking_date}T${booking.booking_time}`) - new Date()) / (1000 * 60) < mtablesConstants.ORDER_SETTINGS.MIN_PRE_ORDER_LEAD_TIME_MINUTES) {
    throw new Error('Pre-order lead time insufficient');
  }

  if (dietaryPreferences && !dietaryPreferences.every(pref => mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref))) {
    throw new Error('Invalid dietary preferences');
  }

  let orderItems = items;
  if (cartId) {
    const cart = await Cart.findByPk(cartId, { include: [{ model: CartItem, as: 'items' }], transaction });
    if (!cart || cart.customer_id !== booking.customer_id) throw new Error('Invalid cart');
    orderItems = cart.items.map(item => ({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      customizations: item.customizations,
    }));
  }

  if (!orderItems || !orderItems.length) throw new Error('Order items required');

  const menuItems = await MenuInventory.findAll({
    where: { id: orderItems.map(item => item.menu_item_id), availability_status: 'in-stock', branch_id: booking.branch_id },
    include: [
      { model: ProductDiscount, as: 'discounts', where: { is_active: true, start_date: { [Op.lte]: new Date() }, end_date: { [Op.gte]: new Date() } }, required: false },
      { model: ProductModifier, as: 'modifiers' },
    ],
    transaction,
  });
  if (menuItems.length !== orderItems.length) throw new Error('Some items unavailable');

  for (const item of orderItems) {
    if (item.customizations) {
      const modifiers = await ProductModifier.findAll({
        where: { id: item.customizations.map(c => c.modifier_id), menu_item_id: item.menu_item_id },
        transaction,
      });
      if (modifiers.length !== item.customizations.length) throw new Error('Invalid customizations');
    }
  }

  const totalAmount = orderItems.reduce((sum, item) => {
    const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
    let price = menuItem.calculateFinalPrice();
    if (item.customizations) {
      item.customizations.forEach(c => {
        const modifier = menuItem.modifiers.find(m => m.id === c.modifier_id);
        if (modifier) price += modifier.price_adjustment;
      });
    }
    return sum + price * item.quantity;
  }, 0);

  const staff = await Staff.findOne({
    where: { branch_id: booking.branch_id, availability_status: 'available' },
    transaction,
  });

  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const estimatedCompletionTime = new Date(Date.now() + Math.max(...menuItems.map(mi => mi.preparation_time_minutes || 15)) * 60 * 1000);
  const order = await InDiningOrder.create(
    {
      customer_id: booking.customer_id,
      branch_id: booking.branch_id,
      table_id: booking.table_id,
      staff_id: staff?.id,
      order_number: orderNumber,
      status: 'pending',
      preparation_status: 'pending',
      total_amount: totalAmount,
      currency: menuItems[0].currency || 'MWK',
      payment_status: paymentMethodId ? 'completed' : 'pending',
      notes: dietaryPreferences ? `Dietary: ${dietaryPreferences.join(', ')}` : null,
      recommendation_data: recommendationData || null,
      estimated_completion_time: estimatedCompletionTime,
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  await sequelize.models.OrderItems.bulkCreate(
    orderItems.map(item => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: menuItems.find(mi => mi.id === item.menu_item_id).calculateFinalPrice(),
      customizations: item.customizations || null,
    })),
    { transaction }
  );

  if (recommendationData?.productIds) {
    await ProductRecommendationAnalytics.bulkCreate(
      recommendationData.productIds.map((productId, index) => ({
        merchant_id: booking.branch.merchant_id,
        product_id: productId,
        customer_id: booking.customer_id,
        recommendation_type: recommendationData.type || 'personalized',
        event_type: 'purchase',
        position: index + 1,
        session_id: recommendationData.sessionId,
        created_at: new Date(),
        updated_at: new Date(),
      })),
      { transaction }
    );
  }

  if (cartId) {
    await Cart.destroy({ where: { id: cartId }, transaction });
  }

  return order;
}

async function updateOrder({ orderId, items, dietaryPreferences, transaction }) {
  const order = await InDiningOrder.findByPk(orderId, {
    include: [{ model: Booking, as: 'booking', include: [{ model: sequelize.models.MerchantBranch, as: 'branch' }] }],
    transaction,
  });
  if (!order || order.status === 'cancelled') throw new Error('Order not found or cancelled');

  if (dietaryPreferences && !dietaryPreferences.every(pref => mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref))) {
    throw new Error('Invalid dietary preferences');
  }

  let totalAmount = order.total_amount;
  if (items) {
    const menuItems = await MenuInventory.findAll({
      where: { id: items.map(item => item.menu_item_id), availability_status: 'in-stock', branch_id: order.booking.branch.id },
      include: [
        { model: ProductDiscount, as: 'discounts', where: { is_active: true, start_date: { [Op.lte]: new Date() }, end_date: { [Op.gte]: new Date() } }, required: false },
        { model: ProductModifier, as: 'modifiers' },
      ],
      transaction,
    });
    if (menuItems.length !== items.length) throw new Error('Some items unavailable');

    for (const item of items) {
      if (item.customizations) {
        const modifiers = await ProductModifier.findAll({
          where: { id: item.customizations.map(c => c.modifier_id), menu_item_id: item.menu_item_id },
          transaction,
        });
        if (modifiers.length !== item.customizations.length) throw new Error('Invalid customizations');
      }
    }

    totalAmount = items.reduce((sum, item) => {
      const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
      let price = menuItem.calculateFinalPrice();
      if (item.customizations) {
        item.customizations.forEach(c => {
          const modifier = menuItem.modifiers.find(m => m.id === c.modifier_id);
          if (modifier) price += modifier.price_adjustment;
        });
      }
      return sum + price * item.quantity;
    }, 0);

    await sequelize.models.OrderItems.destroy({ where: { order_id: order.id }, transaction });
    await sequelize.models.OrderItems.bulkCreate(
      items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: menuItems.find(mi => mi.id === item.menu_item_id).calculateFinalPrice(),
        customizations: item.customizations || null,
      })),
      { transaction }
    );
  }

  await order.update(
    {
      notes: dietaryPreferences ? `Dietary: ${dietaryPreferences.join(', ')}` : order.notes,
      total_amount: totalAmount,
      updated_at: new Date(),
    },
    { transaction }
  );

  return order;
}

async function cancelOrder({ orderId, transaction }) {
  const order = await InDiningOrder.findByPk(orderId, { include: [{ model: Booking, as: 'booking' }], transaction });
  if (!order || order.status === 'cancelled') throw new Error('Order not found or cancelled');

  await order.update({ status: 'cancelled', payment_status: 'cancelled', updated_at: new Date() }, { transaction });

  return order;
}

async function trackOrderStatus({ orderId, transaction }) {
  const order = await InDiningOrder.findByPk(orderId, { transaction });
  if (!order) throw new Error('Order not found');

  return { orderId, status: order.status, preparationStatus: order.preparation_status };
}

async function submitOrderFeedback({ orderId, rating, comment, staffId, transaction }) {
  const order = await InDiningOrder.findByPk(orderId, { transaction });
  if (!order) throw new Error('Order not found');

  if (rating < 1 || rating > 5) throw new Error('Invalid rating');

  if (staffId) {
    const staff = await Staff.findByPk(staffId, { transaction });
    if (!staff || staff.branch_id !== order.branch_id) throw new Error('Invalid staff');
    }

  const feedback = await Feedback.create(
    {
      customer_id: order.customer_id,
      in_dining_order_id: orderId,
      staff_id: staffId || null,
      rating,
      comment,
      is_positive: rating >= 3,
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  return feedback;
}

module.exports = {
  addToCart,
  createOrder,
  updateOrder,
  cancelOrder,
  trackOrderStatus,
  submitOrderFeedback,
};