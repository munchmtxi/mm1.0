'use strict';

const subscriptionService = require('@services/customer/mtxi/subscriptionService');
const walletService = require('@services/common/walletService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const customerConstants = require('@constants/customer/customerConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const { sequelize, Wallet } = require('@models');

async function enrollSubscription(req, res) {
  const { planId, serviceType, paymentMethodId } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    const wallet = await Wallet.findOne({
      where: { user_id: req.user.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.CUSTOMER },
      transaction,
    });
    if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES[0]);

    const plan = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS[planId];
    const paymentAmount = plan.amount || (serviceType === 'mtxi' ? 10 : 15);

    const payment = await walletService.processTransaction(
      wallet.id,
      {
        type: paymentConstants.TRANSACTION_TYPES[0],
        amount: paymentAmount,
        currency: wallet.currency,
        paymentMethodId,
        status: paymentConstants.TRANSACTION_STATUSES[0],
      },
      { transaction }
    );

    const subscription = await subscriptionService.enrollSubscription(customerId, planId, serviceType, transaction);
    subscription.payment_id = payment.id;
    await subscription.save({ transaction });

    try {
      await pointService.awardPoints({
        userId: req.user.user_id,
        role: 'customer',
        action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.SUBSCRIPTION_ENROLLMENT.action,
        languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });
    } catch (error) {
      gamificationError = error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.SUBSCRIPTION_ENROLLED,
      details: { subscriptionId: subscription.id, planId, serviceType, paymentAmount },
      ipAddress: req.ip,
    }, transaction);

    await notificationService.sendNotification({
      userId: req.user.user_id,
      type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUBSCRIPTION_UPDATE,
      message: formatMessage('subscription_enrolled', { subscriptionId: subscription.id, plan: planId, service: serviceType }),
    });

    await socketService.emit('subscription:enrolled', { userId: customerId, role: 'customer', subscriptionId: subscription.id });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Subscription enrolled',
      data: { subscriptionId: subscription.id, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 500, error.code || customerConstants.ERROR_CODES[5]);
  }
}

async function manageSubscription(req, res) {
  const { subscriptionId, action, newPlanId, paymentMethodId } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    let payment;
    if (action === 'UPGRADE') {
      const wallet = await Wallet.findOne({
        where: { user_id: req.user.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.CUSTOMER },
        transaction,
      });
      if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES[0]);

      const plan = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS[newPlanId];
      const paymentAmount = plan.amount || 15;

      payment = await walletService.processTransaction(
        wallet.id,
        {
          type: paymentConstants.TRANSACTION_TYPES[0],
          amount: paymentAmount,
          currency: wallet.currency,
          paymentMethodId,
          status: paymentConstants.TRANSACTION_STATUSES[0],
        },
        { transaction }
      );
    }

    const subscription = await subscriptionService.manageSubscription(customerId, subscriptionId, action, newPlanId, transaction);
    if (payment) {
      subscription.payment_id = payment.id;
      await subscription.save({ transaction });
    }

    if (action === 'UPGRADE' && newPlanId === 'PREMIUM') {
      try {
        await pointService.awardPoints({
          userId: req.user.user_id,
          role: 'customer',
          action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.TIER_UPGRADE.action,
          languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
        });
      } catch (error) {
        gamificationError = error.message;
      }
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.SUBSCRIPTION_UPDATED,
      details: { subscriptionId, action, newPlanId },
      ipAddress: req.ip,
    }, transaction);

    await notificationService.sendNotification({
      userId: req.user.user_id,
      type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUBSCRIPTION_UPDATE,
      message: formatMessage(`subscription_${action.toLowerCase()}`, { subscriptionId, plan: newPlanId || subscription.plan, service: subscription.service_type }),
    });

    await socketService.emit('subscription:updated', { userId: customerId, role: 'customer', subscriptionId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Subscription updated',
      data: { subscriptionId, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 500, error.code || customerConstants.ERROR_CODES[5]);
  }
}

async function cancelSubscription(req, res) {
  const { subscriptionId } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    const subscription = await subscriptionService.cancelSubscription(customerId, subscriptionId, transaction);

    try {
      await pointService.awardPoints({
        userId: req.user.user_id,
        role: 'customer',
        action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.SUBSCRIPTION_CANCELLATION.action,
        languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });
    } catch (error) {
      gamificationError = error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.SUBSCRIPTION_CANCELLED,
      details: { subscriptionId },
      ipAddress: req.ip,
    }, transaction);

    await notificationService.sendNotification({
      userId: req.user.user_id,
      type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUBSCRIPTION_UPDATE,
      message: formatMessage('subscription_cancelled', { subscriptionId, service: subscription.service_type }),
    });

    await socketService.emit('subscription:cancelled', { userId: customerId, role: 'customer', subscriptionId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Subscription cancelled',
      data: { subscriptionId, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || customerConstants.ERROR_CODES[5]);
  }
}

async function trackSubscriptionTiers(req, res) {
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    const tierDetails = await subscriptionService.trackSubscriptionTiers(customerId, transaction);
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Subscription tiers retrieved',
      data: tierDetails,
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || customerConstants.ERROR_CODES[5]);
  }
}

async function getSubscriptionHistory(req, res) {
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    const subscriptions = await subscriptionService.getSubscriptionHistory(customerId, transaction);
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Subscription history retrieved',
      data: subscriptions,
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || customerConstants.ERROR_CODES[5]);
  }
}

module.exports = {
  enrollSubscription,
  manageSubscription,
  cancelSubscription,
  trackSubscriptionTiers,
  getSubscriptionHistory,
};