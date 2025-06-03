subscriptionHandler.js'use strict';

const subscriptionEvents = require('@events/customer/mtxi/subscriptionEvents');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const walletService = require('@services/common/walletService');
const { Subscription, Wallet } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization/localization');
const logger = require('@utils/logger');
const { sequelize } = require('sequelize');

async function initializeSubscriptionHandler() {
  try {
    socketService.on(subscriptionEvents.SUBSCRIPTION_ENROLLED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUBSCRIPTION_UPDATE,
        message: formatMessage('subscription_enrolled', { subscriptionId: data.subscriptionId }),
      });
    });

    socketService.on(subscriptionEvents.SUBSCRIPTION_UPDATED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUBSCRIPTION_UPDATE,
        message: formatMessage('subscription_updated', { subscriptionId: data.subscriptionId }),
      });
    });

    socketService.on(subscriptionEvents.SUBSCRIPTION_CANCELLED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUBSCRIPTION_UPDATE,
        message: formatMessage('subscription_cancelled', { subscriptionId: data.subscriptionId }),
      });
    });

    setInterval(async () => {
      const transaction = await sequelize.transaction();
      try {
        const subscriptions = await Subscription.findAll({
          where: { status: 'active' },
          transaction,
        });

        for (const subscription of subscriptions) {
          const wallet = await Wallet.findOne({
            where: { user_id: subscription.customer_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.CUSTOMER },
            transaction,
          });
          if (!wallet) continue;

          const pointsRecord = await pointService.awardPoints({
            userId: subscription.customer_id,
            role: 'customer',
            action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.SUBSCRIPTION_LOYALTY.action,
            languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
          }, transaction);

          if (pointsRecord.walletCredit) {
            await walletService.processTransaction(
              wallet.id,
              {
                type: paymentConstants.TRANSACTION_TYPES[2],
                amount: pointsRecord.walletCredit,
                currency: wallet.currency,
                status: paymentConstants.TRANSACTION_STATUSES[1],
              },
              { transaction }
            );

            await notificationService.sendNotification({
              userId: subscription.customer_id,
              type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.GAMIFICATION_REWARD,
              message: formatMessage('gamification_reward', { points: pointsRecord.points, amount: pointsRecord.walletCredit, service: subscription.service_type }),
            });
          }

          await socketService.emit(subscriptionEvents.SUBSCRIPTION_LOYALTY_AWARDED, {
            userId: subscription.customer_id,
            role: 'customer',
            subscriptionId: subscription.id,
          });
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        logger.error('Failed to award loyalty points', { error: error.message });
      }
    }, 24 * 60 * 60 * 1000);

    logger.info('Subscription event handlers initialized');
  } catch (error) {
    logger.error('Failed to initialize subscription handlers', { error: error.message });
    throw error;
  }
}

module.exports = { initializeSubscriptionHandler };