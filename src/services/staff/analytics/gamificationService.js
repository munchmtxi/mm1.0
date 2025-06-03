'use strict';

/**
 * gamificationService.js
 * Manages gamification for munch (staff role). Tracks staff/customer points,
 * generates reports, and awards task-specific points.
 * Last Updated: May 25, 2025
 */

const { GamificationPoints, Staff, Customer, Report, Badge, UserBadge, Reward } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Tracks points for staff actions.
 * @param {number} staffId - Staff ID.
 * @param {string} action - Gamification action.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Recorded points.
 */
async function logStaffPoints(staffId, action, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const points = await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action,
      languageCode: 'en',
    });

    const gamificationRecord = await GamificationPoints.create({
      user_id: staffId,
      points: points.pointsAwarded,
      action,
      source_type: 'staff_task',
      created_at: new Date(),
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, action: 'log_points', points: points.pointsAwarded },
      ipAddress,
    });

    const message = localization.formatMessage('gamification.points_logged', {
      points: points.pointsAwarded,
      action,
    });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.GAMIFICATION_UPDATE,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:gamification:${staffId}`, 'gamification:points_logged', {
      staffId,
      action,
      points: points.pointsAwarded,
    });

    return gamificationRecord;
  } catch (error) {
    logger.error('Staff points logging failed', { error: error.message, staffId, action });
    throw new AppError(`Points logging failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Logs customer points for staff-related tasks.
 * @param {number} customerId - Customer ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Recorded points.
 */
async function syncCustomerPoints(customerId, ipAddress) {
  try {
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const points = await pointService.awardPoints({
      userId: customerId,
      role: 'customer',
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.CUSTOMER_ENGAGEMENT.action,
      languageCode: 'en',
    });

    const gamificationRecord = await GamificationPoints.create({
      user_id: customerId,
      points: points.pointsAwarded,
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.CUSTOMER_ENGAGEMENT.action,
      source_type: 'customer_task',
      created_at: new Date(),
    });

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { customerId, action: 'sync_points', points: points.pointsAwarded },
      ipAddress,
    });

    const message = localization.formatMessage('gamification.customer_points_synced', {
      points: points.pointsAwarded,
    });
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.GAMIFICATION_UPDATE,
      message,
      role: 'customer',
      module: 'munch',
    });

    socketService.emit(`munch:gamification:${customerId}`, 'gamification:customer_points_synced', {
      customerId,
      points: points.pointsAwarded,
    });

    return gamificationRecord;
  } catch (error) {
    logger.error('Customer points syncing failed', { error: error.message, customerId });
    throw new AppError(`Points syncing failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Summarizes gamification data for staff.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Generated report.
 */
async function generateGamificationReport(staffId, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const points = await GamificationPoints.findAll({
      where: { user_id: staffId },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    const badges = await UserBadge.findAll({
      where: { user_id: staffId },
      include: [{ model: Badge, as: 'badge' }],
    });

    const reportData = {
      staffId,
      totalPoints: points.reduce((sum, p) => sum + p.points, 0),
      actions: points.map(p => ({ action: p.action, points: p.points, date: p.created_at })),
      badges: badges.map(b => ({ name: b.badge.name, awarded_at: b.awarded_at })),
    };

    const encryptedData = await securityService.encryptData(reportData);
    const report = await Report.create({
      report_type: 'gamification',
      data: encryptedData,
      generated_by: staffId,
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
      details: { staffId, reportId: report.id, action: 'generate_gamification_report' },
      ipAddress,
    });

    const message = localization.formatMessage('gamification.report_generated', { reportId: report.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.GAMIFICATION_UPDATE,
      message,
      role: 'staff',
      module: 'munch',
      reportId: report.id,
    });

    socketService.emit(`munch:gamification:${staffId}`, 'gamification:report_generated', {
      staffId,
      reportId: report.id,
    });

    return report;
  } catch (error) {
    logger.error('Gamification report generation failed', { error: error.message, staffId });
    throw new AppError(`Report generation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Awards points for task-specific actions.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardGamificationPoints(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.action,
      languageCode: 'en',
    });

    socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.points,
    });
  } catch (error) {
    logger.error('Gamification points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  logStaffPoints,
  syncCustomerPoints,
  generateGamificationReport,
  awardGamificationPoints,
};