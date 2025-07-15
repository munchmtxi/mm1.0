'use strict';

const { sequelize } = require('@models');
const orderService = require('@services/merchant/mtables/orderService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const walletService = require('@services/common/walletService');
const mtablesConstants = require('@constants/merchant/mtablesConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const calculatePoints = (action, metadata, role) => {
  const actionConfig = role === 'merchant'
    ? gamificationConstants.MERCHANT_ACTIONS.find(a => a.action === action)
    : gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === action);
  if (!actionConfig) return 0;

  let points = actionConfig.basePoints;
  let multipliers = 1;

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const processExtraOrder = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const { items } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await orderService.processExtraOrder(bookingId, items, ipAddress, transaction);
    const points = calculatePoints(result.action, {}, 'customer');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.EXTRA_ORDER_PROCESSED,
        messageKey: 'mtables.extraOrderProcessed',
        messageParams: { orderId: result.orderId, totalAmount: result.totalAmount },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[1],
        role: 'customer',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    const merchant = await Merchant.findOne({
      include: [{ model: MerchantBranch, where: { id: result.branchId } }],
      transaction,
    });

    await notificationService.sendNotification(
      {
        userId: merchant.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.EXTRA_ORDER_PROCESSED,
        messageKey: 'mtables.orderReceived',
        messageParams: { orderId: result.orderId, tableId: result.tableId, branchId: result.branchId },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[1],
        role: 'merchant',
        module: 'mtables',
        languageCode: merchant.preferred_language || 'en',
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(req.user.id, result.action, points, {
        io,
        role: 'customer',
        languageCode: result.language,
        metadata: {},
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.EXTRA_ORDER_PROCESSED,
          messageKey: 'mtables.pointsReceived',
          messageParams: { points, action: result.action },
          priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
          role: 'customer',
          module: 'mtables',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: req.user.id,
        role: 'customer',
        action: mtablesConstants.AUDIT_TYPES.EXTRA_ORDER_PROCESSED,
        details: { orderId: result.orderId, bookingId, totalAmount: result.totalAmount, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:extraOrderProcessed', {
      orderId: result.orderId,
      tableId: result.tableId,
      points,
    }, `merchant:${result.branchId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const applyDietaryFilters = catchAsync(async (req, res) => {
  const { customerId } = req.params;
  const { items } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await orderService.applyDietaryFilters(customerId, items, ipAddress, transaction);
    const points = calculatePoints(result.action, {}, 'customer');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.DIETARY_FILTERS_APPLIED,
        messageKey: 'mtables.dietaryFiltersApplied',
        messageParams: { filteredItemCount: result.filteredItemCount },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[1],
        role: 'customer',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(req.user.id, result.action, points, {
        io,
        role: 'customer',
        languageCode: result.language,
        metadata: {},
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.DIETARY_FILTERS_APPLIED,
          messageKey: 'mtables.pointsReceived',
          messageParams: { points, action: result.action },
          priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
          role: 'customer',
          module: 'mtables',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: req.user.id,
        role: 'customer',
        action: mtablesConstants.AUDIT_TYPES.DIETARY_FILTERS_APPLIED,
        details: { customerId, filteredItemCount: result.filteredItemCount, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:dietaryFiltersApplied', {
      customerId,
      filteredItemCount: result.filteredItemCount,
      points,
    }, `customer:${customerId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateOrderStatus = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await orderService.updateOrderStatus(orderId, status, ipAddress, transaction);
    const points = calculatePoints(result.action, {}, 'merchant');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.ORDER_STATUS_UPDATED,
        messageKey: 'mtables.orderStatusUpdated',
        messageParams: { orderId, status },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[1],
        role: 'merchant',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    const customer = await Customer.findOne({
      include: [{ model: InDiningOrder, where: { id: orderId } }],
      transaction,
    });

    await notificationService.sendNotification(
      {
        userId: customer.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.ORDER_STATUS_UPDATED,
        messageKey: 'mtables.orderStatusUpdatedCustomer',
        messageParams: { orderId, status },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[1],
        role: 'customer',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(req.user.id, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: {},
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.ORDER_STATUS_UPDATED,
          messageKey: 'mtables.pointsReceived',
          messageParams: { points, action: result.action },
          priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
          role: 'merchant',
          module: 'mtables',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: req.user.id,
        role: 'merchant',
        action: mtablesConstants.AUDIT_TYPES.ORDER_STATUS_UPDATED,
        details: { orderId, status, tableId: result.tableId, branchId: result.branchId, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:orderStatusUpdated', {
      orderId,
      status,
      points,
    }, `merchant:${result.branchId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const payOrderWithWallet = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const { walletId } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await orderService.payOrderWithWallet(orderId, walletId, ipAddress, transaction);
    const points = calculatePoints(result.action, {}, 'customer');

    const transactionData = await walletService.processTransaction(walletId, {
      type: mtablesConstants.FINANCIAL_SETTINGS.PAYMENT_TRANSACTION_TYPE,
      amount: result.amount,
      currency: (await InDiningOrder.findByPk(orderId, { attributes: ['currency'], transaction })).currency,
      paymentMethodId: null,
    }, transaction);

    const payment = await sequelize.models.Payment.create({
      order_id: orderId,
      customer_id: req.user.id,
      merchant_id: (await InDiningOrder.findByPk(orderId, { attributes: ['merchant_id'], transaction })).merchant_id,
      amount: result.amount,
      currency: (await InDiningOrder.findByPk(orderId, { attributes: ['currency'], transaction })).currency,
      transaction_id: transactionData.id,
      payment_method: 'digital_wallet',
      status: mtablesConstants.FINANCIAL_SETTINGS.TRANSACTION_STATUSES.COMPLETED,
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction });

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.ORDER_PAID_WITH_WALLET,
        messageKey: 'mtables.orderPaidWithWallet',
        messageParams: { orderId, amount: result.amount },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[1],
        role: 'customer',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(req.user.id, result.action, points, {
        io,
        role: 'customer',
        languageCode: result.language,
        metadata: {},
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.ORDER_PAID_WITH_WALLET,
          messageKey: 'mtables.pointsReceived',
          messageParams: { points, action: result.action },
          priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
          role: 'customer',
          module: 'mtables',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: req.user.id,
        role: 'customer',
        action: mtablesConstants.AUDIT_TYPES.ORDER_PAID_WITH_WALLET,
        details: { orderId, paymentId: payment.id, amount: result.amount, walletId, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:orderPaidWithWallet', {
      orderId,
      paymentId: result.paymentId,
      points,
    }, `merchant:${result.branchId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { processExtraOrder, applyDietaryFilters, updateOrderStatus, payOrderWithWallet };