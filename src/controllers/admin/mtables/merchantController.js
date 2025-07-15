'use strict';

const merchantService = require('@services/admin/mtables/merchantService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const merchantConstants = require('@constants/merchantConstants');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');

async function approveMerchantOnboarding(req, res, next) {
  try {
    const { merchantId } = req.params;
    const result = await merchantService.approveMerchantOnboarding(merchantId);

    await notificationService.sendNotification({
      userId: merchantId.toString(),
      notificationType: merchantConstants.NOTIFICATION_TYPES.MERCHANT_ONBOARDING,
      messageKey: 'merchant.onboarding_approved',
      messageParams: { merchantId },
      role: 'merchant',
      module: 'mtables',
    });

    await socketService.emit(null, 'merchant:onboarding_approved', {
      userId: merchantId.toString(),
      role: 'merchant',
      merchantId,
    });

    await auditService.logAction({
      userId: req.user.id,
      role: 'admin',
      action: merchantConstants.AUDIT_TYPES.ONBOARDING_APPROVED,
      details: { merchantId, status: result.status },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.merchant_onboarding_approved'),
    });
  } catch (error) {
    next(error);
  }
}

async function manageMenus(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const menuUpdates = req.body;
    const result = await merchantService.manageMenus(restaurantId, menuUpdates);

    await notificationService.sendNotification({
      userId: result.merchant_id ? result.merchant_id.toString() : req.user.id,
      notificationType: merchantConstants.NOTIFICATION_TYPES.PROMOTION_UPDATE,
      messageKey: 'merchant.menu_updated',
      messageParams: { restaurantId },
      role: 'merchant',
      module: 'mtables',
    });

    await socketService.emit(null, 'merchant:menu_updated', {
      userId: result.merchant_id ? result.merchant_id.toString() : req.user.id,
      role: 'merchant',
      restaurantId,
    });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: merchantConstants.AUDIT_TYPES.MENU_UPDATED,
      details: { restaurantId, itemCount: result.itemCount },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.menu_updated'),
    });
  } catch (error) {
    next(error);
  }
}

async function configureReservationPolicies(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const policies = req.body;
    const result = await merchantService.configureReservationPolicies(restaurantId, policies);

    await notificationService.sendNotification({
      userId: result.merchant_id ? result.merchant_id.toString() : req.user.id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'merchant.reservation_policies_updated',
      messageParams: { restaurantId },
      role: 'merchant',
      module: 'mtables',
    });

    await socketService.emit(null, 'merchant:reservation_policies_updated', {
      userId: result.merchant_id ? result.merchant_id.toString() : req.user.id,
      role: 'merchant',
      restaurantId,
      policies,
    });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: mtablesConstants.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, policies },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.reservation_policies_updated'),
    });
  } catch (error) {
    next(error);
  }
}

async function monitorBranchPerformance(req, res, next) {
  try {
    const { merchantId } = req.params;
    const result = await merchantService.monitorBranchPerformance(merchantId);

    await notificationService.sendNotification({
      userId: merchantId.toString(),
      notificationType: merchantConstants.NOTIFICATION_TYPES.PROMOTION,
      messageKey: 'merchant.performance_updated',
      messageParams: { merchantId },
      role: 'merchant',
      module: 'mtables',
    });

    await socketService.emit(null, 'merchant:performance_updated', {
      userId: merchantId.toString(),
      role: 'merchant',
      merchantId,
      performanceSummary: result.performanceSummary,
    });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: merchantConstants.METRICS.SALES,
      details: { merchantId, branches: result.performanceSummary.length },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.performance_monitored'),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  approveMerchantOnboarding,
  manageMenus,
  configureReservationPolicies,
  monitorBranchPerformance,
};