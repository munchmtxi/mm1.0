// payoutController.js
// Handles payout-related requests for merchants, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const payoutService = require('@services/merchant/wallet/payoutService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { Merchant, Staff } = require('@models');

async function configurePayoutSettings(req, res, next) {
  try {
    const { merchantId, settings } = req.body;
    const io = req.app.get('io');

    const wallet = await payoutService.configurePayoutSettings(merchantId, settings);

    const merchant = await Merchant.findByPk(merchantId);
    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'configure_payout_settings',
      details: { merchantId, schedule: settings.schedule, method: settings.method },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: merchant.user_id,
      action: 'configure_payout_settings',
      points: 5,
      details: { merchantId, schedule: settings.schedule, method: settings.method },
    });

    socketService.emit(io, 'merchant:payout:settingsConfigured', {
      merchantId,
      schedule: settings.schedule,
      method: settings.method,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'payout_settings_updated',
      messageKey: 'payout.settings_updated',
      messageParams: { schedule: settings.schedule, method: settings.method },
      role: 'merchant',
      module: 'payout',
      languageCode: merchant.preferred_language || 'en',
    });

    res.status(200).json({
      success: true,
      message: formatMessage('payout.settings_updated', { schedule: settings.schedule, method: settings.method }, merchant.preferred_language || 'en'),
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
}

async function processPayout(req, res, next) {
  try {
    const { merchantId, recipientId, amount } = req.body;
    const io = req.app.get('io');

    const transaction = await payoutService.processPayout(merchantId, recipientId, amount);

    const merchant = await Merchant.findByPk( merchantId);
    const recipient = await Staff.findByPk(recipientId);

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'process_payout',
      details: { merchantId, recipientId, amount, transactionId: transaction.id },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: merchant.user_id,
      action: 'process_payout',
      points: 20,
      details: { merchantId, recipientId, amount, transactionId: transaction.id },
    });

    socketService.emit(io, 'merchant:payout:processed', {
      transactionId: transaction.id,
      merchantId,
      recipientId,
      amount,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: recipient.user_id,
      notificationType: 'payout_received',
      messageKey: 'payout.received',
      messageParams: { amount, currency: transaction.currency },
      role: 'staff',
      module: 'payout',
      languageCode: recipient.user?.preferred_language || 'en',
    });

    res.status(200).json({
      success: true,
      message: formatMessage('payout.received', { amount, currency: transaction.currency }, merchant.preferred_language || 'en'),
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

async function verifyPayoutMethod(req, res, next) {
  try {
    const { recipientId, method } = req.body;
    const io = req.app.get('io');

    const verification = await payoutService.verifyPayoutMethod(recipientId, method);

    const recipient = await Staff.findByPk(recipientId);
    await auditService.logAction({
      userId: recipient.user_id,
      role: 'staff',
      action: 'verify_payout_method',
      details: { recipientId, method: method.type },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: recipient.user_id,
      action: 'verify_payout_method',
      points: 10,
      details: { recipientId, method: method.type },
    });

    socketService.emit(io, 'merchant:payout:methodVerified', {
      recipientId,
      method: method.type,
    }, `staff:${recipientId}`);

    await notificationService.sendNotification({
      userId: recipient.user_id,
      notificationType: 'payout_method_verified',
      messageKey: 'payout.method_verified',
      messageParams: { method: method.type },
      role: 'staff',
      module: 'payout',
      languageCode: recipient.user?.preferred_language || 'en',
    });

    res.status(200).json({
      success: true,
      message: formatMessage('payout.method_verified', { method: method.type }, recipient.user?.preferred_language || 'en'),
      data: verification,
    });
  } catch (error) {
    next(error);
  }
}

async function getPayoutHistory(req, res, next) {
  try {
    const { merchantId } = req.query;

    const transactions = await payoutService.getPayoutHistory(merchantId);

    const merchant = await Merchant.findByPk(merchantId);
    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'get_payout_history',
      details: { merchantId, transactionCount: transactions.length },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: formatMessage('payout.history_retrieved', { count: transactions.length }, merchant.preferred_language || 'en'),
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  configurePayoutSettings,
  processPayout,
  verifyPayoutMethod,
  getPayoutHistory,
};