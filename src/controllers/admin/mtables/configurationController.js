'use strict';

const configurationService = require('@services/admin/mtables/configurationService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');

async function setTableRules(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const rules = req.body;
    const result = await configurationService.setTableRules(restaurantId, rules, { pointService });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: mtablesConstants.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, rules },
      ipAddress: req.ip,
    });

    await notificationService.sendNotification({
      userId: req.user.id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'configuration.table_rules_updated',
      messageParams: { restaurantId, autoAssign: rules.autoAssign },
      role: 'merchant',
      module: 'mtables',
    });

    await socketService.emit(null, 'configuration:table_rules_updated', {
      userId: req.user.id,
      role: 'merchant',
      restaurantId,
      rules,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.table_rules_updated'),
    });
  } catch (error) {
    next(error);
  }
}

async function configureGamificationRules(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const gamificationRules = req.body;
    const result = await configurationService.configureGamificationRules(restaurantId, gamificationRules, { pointService });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: mtablesConstants.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, gamificationRules },
      ipAddress: req.ip,
    });

    await notificationService.sendNotification({
      userId: req.user.id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'configuration.gamification_updated',
      messageParams: { restaurantId },
      role: 'merchant',
      module: 'mtables',
    });

    await socketService.emit(null, 'configuration:gamification_updated', {
      userId: req.user.id,
      role: 'merchant',
      restaurantId,
      gamificationRules,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.gamification_rules_updated'),
    });
  } catch (error) {
    next(error);
  }
}

async function updateWaitlistSettings(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const waitlistSettings = req.body;
    const result = await configurationService.updateWaitlistSettings(restaurantId, waitlistSettings, { pointService });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: mtablesConstants.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, waitlistSettings },
      ipAddress: req.ip,
    });

    await notificationService.sendNotification({
      userId: req.user.id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'configuration.waitlist_updated',
      messageParams: { restaurantId, maxWaitlist: waitlistSettings.maxWaitlist },
      role: 'merchant',
      module: 'mtables',
    });

    await socketService.emit(null, 'configuration:waitlist_updated', {
      userId: req.user.id,
      role: 'merchant',
      restaurantId,
      waitlistSettings,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.waitlist_settings_updated'),
    });
  } catch (error) {
    next(error);
  }
}

async function configurePricingModels(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const pricingModels = req.body;
    const result = await configurationService.configurePricingModels(restaurantId, pricingModels, { pointService });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: mtablesConstants.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, pricingModels },
      ipAddress: req.ip,
    });

    await notificationService.sendNotification({
      userId: req.user.id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'configuration.pricing_updated',
      messageParams: { restaurantId, depositPercentage: pricingModels.depositPercentage },
      role: 'merchant',
      module: 'mtables',
    });

    await socketService.emit(null, 'configuration:pricing_updated', {
      userId: req.user.id,
      role: 'merchant',
      restaurantId,
      pricingModels,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.pricing_models_updated'),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  setTableRules,
  configureGamificationRules,
  updateWaitlistSettings,
  configurePricingModels,
};