'use strict';

/**
 * Payment Service (Merchant Side)
 * Manages merchant-side payment operations, including processing payments, managing split payments,
 * issuing refunds, and awarding gamification points. Integrates with Booking, Customer, InDiningOrder,
 * Staff, MerchantBranch, Wallet, Payment, and GamificationPoints models, and uses notification, audit,
 * socket, point, and wallet services.
 *
 * Last Updated: May 21, 2025
 */

const { Booking, Customer, InDiningOrder, Staff, MerchantBranch, Wallet, Payment, GamificationPoints } = require('@models');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const walletService = require('@services/common/walletService');
const mTablesConstants = require('@constants/mTablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const gamificationConstants = require('@constants/gamificationConstants');
const paymentConstants = require('@constants/paymentConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');

class PaymentService {
  /**
   * Processes a payment for a booking
   * @param {number} bookingId - Booking ID
   * @param {number} amount - Payment amount
   * @param {number} walletId - Wallet ID
   * @param {Object} options - Additional options { staffId, paymentMethodId, ipAddress }
   * @returns {Promise<Object>} Payment record
   */
  static async processPayment(bookingId, amount, walletId, options = {}) {
    const { staffId, paymentMethodId, ipAddress } = options;
    const transaction = await sequelize.transaction();

    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [{ model: Customer, as: 'customer' }, { model: InDiningOrder, as: 'inDiningOrders' }],
        transaction,
      });
      if (!booking) {
        throw new AppError('Booking not found', 404, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      const order = booking.inDiningOrders?.find(o => o.payment_status === 'pending');
      if (!order) {
        throw new AppError('No pending order found for booking', 400, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      if (amount <= 0 || amount > order.total_amount) {
        throw new AppError('Invalid payment amount', 400, mTablesConstants.ERROR_CODES.PAYMENT_FAILED);
      }

      const wallet = await Wallet.findByPk(walletId, { transaction });
      if (!wallet || wallet.user_id !== booking.customer.user_id) {
        throw new AppError('Invalid wallet', 400, mTablesConstants.ERROR_CODES.PAYMENT_FAILED);
      }

      if (wallet.balance < amount) {
        throw new AppError('Insufficient wallet balance', 400, mTablesConstants.ERROR_CODES.PAYMENT_FAILED);
      }

      const staff = staffId ? await Staff.findOne({
        where: { id: staffId, availability_status: mTablesConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES.AVAILABLE },
        transaction,
      }) : null;
      if (staffId && !staff) {
        throw new AppError('Staff unavailable', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const payment = await Payment.create({
        in_dining_order_id: order.id,
        customer_id: booking.customer_id,
        merchant_id: order.branch.merchant_id,
        staff_id: staff?.id,
        amount,
        payment_method: paymentMethodId || paymentConstants.DEFAULT_PAYMENT_METHOD,
        status: 'completed',
        transaction_id: transactionId,
        currency: order.currency,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction });

      await walletService.processTransaction({
        walletId: wallet.id,
        type: paymentConstants.FINANCIAL_SETTINGS.PAYMENT_TRANSACTION_TYPE,
        amount: -amount,
        currency: wallet.currency,
        paymentMethodId,
      }, { transaction });

      if (amount === order.total_amount) {
        await order.update({ payment_status: 'completed' }, { transaction });
      }

      await notificationService.sendNotification({
        userId: booking.customer.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.PAYMENT_COMPLETED,
        messageKey: 'payment.completed',
        messageParams: { orderId: order.id, amount },
        role: 'customer',
        module: 'mtables',
        orderId: order.id,
      });

      await notificationService.sendNotification({
        userId: order.branch.merchant.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.PAYMENT_RECEIVED,
        messageKey: 'payment.received',
        messageParams: { orderId: order.id, amount },
        role: 'merchant',
        module: 'mtables',
        orderId: order.id,
      });

      await socketService.emit(null, 'payment:completed', {
        userId: booking.customer.user_id,
        role: 'customer',
        orderId: order.id,
        paymentId: payment.id,
      });

      await auditService.logAction({
        userId: staff?.user_id || booking.customer.user_id,
        role: staff ? 'merchant' : 'customer',
        action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PAYMENT_PROCESSED,
        details: { orderId: order.id, paymentId: payment.id, amount },
        ipAddress: ipAddress || 'unknown',
      }, { transaction });

      await transaction.commit();
      logger.info('Payment processed', { orderId: order.id, paymentId: payment.id, amount });
      return payment;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error processing payment', { error: error.message });
      throw error;
    }
  }

  /**
   * Manages split payments for a booking
   * @param {number} bookingId - Booking ID
   * @param {Array} payments - Array of payment details [{ customerId, amount, walletId, paymentMethodId }]
   * @param {Object} options - Additional options { staffId, ipAddress }
   * @returns {Promise<Object>} Payment records and order
   */
  static async manageSplitPayments(bookingId, payments, options = {}) {
    const { staffId, ipAddress } = options;
    const transaction = await sequelize.transaction();

    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: InDiningOrder, as: 'inDiningOrders' },
          { model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] },
        ],
        transaction,
      });
      if (!booking) {
        throw new AppError('Booking not found', 404, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      const order = booking.inDiningOrders?.find(o => o.payment_status === 'pending');
      if (!order) {
        throw new AppError('No pending order found for booking', 400, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      const totalSplit = payments.reduce((sum, p) => sum + p.amount, 0);
      if (totalSplit !== order.total_amount) {
        throw new AppError('Split payments do not match order total', 400, mTablesConstants.ERROR_CODES.PAYMENT_FAILED);
      }

      const staff = staffId ? await Staff.findOne({
        where: { id: staffId, availability_status: mTablesConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES.AVAILABLE },
        transaction,
      }) : null;
      if (staffId && !staff) {
        throw new AppError('Staff unavailable', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      const paymentRecords = [];
      for (const payment of payments) {
        const { customerId, amount, walletId, paymentMethodId } = payment;

        const customer = await Customer.findByPk(customerId, { transaction });
        if (!customer) {
          throw new AppError(`Customer ${customerId} not found`, 404, mTablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID);
        }

        const wallet = await Wallet.findByPk(walletId, { transaction });
        if (!wallet || wallet.user_id !== customer.user_id) {
          throw new AppError(`Invalid wallet for customer ${customerId}`, 400, mTablesConstants.ERROR_CODES.PAYMENT_FAILED);
        }

        if (wallet.balance < amount) {
          throw new AppError(`Insufficient balance for customer ${customerId}`, 400, mTablesConstants.ERROR_CODES.PAYMENT_FAILED);
        }

        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const paymentRecord = await Payment.create({
          in_dining_order_id: order.id,
          customer_id: customerId,
          merchant_id: order.branch.merchant_id,
          staff_id: staff?.id,
          amount,
          payment_method: paymentMethodId || paymentConstants.DEFAULT_PAYMENT_METHOD,
          status: 'completed',
          transaction_id: transactionId,
          currency: order.currency,
          created_at: new Date(),
          updated_at: new Date(),
        }, { transaction });

        await walletService.processTransaction({
          walletId: wallet.id,
          type: paymentConstants.FINANCIAL_SETTINGS.PAYMENT_TRANSACTION_TYPE,
          amount: -amount,
          currency: wallet.currency,
          paymentMethodId,
        }, { transaction });

        paymentRecords.push(paymentRecord);
      }

      await order.update({ payment_status: 'completed' }, { transaction });

      for (const payment of payments) {
        const customer = await Customer.findByPk(payment.customerId, { transaction });
        await notificationService.sendNotification({
          userId: customer.user_id,
          notificationType: mTablesConstants.NOTIFICATION_TYPES.PAYMENT_COMPLETED,
          messageKey: 'payment.completed',
          messageParams: { orderId: order.id, amount: payment.amount },
          role: 'customer',
          module: 'mtables',
          orderId: order.id,
        });
      }

      await notificationService.sendNotification({
        userId: order.branch.merchant.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.PAYMENT_RECEIVED,
        messageKey: 'payment.received',
        messageParams: { orderId: order.id, totalAmount: order.total_amount },
        role: 'merchant',
        module: 'mtables',
        orderId: order.id,
      });

      await socketService.emit(null, 'payment:completed', {
        userId: order.customer_id,
        role: 'customer',
        orderId: order.id,
        paymentIds: paymentRecords.map(p => p.id),
      });

      await auditService.logAction({
        userId: staff?.user_id || order.branch.merchant.user_id,
        role: 'merchant',
        action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.SPLIT_PAYMENT_PROCESSED,
        details: { orderId: order.id, paymentIds: paymentRecords.map(p => p.id) },
        ipAddress: ipAddress || 'unknown',
      }, { transaction });

      await transaction.commit();
      logger.info('Split payments processed', { orderId: order.id, paymentIds: paymentRecords.map(p => p.id) });
      return { payments: paymentRecords, order };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error managing split payments', { error: error.message });
      throw error;
    }
  }

  /**
   * Issues a refund to a wallet for a booking
   * @param {number} bookingId - Booking ID
   * @param {number} walletId - Wallet ID
   * @param {Object} options - Additional options { amount, staffId, ipAddress }
   * @returns {Promise<Object>} Refund payment record
   */
  static async issueRefund(bookingId, walletId, options = {}) {
    const { amount, staffId, ipAddress } = options;
    const transaction = await sequelize.transaction();

    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Customer, as: 'customer' },
          { model: InDiningOrder, as: 'inDiningOrders', include: [{ model: Payment, as: 'payments' }] },
        ],
        transaction,
      });
      if (!booking) {
        throw new AppError('Booking not found', 404, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      const order = booking.inDiningOrders?.find(o => o.payment_status === 'completed');
      if (!order) {
        throw new AppError('No completed order found for booking', 400, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
      if (!amount || amount <= 0 || amount > totalPaid) {
        throw new AppError('Invalid refund amount', 400, mTablesConstants.ERROR_CODES.PAYMENT_FAILED);
      }

      const wallet = await Wallet.findByPk(walletId, { transaction });
      if (!wallet || wallet.user_id !== booking.customer.user_id) {
        throw new AppError('Invalid wallet', 400, mTablesConstants.ERROR_CODES.PAYMENT_FAILED);
      }

      const staff = staffId ? await Staff.findOne({
        where: { id: staffId, availability_status: mTablesConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES.AVAILABLE },
        transaction,
      }) : null;
      if (staffId && !staff) {
        throw new AppError('Staff unavailable', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      const transactionId = `RFN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const refund = await Payment.create({
        in_dining_order_id: order.id,
        customer_id: booking.customer_id,
        merchant_id: order.branch.merchant_id,
        staff_id: staff?.id,
        amount: -amount,
        payment_method: paymentConstants.DEFAULT_PAYMENT_METHOD,
        status: 'completed',
        transaction_id: transactionId,
        currency: order.currency,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction });

      await walletService.processTransaction({
        walletId: wallet.id,
        type: paymentConstants.FINANCIAL_SETTINGS.REFUND_TRANSACTION_TYPE,
        amount,
        currency: wallet.currency,
      }, { transaction });

      await notificationService.sendNotification({
        userId: booking.customer.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.REFUND_ISSUED,
        messageKey: 'payment.refunded',
        messageParams: { orderId: order.id, amount },
        role: 'customer',
        module: 'mtables',
        orderId: order.id,
      });

      await notificationService.sendNotification({
        userId: order.branch.merchant.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.REFUND_PROCESSED,
        messageKey: 'payment.refunded_processed',
        messageParams: { orderId: order.id, amount },
        role: 'merchant',
        module: 'mtables',
        orderId: order.id,
      });

      await socketService.emit(null, 'payment:refunded', {
        userId: booking.customer.user_id,
        role: 'customer',
        orderId: order.id,
        refundId: refund.id,
      });

      await auditService.logAction({
        userId: staff?.user_id || order.branch.merchant.user_id,
        role: 'merchant',
        action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.REFUND_ISSUED,
        details: { orderId: order.id, refundId: refund.id, amount },
        ipAddress: ipAddress || 'unknown',
      }, { transaction });

      await transaction.commit();
      logger.info('Refund issued', { orderId: order.id, refundId: refund.id, amount });
      return refund;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error issuing refund', { error: error.message });
      throw error;
    }
  }

  /**
   * Tracks gamification points for payment actions
   * @param {number} customerId - Customer ID
   * @returns {Promise<Object>} Points record
   */
  static async trackPaymentGamification(customerId) {
    const transaction = await sequelize.transaction();

    try {
      if (!customerId) {
        throw new AppError('Customer ID required', 400, mTablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID);
      }

      const customer = await Customer.findByPk(customerId, { transaction });
      if (!customer) {
        throw new AppError('Customer not found', 404, mTablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID);
      }

      const gamificationAction = gamificationConstants.CUSTOMER_ACTIONS.PAYMENT_COMPLETED;
      const pointsRecord = await pointService.awardPoints({
        userId: customer.user_id,
        role: 'customer',
        action: gamificationAction.action,
        languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      }, { transaction });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + gamificationConstants.POINTS_EXPIRY_DAYS);
      const gamification = await GamificationPoints.create({
        user_id: customer.user_id,
        role: 'customer',
        action: gamificationAction.action,
        points: pointsRecord.points,
        metadata: { customerId },
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction });

      await notificationService.sendNotification({
        userId: customer.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.POINTS_AWARDED,
        messageKey: 'points.awarded',
        messageParams: { points: pointsRecord.points, action: gamificationAction.action },
        role: 'customer',
        module: 'mtables',
      });

      await socketService.emit(null, 'points:awarded', {
        userId: customer.user_id,
        role: 'customer',
        points: pointsRecord.points,
      });

      await auditService.logAction({
        userId: customer.user_id,
        role: 'customer',
        action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.POINTS_AWARDED,
        details: { customerId, points: pointsRecord.points, action: gamificationAction.action },
        ipAddress: 'unknown',
      }, { transaction });

      await transaction.commit();
      logger.info('Payment gamification points awarded', { customerId, points: pointsRecord.points });
      return gamification;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error tracking payment gamification', { error: error.message });
      throw error;
    }
  }
}

module.exports = PaymentService;