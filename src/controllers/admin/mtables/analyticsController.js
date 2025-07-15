'use strict';

const analyticsService = require('@services/admin/mtables/analyticsService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');

async function getBookingAnalytics(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const analytics = await analyticsService.getBookingAnalytics(restaurantId, { pointService });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, analyticsType: 'booking_completion' },
      ipAddress: req.ip,
    });

    await notificationService.sendNotification({
      userId: req.user.id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.ANALYTICS_REPORT,
      messageKey: 'analytics.booking_analytics',
      messageParams: { restaurantId, totalBookings: analytics.totalBookings },
      role: 'merchant',
      module: 'mtables',
    });

    await socketService.emit(null, 'analytics:booking_analytics', {
      userId: req.user.id,
      role: 'merchant',
      restaurantId,
      analytics,
    });

    res.status(200).json({
      status: 'success',
      data: analytics,
      message: formatMessage('success.analytics_retrieved'),
    });
  } catch (error) {
    next(error);
  }
}

async function exportBookingReports(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const report = await analyticsService.exportBookingReports(restaurantId, { pointService });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, reportCount: report.length },
      ipAddress: req.ip,
    });

    await notificationService.sendNotification({
      userId: req.user.id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.ANALYTICS_REPORT,
      messageKey: 'analytics.report_generated',
      messageParams: { restaurantId, reportCount: report.length },
      role: 'merchant',
      module: 'mtables',
    });

    await socketService.emit(null, 'analytics:report_generated', {
      userId: req.user.id,
      role: 'merchant',
      restaurantId,
      reportCount: report.length,
    });

    res.status(200).json({
      status: 'success',
      data: report,
      message: formatMessage('success.report_generated'),
    });
  } catch (error) {
    next(error);
  }
}

async function analyzeCustomerEngagement(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const engagement = await analyticsService.analyzeCustomerEngagement(restaurantId, { pointService });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, engagementMetrics: engagement },
      ipAddress: req.ip,
    });

    await notificationService.sendNotification({
      userId: req.user.id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.ANALYTICS_REPORT,
      messageKey: 'analytics.engagement',
      messageParams: { restaurantId, feedbackRate: engagement.feedbackRate },
      role: 'merchant',
      module: 'mtables',
    });

    await socketService.emit(null, 'analytics:engagement_completed', {
      userId: req.user.id,
      role: 'merchant',
      restaurantId,
      engagementMetrics: engagement,
    });

    res.status(200).json({
      status: 'success',
      data: engagement,
      message: formatMessage('success.engagement_analyzed'),
    });
  } catch (error) {
    next(error);
  }
}

async function trackGamificationMetrics(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const metrics = await analyticsService.trackGamificationMetrics(restaurantId, { pointService });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, gamificationMetrics: metrics },
      ipAddress: req.ip,
    });

    await notificationService.sendNotification({
      userId: req.user.id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.ANALYTICS_REPORT,
      messageKey: 'analytics.gamification_tracked',
      messageParams: { restaurantId, totalPoints: metrics.totalPoints },
      role: 'merchant',
      module: 'mtables',
    });

    await socketService.emit(null, 'analytics:gamification_tracked', {
      userId: req.user.id,
      role: 'merchant',
      restaurantId,
      gamificationMetrics: metrics,
    });

    res.status(200).json({
      status: 'success',
      data: metrics,
      message: formatMessage('success.gamification_tracked'),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBookingAnalytics,
  exportBookingReports,
  analyzeCustomerEngagement,
  trackGamificationMetrics,
};