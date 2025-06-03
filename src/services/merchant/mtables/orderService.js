'use strict';

/**
 * orderService.js
 *
 * Centralized service for managing in-table orders in mtables for merchants, handling
 * extra orders, dietary filter application, order status updates, and wallet payments.
 * Integrates with Sequelize models, notificationService, socketService, auditService,
 * pointService, walletService, and locationService for comprehensive order operations.
 *
 * Last Updated: May 20, 2025
 */

const { Op, sequelize } = require('sequelize');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localizationService');
const { InDiningOrder, MenuInventory, Customer, Booking, Table, Merchant, MerchantBranch, Address, ProductDiscount, ProductModifier, OrderItems } = require('@models');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const walletService = require('@services/common/walletService');
const locationService = require('@services/common/locationService');
const { AppError } = require('@utils/AppError');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const merchantConstants = require('@constants/merchantConstants');

class OrderService {
  /**
   * Manages extra table orders.
   * @param {number} bookingId - Booking ID
   * @param {Array} items - Array of order items (menu_item_id, quantity, customizations)
   * @returns {Promise<Object>} Created order
   */
  async processExtraOrder(bookingId, items) {
    try {
      if (!bookingId || !items || !Array.isArray(items) || !items.length) {
        throw new AppError('Missing or invalid order details', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Table, as: 'table', include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }, { model: Address, as: 'address' }] }] },
          { model: Customer, as: 'customer' },
        ],
      });
      if (!booking || ![mtablesConstants.BOOKING_STATUSES.CHECKED_IN].includes(booking.status)) {
        throw new AppError('Invalid or non-checked-in booking', 400, mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      // Validate branch location
      if (booking.branch.address?.latitude && booking.branch.address?.longitude) {
        await locationService.resolveLocation({ lat: booking.branch.address.latitude, lng: booking.branch.address.longitude }, booking.customer.user_id);
      }

      // Validate menu items and modifiers
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
      });
      if (menuItems.length !== items.length) {
        throw new AppError('Some items unavailable', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      for (const item of items) {
        if (item.quantity < mtablesConstants.CART_SETTINGS.MIN_QUANTITY_PER_ITEM || item.quantity > mtablesConstants.CART_SETTINGS.MAX_QUANTITY_PER_ITEM) {
          throw new AppError('Invalid item quantity', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
        }
        if (item.customizations) {
          const modifiers = await ProductModifier.findAll({
            where: { id: item.customizations.map(c => c.modifier_id), menu_item_id: item.menu_item_id },
          });
          if (modifiers.length !== item.customizations.length) {
            throw new AppError('Invalid customizations', 400, mtablesConstants.ERROR_CODES.INVALID_MODIFIER);
          }
        }
      }

      // Calculate total amount
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

      // Assign staff
      const staff = await sequelize.models.Staff.findOne({
        where: { branch_id: booking.branch_id, availability_status: mtablesConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES.AVAILABLE },
      });

      // Create order
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const estimatedCompletionTime = new Date(Date.now() + Math.max(...menuItems.map(mi => mi.preparation_time_minutes || 15)) * 60 * 1000);
      const order = await InDiningOrder.create({
        customer_id: booking.customer_id,
        merchant_id: booking.merchant_id,
        branch_id: booking.branch_id,
        table_id: booking.table_id,
        staff_id: staff?.id,
        order_number: orderNumber,
        status: 'pending',
        preparation_status: 'pending',
        total_amount: totalAmount,
        currency: booking.branch.merchant.currency || 'MWK',
        payment_status: 'pending',
        estimated_completion_time: estimatedCompletionTime,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await OrderItems.bulkCreate(items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: menuItems.find(mi => mi.id === item.menu_item_id).calculateFinalPrice(),
        customizations: item.customizations || null,
        created_at: new Date(),
        updated_at: new Date(),
      })));

      // Award gamification points
      await pointService.awardPoints({
        userId: booking.customer.user_id,
        role: 'customer',
        action: mtablesConstants.GAMIFICATION_ACTIONS.ORDER_PLACED.action,
        languageCode: booking.branch.merchant.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });

      // Send notification
      await notificationService.sendNotification({
        userId: booking.customer.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.ORDER_CONFIRMATION,
        messageKey: 'order.created',
        messageParams: { orderId: order.id, totalAmount },
        role: 'customer',
        module: 'mtables',
        orderId: order.id,
      });

      // Notify merchant
      await notificationService.sendNotification({
        userId: booking.branch.merchant.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.ORDER_CONFIRMATION,
        messageKey: 'order.received',
        messageParams: { orderId: order.id, tableId: booking.table_id, branchId: booking.branch_id },
        role: 'merchant',
        module: 'mtables',
        orderId: order.id,
      });

      // Emit socket event
      await socketService.emit(null, 'order:status', {
        userId: booking.customer.user_id,
        role: 'customer',
        orderId: order.id,
        status: order.status,
        preparationStatus: order.preparation_status,
        merchantId: booking.merchant_id,
        branchId: booking.branch_id,
        tableId: booking.table_id,
      });

      // Log audit
      await auditService.logAction({
        userId: booking.customer_id,
        role: 'customer',
        action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_CREATED,
        details: { orderId: order.id, bookingId, totalAmount, branchId: booking.branch_id },
        ipAddress: 'unknown',
      });

      logger.info('Extra order processed', { orderId: order.id, bookingId, customerId: booking.customer_id });
      return order;
    } catch (error) {
      logger.logErrorEvent(`processExtraOrder failed: ${error.message}`, { bookingId, items });
      throw error;
    }
  }

  /**
   * Filters orders by customer dietary preferences.
   * @param {number} customerId - Customer ID
   * @param {Array} items - Array of order items (menu_item_id, quantity, customizations)
   * @returns {Promise<Array>} Filtered items
   */
  async applyDietaryFilters(customerId, items) {
    try {
      if (!customerId || !items || !Array.isArray(items) || !items.length) {
        throw new AppError('Missing or invalid customer or items', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.INVALID_CUSTOMER_ID);
      }

      const dietaryPreferences = customer.dietary_preferences || [];
      if (!dietaryPreferences.length) {
        return items; // No filtering needed
      }

      const menuItems = await MenuInventory.findAll({
        where: { id: items.map(item => item.menu_item_id), availability_status: 'in-stock' },
        attributes: ['id', 'dietary_info'],
      });

      const filteredItems = items.filter(item => {
        const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
        if (!menuItem) return false;
        const dietaryInfo = menuItem.dietary_info || [];
        return dietaryPreferences.every(pref => dietaryInfo.includes(pref));
      });

      if (!filteredItems.length) {
        throw new AppError('No items match dietary preferences', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      // Log audit
      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_UPDATED,
        details: { customerId, filteredItemCount: filteredItems.length, dietaryPreferences },
        ipAddress: 'unknown',
      });

      logger.info('Dietary filters applied', { customerId, filteredItemCount: filteredItems.length });
      return filteredItems;
    } catch (error) {
      logger.logErrorEvent(`applyDietaryFilters failed: ${error.message}`, { customerId, items });
      throw error;
    }
  }

  /**
   * Updates order progress.
   * @param {number} orderId - Order ID
   * @param {string} status - New status (e.g., pending, preparing, completed)
   * @returns {Promise<Object>} Updated order
   */
  async updateOrderStatus(orderId, status) {
    try {
      if (!orderId || !['pending', 'preparing', 'completed', 'cancelled'].includes(status)) {
        throw new AppError('Invalid order ID or status', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      const order = await InDiningOrder.findByPk(orderId, {
        include: [
          { model: Booking, as: 'booking', include: [{ model: Table, as: 'table' }, { model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }] },
          { model: Customer, as: 'customer' },
        ],
      });
      if (!order) {
        throw new AppError('Order not found', 404, mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      const preparationStatus = status === 'completed' ? 'ready' : status === 'preparing' ? 'in_progress' : status;
      await order.update({
        status,
        preparation_status: preparationStatus,
        updated_at: new Date(),
      });

      // Update table status if order is completed
      if (status === 'completed' && order.booking?.table) {
        await order.booking.table.update({ status: mtablesConstants.TABLE_STATUSES.OCCUPIED });
      }

      // Send notification
      await notificationService.sendNotification({
        userId: order.customer.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.ORDER_UPDATED,
        messageKey: 'order.status_updated',
        messageParams: { orderId, status, tableId: order.table_id, branchId: order.branch_id },
        role: 'customer',
        module: 'mtables',
        orderId,
      });

      // Emit socket event
      await socketService.emit(null, 'order:status', {
        userId: order.customer.user_id,
        role: 'customer',
        orderId,
        status,
        preparationStatus,
        merchantId: order.merchant_id,
        branchId: order.branch_id,
        tableId: order.table_id,
      });

      // Log audit
      await auditService.logAction({
        userId: order.merchant_id,
        role: 'merchant',
        action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_UPDATED,
        details: { orderId, status, branchId: order.branch_id },
        ipAddress: 'unknown',
      });

      logger.info('Order status updated', { orderId, status });
      return order;
    } catch (error) {
      logger.logErrorEvent(`updateOrderStatus failed: ${error.message}`, { orderId, status });
      throw error;
    }
  }

  /**
   * Processes wallet payments for an order.
   * @param {number} orderId - Order ID
   * @param {number} walletId - Wallet ID
   * @returns {Promise<Object>} Payment transaction
   */
  async payOrderWithWallet(orderId, walletId) {
    try {
      if (!orderId || !walletId) {
        throw new AppError('Missing order or wallet ID', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      const order = await InDiningOrder.findByPk(orderId, {
        include: [
          { model: Booking, as: 'booking', include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }] },
          { model: Customer, as: 'customer' },
        ],
      });
      if (!order || order.payment_status === 'completed') {
        throw new AppError('Order not found or already paid', 400, mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      const wallet = await sequelize.models.Wallet.findByPk(walletId);
      if (!wallet || wallet.user_id !== order.customer.user_id) {
        throw new AppError('Invalid wallet', 400, mtablesConstants.ERROR_CODES.PAYMENT_FAILED);
      }

      if (order.total_amount < mtablesConstants.FINANCIAL_SETTINGS.MIN_PAYMENT_AMOUNT || order.total_amount > mtablesConstants.FINANCIAL_SETTINGS.MAX_PAYMENT_AMOUNT) {
        throw new AppError('Invalid payment amount', 400, mtablesConstants.ERROR_CODES.PAYMENT_FAILED);
      }

      const transaction = await walletService.processTransaction(walletId, {
        type: mtablesConstants.FINANCIAL_SETTINGS.PAYMENT_TRANSACTION_TYPE,
        amount: order.total_amount,
        currency: order.currency,
        paymentMethodId: null, // Wallet-based payment
      });

      await order.update({
        payment_status: 'completed',
        updated_at: new Date(),
      });

      // Create Payment record (assumed model from customer-side service)
      const payment = await sequelize.models.Payment.create({
        order_id: order.id,
        customer_id: order.customer_id,
        merchant_id: order.merchant_id,
        amount: order.total_amount,
        currency: order.currency,
        transaction_id: transaction.id,
        payment_method: 'digital_wallet',
        status: mtablesConstants.FINANCIAL_SETTINGS.TRANSACTION_STATUSES.COMPLETED,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Award gamification points
      await pointService.awardPoints({
        userId: order.customer.user_id,
        role: 'customer',
        action: mtablesConstants.GAMIFICATION_ACTIONS.PAYMENT_COMPLETED.action,
        languageCode: order.branch.merchant.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });

      // Send notification
      await notificationService.sendNotification({
        userId: order.customer.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
        messageKey: 'payment.completed',
        messageParams: { orderId, amount: order.total_amount },
        role: 'customer',
        module: 'mtables',
        orderId,
      });

      // Emit socket event
      await socketService.emit(null, 'payment:completed', {
        userId: order.customer.user_id,
        role: 'customer',
        orderId,
        paymentId: payment.id,
        amount: order.total_amount,
        merchantId: order.merchant_id,
        branchId: order.branch_id,
      });

      // Log audit
      await auditService.logAction({
        userId: order.customer_id,
        role: 'customer',
        action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PAYMENT_PROCESSED,
        details: { orderId, paymentId: payment.id, amount: order.total_amount, walletId },
        ipAddress: 'unknown',
      });

      logger.info('Order payment processed', { orderId, walletId, amount: order.total_amount });
      return transaction;
    } catch (error) {
      logger.logErrorEvent(`payOrderWithWallet failed: ${error.message}`, { orderId, walletId });
      throw error;
    }
  }
}

module.exports = new OrderService();