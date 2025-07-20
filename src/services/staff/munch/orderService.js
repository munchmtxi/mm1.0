// orderService.js
// Manages order operations for munch staff. Verifies takeaway orders, prepares food, and logs completion.
// Last Updated: July 15, 2025

'use strict';

const { Order, OrderItems, TimeTracking, Staff, TimeWindow, Customer, Merchant } = require('@models');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');
const { handleServiceError } = require('@utils/errorHandling');
const AppError = require('@utils/AppError');

async function confirmTakeawayOrder(orderId, staffId) {
  try {
    const order = await Order.findByPk(orderId, { include: ['customer', 'staff', 'merchant'] });
    if (!order) {
      throw new AppError(
        munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
        404,
        munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
        null,
        { orderId }
      );
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staff.staff_types.some(type => ['front_of_house', 'manager', 'host'].includes(type))) {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED,
        403,
        staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED,
        'Staff lacks required role',
        { staffId, requiredRoles: ['front_of_house', 'manager', 'host'] }
      );
    }

    if (staff.availability_status !== 'available') {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        403,
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        'Staff is not available',
        { staffId, availability_status: staff.availability_status }
      );
    }

    const merchant = await Merchant.findByPk(order.merchant_id);
    if (!merchant) {
      throw new AppError(
        merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE,
        404,
        merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE,
        'Merchant not found',
        { merchantId: order.merchant_id }
      );
    }

    if (merchant.password_lock_until && new Date() < merchant.password_lock_until) {
      throw new AppError(
        merchantConstants.ERROR_CODES.PERMISSION_DENIED,
        403,
        merchantConstants.ERROR_CODES.PERMISSION_DENIED,
        'Merchant account is temporarily locked',
        { merchantId: order.merchant_id, lockUntil: merchant.password_lock_until }
      );
    }

    if (merchant.failed_password_attempts >= merchantConstants.STAFF_SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
      throw new AppError(
        merchantConstants.ERROR_CODES.PERMISSION_DENIED,
        403,
        merchantConstants.ERROR_CODES.PERMISSION_DENIED,
        'Merchant account has exceeded login attempts',
        { merchantId: order.merchant_id, failedAttempts: merchant.failed_password_attempts }
      );
    }

    await order.update({
      status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[1], // 'confirmed'
      staff_id: staffId,
      updated_at: new Date(),
    });

    logger.logApiEvent('Takeaway order confirmed', {
      orderId,
      staffId,
      customerId: order.customer_id,
      type: munchConstants.NOTIFICATION_TYPES.ORDER_CONFIRMATION,
      merchantId: order.merchant_id,
    });

    return order;
  } catch (error) {
    throw handleServiceError('confirmTakeawayOrder', error, error.code || munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

async function prepareDeliveryFood(orderId, items, staffId) {
  try {
    const order = await Order.findByPk(orderId, { include: ['orderItems', 'customer', 'staff', 'merchant'] });
    if (!order) {
      throw new AppError(
        munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
        404,
        munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
        null,
        { orderId }
      );
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staff.staff_types.some(type => ['chef', 'packager', 'back_of_house'].includes(type))) {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED,
        403,
        staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED,
        'Staff lacks required role',
        { staffId, requiredRoles: ['chef', 'packager', 'back_of_house'] }
      );
    }

    if (staff.availability_status !== 'available') {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        403,
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        'Staff is not available',
        { staffId, availability_status: staff.availability_status }
      );
    }

    const merchant = await Merchant.findByPk(order.merchant_id);
    if (!merchant) {
      throw new AppError(
        merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE,
        404,
        merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE,
        'Merchant not found',
        { merchantId: order.merchant_id }
      );
    }

    if (merchant.password_lock_until && new Date() < merchant.password_lock_until) {
      throw new AppError(
        merchantConstants.ERROR_CODES.PERMISSION_DENIED,
        403,
        merchantConstants.ERROR_CODES.PERMISSION_DENIED,
        'Merchant account is temporarily locked',
        { merchantId: order.merchant_id, lockUntil: merchant.password_lock_until }
      );
    }

    if (merchant.failed_password_attempts >= merchantConstants.STAFF_SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
      throw new AppError(
        merchantConstants.ERROR_CODES.PERMISSION_DENIED,
        403,
        merchantConstants.ERROR_CODES.PERMISSION_DENIED,
        'Merchant account has exceeded login attempts',
        { merchantId: order.merchant_id, failedAttempts: merchant.failed_password_attempts }
      );
    }

    for (const item of items) {
      const orderItem = await OrderItems.findOne({
        where: { order_id: order.id, menu_item_id: item.menu_item_id },
      });
      if (!orderItem) {
        throw new AppError(
          munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
          404,
          munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
          'Order item not found',
          { orderId, menu_item_id: item.menu_item_id }
        );
      }

      await orderItem.update({
        quantity: item.quantity,
        customization: item.customization || null,
        updated_at: new Date(),
      });
    }

    await order.update({
      status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[2], // 'preparing'
      updated_at: new Date(),
    });

    logger.logApiEvent('Delivery food preparation started', {
      orderId,
      staffId,
      customerId: order.customer_id,
      type: munchConstants.NOTIFICATION_TYPES.ORDER_STATUS_UPDATE,
      merchantId: order.merchant_id,
    });

    return order;
  } catch (error) {
    throw handleServiceError('prepareDeliveryFood', error, error.code || munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

async function logOrderCompletion(orderId, staffId) {
  try {
    const order = await Order.findByPk(orderId, { include: ['customer', 'staff', 'merchant'] });
    if (!order) {
      throw new AppError(
        munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
        404,
        munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
        null,
        { orderId }
      );
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staff.staff_types.some(type => ['driver', 'manager', 'front_of_house'].includes(type))) {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED,
        403,
        staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED,
        'Staff lacks required role',
        { staffId, requiredRoles: ['driver', 'manager', 'front_of_house'] }
      );
    }

    if (staff.availability_status !== 'available') {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        403,
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        'Staff is not available',
        { staffId, availability_status: staff.availability_status }
      );
    }

    const customer = await Customer.findByPk(order.customer_id);
    if (!customer) {
      throw new AppError(
        customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND,
        404,
        customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND,
        null,
        { customerId: order.customer_id }
      );
    }

    const merchant = await Merchant.findByPk(order.merchant_id);
    if (!merchant) {
      throw new AppError(
        merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE,
        404,
        merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE,
        'Merchant not found',
        { merchantId: order.merchant_id }
      );
    }

    if (merchant.password_lock_until && new Date() < merchant.password_lock_until) {
      throw new AppError(
        merchantConstants.ERROR_CODES.PERMISSION_DENIED,
        403,
        merchantConstants.ERROR_CODES.PERMISSION_DENIED,
        'Merchant account is temporarily locked',
        { merchantId: order.merchant_id, lockUntil: merchant.password_lock_until }
      );
    }

    if (merchant.failed_password_attempts >= merchantConstants.STAFF_SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
      throw new AppError(
        merchantConstants.ERROR_CODES.PERMISSION_DENIED,
        403,
        merchantConstants.ERROR_CODES.PERMISSION_DENIED,
        'Merchant account has exceeded login attempts',
        { merchantId: order.merchant_id, failedAttempts: merchant.failed_password_attempts }
      );
    }

    const timeWindow = await TimeWindow.findOne({
      where: { id: order.id },
      order: [['created_at', 'DESC']],
    });

    const completionTime = new Date();
    const duration = timeWindow?.estimates?.duration || 0;

    await order.update({
      status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[5], // 'delivered'
      actual_delivery_time: completionTime,
      updated_at: completionTime,
      is_feedback_requested: true,
    });

    await TimeTracking.create({
      staff_id: staffId,
      clock_in: completionTime,
      duration: duration,
      created_at: completionTime,
      updated_at: completionTime,
    });

    logger.logApiEvent('Order completion logged', {
      orderId,
      staffId,
      customerId: order.customer_id,
      type: munchConstants.NOTIFICATION_TYPES.DELIVERY_STATUS_UPDATED,
      merchantId: order.merchant_id,
      currency: localizationConstants.COUNTRY_CURRENCY_MAP[customer.country] || munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY,
    });

    return order;
  } catch (error) {
    throw handleServiceError('logOrderCompletion', error, error.code || munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

module.exports = {
  confirmTakeawayOrder,
  prepareDeliveryFood,
  logOrderCompletion,
};