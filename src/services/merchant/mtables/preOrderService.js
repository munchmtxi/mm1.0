'use strict';

/**
 * PreOrder Service (Merchant Side)
 * Manages merchant-side pre-order operations, including creation, group payments,
 * feedback, and gamification points. Integrates with InDiningOrder, Booking, Customer,
 * MenuInventory, OrderItems, Merchant, MerchantBranch, Address, ProductDiscount,
 * ProductModifier, Wallet, Payment, Feedback, Staff, Table, and GamificationPoints models.
 *
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const { sequelize } = require('@models');
const { InDiningOrder, Booking, Customer, MenuInventory, OrderItems, Merchant, MerchantBranch, Address, ProductDiscount, ProductModifier, Wallet, Payment, Feedback, Staff, Table, GamificationPoints } = sequelize.models;
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const walletService = require('@services/common/walletService');
const locationService = require('@services/common/locationService');
const mTablesConstants = require('@constants/mTablesConstants');
const paymentConstants = require('@constants/paymentConstants');
const merchantConstants = require('@constants/merchantConstants');
const customerConstants = require('@constants/customerConstants');
const gamificationConstants = require('@constants/gamificationConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');

class PreOrderService {
  /**
   * Creates a pre-order for a confirmed booking
   * @param {Object} data - Pre-order data { bookingId, customerId, branchId, items, staffId, ipAddress }
   * @returns {Promise<Object>} Created order
   */
  static async createPreOrder(data) {
    const { bookingId, customerId, branchId, items, staffId, ipAddress } = data;
    const transaction = await sequelize.transaction();

    try {
      // Validate booking
      const booking = await Booking.findByPk(bookingId, {
        where: { customer_id: customerId, branch_id: branchId, status: ['approved', 'seated'] },
        include: [{ model: Table, as: 'table' }, { model: MerchantBranch, as: 'branch', include: [{ model: Address, as: 'addressRecord' }] }],
        transaction,
      });
      if (!booking) throw new AppError('Invalid or unconfirmed booking', 400, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

      // Validate pre-order lead time
      if ((new Date(`${booking.booking_date}T${booking.booking_time}`) - new Date()) / (1000 * 60) < mTablesConstants.PRE_ORDER_SETTINGS.MIN_PRE_ORDER_LEAD_TIME_MINUTES) {
        throw new AppError('Pre-order lead time insufficient', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      // Validate customer
      const customer = await Customer.findByPk(customerId, { transaction });
      if (!customer) throw new AppError('Customer not found', 404, mTablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID);

      // Validate branch
      const branch = await MerchantBranch.findByPk(branchId, {
        include: [{ model: Merchant, as: 'merchant' }, { model: Address, as: 'addressRecord' }],
        transaction,
      });
      if (!branch) throw new AppError('Branch not found', 404, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);

      // Validate location
      if (branch.addressRecord?.latitude && branch.addressRecord?.longitude) {
        await locationService.resolveLocation({ lat: branch.addressRecord.latitude, lng: branch.addressRecord.longitude }, customer.user_id);
      }

      // Validate staff
      const staff = staffId ? await Staff.findOne({ where: { id: staffId, branch_id: branchId, availability_status: 'available' }, transaction }) : null;
      if (staffId && !staff) throw new AppError('Staff unavailable', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);

      // Validate items
      if (!items?.length) throw new AppError('Order items required', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      const menuItems = await MenuInventory.findAll({
        where: { id: items.map(item => item.menu_item_id), availability_status: 'in-stock', branch_id: branchId, is_published: true },
        include: [
          { model: ProductDiscount, as: 'discounts', where: { is_active: true, start_date: { [Op.lte]: new Date() }, end_date: { [Op.gte]: new Date() } }, required: false },
          { model: ProductModifier, as: 'modifiers' },
        ],
        transaction,
      });
      if (menuItems.length !== items.length) throw new AppError('Some items unavailable', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);

      // Validate dietary preferences and customizations
      let totalAmount = 0;
      const orderItems = [];
      for (const item of items) {
        const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
        if (customer.preferences?.dietary && menuItem.nutritional_info?.allergens) {
          const conflicts = menuItem.nutritional_info.allergens.filter(a => customer.preferences.dietary.includes(a));
          if (conflicts.length) throw new AppError(`Item ${menuItem.name} conflicts with dietary preferences`, 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
        }

        if (item.customization) {
          const modifierIds = item.customization.map(c => c.modifier_id);
          const modifiers = await ProductModifier.findAll({
            where: { id: modifierIds, menu_item_id: item.menu_item_id },
            transaction,
          });
          if (modifiers.length !== modifierIds.length) throw new AppError('Invalid customizations', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
        }

        let price = menuItem.calculateFinalPrice();
        if (item.customization) {
          item.customization.forEach(c => {
            const modifier = menuItem.modifiers.find(m => m.id === c.modifier_id);
            if (modifier) price += modifier.price_adjustment;
          });
        }
        totalAmount += price * item.quantity;
        orderItems.push({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          customization: item.customization || null,
        });
      }

      // Create order
      const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const estimatedCompletionTime = new Date(Date.now() + Math.max(...menuItems.map(mi => mi.preparation_time_minutes || 15)) * 60 * 1000);
      const order = await InDiningOrder.create({
        customer_id: customerId,
        branch_id: branchId,
        table_id: booking.table_id,
        staff_id: staff?.id,
        order_number: orderNumber,
        status: 'pending',
        preparation_status: 'pending',
        total_amount: totalAmount,
        currency: branch.currency || merchantConstants.DEFAULT_CURRENCY,
        payment_status: 'pending',
        notes: customer.preferences?.dietary ? `Dietary: ${customer.preferences.dietary.join(', ')}` : null,
        is_pre_order: true,
        estimated_completion_time: estimatedCompletionTime,
      }, { transaction });

      // Create order items
      await OrderItems.bulkCreate(orderItems.map(item => ({
        order_id: order.id,
        ...item,
        created_at: new Date(),
        updated_at: new Date(),
      })), { transaction });

      // Update booking
      await booking.update({ status: 'seated' }, { transaction });

      // Notifications
      await notificationService.sendNotification({
        userId: customer.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.PRE_ORDER_CONFIRMATION,
        messageKey: 'pre_order.created',
        messageParams: { orderId: order.id, totalAmount },
        role: 'customer',
        module: 'mtables',
        orderId: order.id,
      });
      await notificationService.sendNotification({
        userId: branch.merchant.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.PRE_ORDER_RECEIVED,
        messageKey: 'pre_order.received',
        messageParams: { orderId: order.id, orderNumber },
        role: 'merchant',
        module: 'mtables',
        orderId: order.id,
      });

      // Emit socket event
      await socketService.emit(null, 'pre_order:created', {
        userId: customer.user_id,
        role: 'customer',
        orderId: order.id,
        branchId,
      });

      // Log audit
      await auditService.logAction({
        userId: customer.user_id,
        role: 'customer',
        action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PRE_ORDER_CREATED,
        details: { orderId: order.id, totalAmount, branchId },
        ipAddress: ipAddress || 'unknown',
      }, transaction);

      await transaction.commit();
      logger.info('Pre-order created', { orderId: order.id, customerId });
      return order;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating pre-order', { error: error.message });
      throw error;
    }
  }

  /**
   * Manages group payments for a pre-order
   * @param {Object} data - Payment data { orderId, customerIds, paymentSplits, staffId, ipAddress }
   * @returns {Promise<Object>} Payment result
   */
  static async manageGroupPayments(data) {
    const { orderId, customerIds, paymentSplits, staffId, ipAddress } = data;
    const transaction = await sequelize.transaction();

    try {
      // Validate order
      const order = await InDiningOrder.findByPk(orderId, {
        include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }],
        transaction,
      });
      if (!order || order.payment_status !== 'pending') throw new AppError('Invalid or already paid order', 400, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

      // Validate staff
      const staff = staffId ? await Staff.findOne({ where: { id: staffId, branch_id: order.branch_id, availability_status: 'available' }, transaction }) : null;
      if (staffId && !staff) throw new AppError('Staff unavailable', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);

      // Validate total split
      const totalSplit = paymentSplits.reduce((sum, split) => sum + split.amount, 0);
      if (totalSplit !== order.total_amount) throw new AppError('Payment splits do not match order total', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);

      // Process payments
      const payments = [];
      for (const split of paymentSplits) {
        const { customerId, amount, paymentMethodId } = split;
        if (!customerIds.includes(customerId)) throw new AppError(`Invalid customer ID: ${customerId}`, 400, mTablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID);

        const customer = await Customer.findByPk(customerId, { transaction });
        if (!customer) throw new AppError(`Customer ${customerId} not found`, 404, mTablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID);

        // Validate wallet
        const wallet = await Wallet.findOne({ where: { user_id: customer.user_id }, transaction });
        if (!wallet) throw new AppError('Wallet not found', 404, mTablesConstants.ERROR_CODES.PAYMENT_FAILED);
        if (wallet.balance < amount) throw new AppError(`Insufficient balance for customer ${customerId}`, 400, mTablesConstants.ERROR_CODES.PAYMENT_FAILED);

        // Process payment
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const payment = await Payment.create({
          in_dining_order_id: orderId,
          customer_id: customerId,
          merchant_id: order.branch.merchant_id,
          staff_id: staff?.id,
          amount,
          payment_method: paymentMethodId || paymentConstants.DEFAULT_PAYMENT_METHOD,
          status: 'completed',
          transaction_id: transactionId,
          currency: order.currency,
        }, { transaction });

        // Update wallet
        await walletService.processTransaction({
          walletId: wallet.id,
          type: paymentConstants.FINANCIAL_SETTINGS.PAYMENT_TRANSACTION_TYPE,
          amount: -amount,
          currency: wallet.currency,
          paymentMethodId,
        }, transaction);

        payments.push(payment);
      }

      // Update order
      await order.update({ payment_status: 'completed' }, { transaction });

      // Notifications
      for (const split of paymentSplits) {
        const customer = await Customer.findByPk(split.customerId, { transaction });
        await notificationService.sendNotification({
          userId: customer.user_id,
          notificationType: mTablesConstants.NOTIFICATION_TYPES.PAYMENT_COMPLETED,
          messageKey: 'payment.completed',
          messageParams: { orderId, amount: split.amount },
          role: 'customer',
          module: 'mtables',
          orderId,
        });
      }
      await notificationService.sendNotification({
        userId: order.branch.merchant.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.PAYMENT_RECEIVED,
        messageKey: 'payment.received',
        messageParams: { orderId, totalAmount: order.total_amount },
        role: 'merchant',
        module: 'mtables',
        orderId,
      });

      // Emit socket event
      await socketService.emit(null, 'payment:completed', {
        userId: order.customer_id,
        role: 'customer',
        orderId,
        branchId: order.branch_id,
      });

      // Log audit
      await auditService.logAction({
        action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.GROUP_PAYMENT,
        userId: staff?.user_id || order.branch.merchant.user_id,
        role: 'merchant',
        details: { orderId, customerIds },
        ipAddress: ipAddress || 'unknown',
      }, transaction);

      await transaction.commit();
      logger.info('Group payments processed', { orderId });
      return { payments, order };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error managing group payments', { error: error.message });
      throw error;
    }
  }

  /**
   * Provides feedback on pre-order availability or substitutions
   * @param {Object} data - Feedback data { orderId, merchantId, staffId, comment, substitutions, ipAddress }
   * @returns {Promise<Object>} Created feedback
   */
  static async provideFeedback(data) {
    const { orderId, merchantId, staffId, comment, substitutions, ipAddress } = data;
    const transaction = await sequelize.transaction();

    try {
      // Validate order
      const order = await InDiningOrder.findByPk(orderId, {
        include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }],
        transaction,
      });
      if (!order) throw new AppError('Order not found', 404, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

      // Validate merchant
      if (order.branch.merchant_id !== merchantId) throw new AppError('Invalid merchant for this order', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);

      // Validate staff
      const staff = await Staff.findOne({ where: { id: staffId, merchant_id: merchantId, availability_status: 'available' }, transaction });
      if (!staff) throw new AppError('Staff unavailable', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);

      // Validate substitutions
      if (substitutions?.length) {
        const subItems = await MenuInventory.findAll({
          where: { id: substitutions.map(s => s.menu_item_id), availability_status: 'in-stock', branch_id: order.branch_id },
          include: [{ model: ProductModifier, as: 'modifiers' }],
          transaction,
        });
        if (subItems.length !== substitutions.length) throw new AppError('Some substitution items unavailable', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);

        for (const item of substitutions) {
          if (item.customization) {
            const modifierIds = item.customization.map(c => c.modifier_id);
            const modifiers = await ProductModifier.findAll({
              where: { id: modifierIds, menu_item_id: item.menu_item_id },
              transaction,
            });
            if (modifiers.length !== modifierIds.length) throw new AppError('Invalid customizations for substitution', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
          }
        }
      }

      // Create feedback
      const feedback = await Feedback.create({
        customer_id: order.customer_id,
        in_dining_order_id: orderId,
        staff_id: staffId,
        rating: substitutions ? 3 : 4, // Neutral for substitutions, positive otherwise
        comment,
        is_positive: !substitutions,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction });

      // Update order if substitutions
      if (substitutions) {
        await OrderItems.destroy({ where: { order_id: orderId }, transaction });
        let newTotal = 0;
        const newItems = substitutions.map(item => {
          const menuItem = subItems.find(mi => mi.id === item.menu_item_id);
          let price = menuItem.calculateFinalPrice();
          if (item.customization) {
            item.customization.forEach(c => {
              const modifier = menuItem.modifiers.find(m => m.id === c.modifier_id);
              if (modifier) price += modifier.price_adjustment;
            });
          }
          newTotal += price * item.quantity;
          return {
            order_id: orderId,
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            customization: item.customization || null,
            created_at: new Date(),
            updated_at: new Date(),
          };
        });
        await OrderItems.bulkCreate(newItems, { transaction });
        await order.update({ total_amount: newTotal, notes: `Substitutions applied: ${JSON.stringify(substitutions)}` }, { transaction });
      }

      // Notify customer
      const customer = await Customer.findByPk(order.customer_id, { transaction });
      await notificationService.sendNotification({
        userId: customer.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.FEEDBACK_SUBMITTED,
        messageKey: 'feedback.submitted',
        messageParams: { orderId, rating: feedback.rating },
        role: 'customer',
        module: 'mtables',
        feedbackId: feedback.id,
      });

      // Emit socket event
      await socketService.emit(null, 'feedback:submitted', {
        userId: customer.user_id,
        role: 'customer',
        feedbackId: feedback.id,
        orderId,
      });

      // Log audit
      await auditService.logAction({
        action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.FEEDBACK_SUBMITTED,
        userId: staff.user_id,
        role: 'merchant',
        details: { orderId, feedbackId: feedback.id, substitutions },
        ipAddress: ipAddress || 'unknown',
      }, transaction);

      await transaction.commit();
      logger.info('Feedback provided', { orderId, feedbackId: feedback.id });
      return feedback;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error providing feedback', { error: error.message });
      throw error;
    }
  }

  /**
   * Tracks gamification points for pre-order actions
   * @param {Object} data - Gamification data { customerId, orderId, action, ipAddress }
   * @returns {Promise<Object>} Awarded points
   */
  static async trackPreOrderGamification(data) {
    const { customerId, orderId, action, ipAddress } = data;
    const transaction = await sequelize.transaction();

    try {
      // Validate customer
      const customer = await Customer.findByPk(customerId, { transaction });
      if (!customer) throw new AppError('Customer not found', 404, mTablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID);

      // Validate order
      const order = await InDiningOrder.findByPk(orderId, { transaction });
      if (!order || order.customer_id !== customerId) throw new AppError('Invalid order', 400, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

      // Validate action
      const gamificationAction = gamificationConstants.CUSTOMER_ACTIONS[action.toUpperCase()];
      if (!gamificationAction) throw new AppError('Invalid gamification action', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);

      // Award points
      const pointsRecord = await pointService.awardPoints({
        userId: customer.user_id,
        role: 'customer',
        action: gamificationAction.action,
        languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      }, transaction);

      // Record points
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + gamificationConstants.POINTS_EXPIRY_DAYS);
      const gamification = await GamificationPoints.create({
        user_id: customer.user_id,
        role: 'customer',
        action: gamificationAction.action,
        points: pointsRecord.points,
        metadata: { orderId },
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction });

      // Notify customer
      await notificationService.sendNotification({
        userId: customer.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.POINTS_AWARDED,
        messageKey: 'points.awarded',
        messageParams: { points: pointsRecord.points, action: gamificationAction.action, orderId },
        role: 'customer',
        module: 'mtables',
        orderId,
      });

      // Emit socket event
      await socketService.emit(null, 'points:awarded', {
        userId: customer.user_id,
        role: 'customer',
        orderId,
        points: pointsRecord.points,
      });

      // Log audit
      await auditService.logAction({
        action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.POINTS_AWARDED,
        userId: customer.user_id,
        role: 'customer',
        details: { orderId, points: pointsRecord.points, action: gamificationAction.action },
        ipAddress: ipAddress || 'unknown',
      }, transaction);

      await transaction.commit();
      logger.info('Gamification points awarded', { customerId, orderId, points: pointsRecord.points });
      return gamification;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error tracking gamification', { error: error.message });
      throw error;
    }
  }
}

module.exports = PreOrderService;