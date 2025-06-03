'use strict';

const { sequelize } = require('@models');
const subscriptionService = require('@services/customer/munch/subscriptionService');
const notificationService = require('@services/common/notificationService');
const walletService = require('@services/common/walletService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/customer/munch/munchConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const enrollSubscription = catchAsync(async (req, res) => {
  const { customerId } = req.user;
  const { planId } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const { subscription, wallet, amount, currency } = await subscriptionService.enrollSubscription(customerId, planId, transaction);
    await walletService.processTransaction(wallet.id, {
      type: munchConstants.PAYMENT_CONSTANTS.TRANSACTION_TYPES[0],
      amount,
      currency,
    }, transaction);
    await Payment.create({
      customer_id: subscription.customer_id,
      merchant_id: null,
      amount,
      payment_method: 'wallet',
      status: munchConstants.PAYMENT_CONSTANTS.PAYMENT_STATUSES[1],
      transaction_id: `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    }, { transaction });
    await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'subscription_enrollment').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: munchConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
      messageKey: 'subscription.enrolled',
      messageParams: { planId },
      role: 'customer',
      module: 'munch',
      deliveryMethod: munchConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, 'subscription:enrolled', {
      subscriptionId: subscription.id,
      planId,
      customerId
    }, `customer:${customerId}`);
    await auditService.logAction({
      action: 'ENROLL_SUBSCRIPTION',
      userId: customerId,
      role: 'customer',
      details: `Enrolled in plan_id: ${planId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Subscription enrolled', { customerId, subscriptionId: subscription.id });
    res.status(200).json({
      status: 'success',
      data: { subscriptionId: subscription.id, planId, status: munchConstants.SUBSCRIPTION_CONSTANTS.STATUSES[0] }
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const manageSubscription = catchAsync(async (req, res) => {
  const { customerId } = req.user;
  const { action, newPlanId, pauseDurationDays } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const { subscription, wallet, amount, refundAmount, newStatus, newPlanId: updatedPlanId } = await subscriptionService.manageSubscription(
      customerId,
      action,
      { newPlanId, pauseDurationDays },
      transaction
    );
    if (amount > 0) {
      await walletService.processTransaction(wallet.id, {
        type: munchConstants.PAYMENT_CONSTANTS.TRANSACTION_TYPES[0],
        amount,
        currency: munchConstants.PAYMENT_CONSTANTS.DEFAULT_CURRENCY,
      }, transaction);
      await Payment.create({
        customer_id: subscription.customer_id,
        merchant_id: null,
        amount,
        payment_method: 'wallet',
        status: munchConstants.PAYMENT_CONSTANTS.PAYMENT_STATUSES[1],
        transaction_id: `SUB-UPG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      }, { transaction });
    }
    if (refundAmount > 0) {
      await walletService.processTransaction(wallet.id, {
        type: munchConstants.PAYMENT_CONSTANTS.TRANSACTION_TYPES[1],
        amount: refundAmount,
        currency: munchConstants.PAYMENT_CONSTANTS.DEFAULT_CURRENCY,
      }, transaction);
      await Payment.create({
        customer_id: subscription.customer_id,
        merchant_id: null,
        amount: refundAmount,
        payment_method: 'wallet',
        status: munchConstants.PAYMENT_CONSTANTS.PAYMENT_STATUSES[2],
        transaction_id: `SUB-REF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      }, { transaction });
    }
    const gamificationAction = action === munchConstants.SUBSCRIPTION_CONSTANTS.ACTIONS[0] ? 'tier_upgrade' :
                              action === munchConstants.SUBSCRIPTION_CONSTANTS.ACTIONS[3] ? 'subscription_cancellation' :
                              'subscription_activity';
    await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === gamificationAction).action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: munchConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.find(t => t.toLowerCase().includes(action.toLowerCase())) || 'subscription_updated',
      messageKey: `subscription.${action.toLowerCase()}`,
      messageParams: { subscriptionId: subscription.id },
      role: 'customer',
      module: 'munch',
      deliveryMethod: munchConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, `subscription:${action.toLowerCase()}`, {
      subscriptionId: subscription.id,
      status: newStatus,
      customerId
    }, `customer:${customerId}`);
    await auditService.logAction({
      action: `SUBSCRIPTION_${action.toUpperCase()}`,
      userId: customerId,
      role: 'customer',
      details: `Performed ${action} on subscription_id: ${subscription.id}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info(`Subscription ${action.toLowerCase()}`, { customerId, subscriptionId: subscription.id });
    res.status(200).json({
      status: 'success',
      data: {
        subscriptionId: subscription.id,
        status: newStatus,
        newPlanId: updatedPlanId,
        amount,
        refundAmount
      }
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const trackSubscriptionTiers = catchAsync(async (req, res) => {
  const { customerId } = req.user;
  const transaction = await sequelize.transaction();
  try {
    const tierDetails = await subscriptionService.trackSubscriptionTiers(customerId, transaction);
    await auditService.logAction({
      action: 'TRACK_SUBSCRIPTION_TIER',
      userId: customerId,
      role: 'customer',
      details: `Tracked tier for subscription_id: ${tierDetails.subscriptionId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Subscription tier tracked', { customerId, subscriptionId: tierDetails.subscriptionId });
    res.status(200).json({ status: 'success', data: tierDetails });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { enrollSubscription, manageSubscription, trackSubscriptionTiers };