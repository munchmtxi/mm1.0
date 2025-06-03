'use strict';

/**
 * timeTrackingService.js
 * Manages time tracking for munch (staff role). Logs clock-in/out, computes shift hours,
 * generates reports, and awards points.
 * Last Updated: May 26, 2025
 */

const { TimeTracking, Staff, Report, GamificationPoints } = require('@models');
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
 * Logs clock-in/out times for staff.
 * @param {number} staffId - Staff ID.
 * @param {string} action - 'clock_in' or 'clock_out'.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Time tracking record.
 */
async function recordClockInOut(staffId, action, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const latestRecord = await TimeTracking.findOne({
      where: { staff_id: staffId },
      order: [['timestamp', 'DESC']],
    });

    if (action === 'clock_in' && latestRecord?.action === 'clock_in' && !latestRecord.clock_out_time) {
      throw new AppError('Already clocked in', 400, staffConstants.STAFF_ERROR_CODES.ERROR);
    }
    if (action === 'clock_out' && (!latestRecord || latestRecord.clock_out_time)) {
      throw new AppError('Not clocked in', 400, staffConstants.STAFF_ERROR_CODES.ERROR);
    }

    let record;
    if (action === 'clock_in') {
      record = await TimeTracking.create({
        staff_id: staffId,
        action,
        timestamp: new Date(),
      });
    } else {
      record = await latestRecord.update({
        clock_out_time: new Date(),
        action,
      });
    }

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, action, recordId: record.id },
      ipAddress,
    });

    const message = localization.formatMessage(`timetracking.${action}`, { staffId });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:timetracking:${staffId}`, `timetracking:${action}`, { staffId, timestamp: record.timestamp });

    return record;
  } catch (error) {
    logger.error('Clock-in/out failed', { error: error.message, staffId, action });
    throw new AppError(`Clock-in/out failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Computes shift hours for staff.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<number>} Total shift hours.
 */
async function calculateShiftDuration(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const records = await TimeTracking.findAll({
      where: { staff_id: staffId, clock_out_time: { [Op.ne]: null } },
      order: [['timestamp', 'DESC']],
      limit: 100,
    });

    const totalHours = records.reduce((sum, record) => {
      const durationMs = new Date(record.clock_out_time) - new Date(record.timestamp);
      return sum + durationMs / (1000 * 60 * 60);
    }, 0);

    socketService.emit(`munch:timetracking:${staffId}`, 'timetracking:duration_calculated', { staffId, totalHours });

    return totalHours;
  } catch (error) {
    logger.error('Shift duration calculation failed', { error: error.message, staffId });
    throw new AppError(`Duration calculation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Creates time tracking reports.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Generated report.
 */
async function generateTimeReport(staffId, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const records = await TimeTracking.findAll({
      where: { staff_id: staffId },
      order: [['timestamp', 'DESC']],
      limit: 100,
    });

    const reportData = {
      staffId,
      records: records.map(r => ({
        action: r.action,
        clockIn: r.timestamp,
        clockOut: r.clock_out_time,
        duration: r.clock_out_time ? (new Date(r.clock_out_time) - new Date(r.timestamp)) / (1000 * 60 * 60) : null,
      })),
    };

    const encryptedData = await securityService.encryptData(reportData);
    const report = await Report.create({
      report_type: 'time_tracking',
      data: encryptedData,
      generated_by: staffId,
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
      details: { staffId, reportId: report.id, action: 'generate_time_report' },
      ipAddress,
    });

    const message = localization.formatMessage('timetracking.report_generated', { reportId: report.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
      message,
      role: 'staff',
      module: 'munch',
      reportId: report.id,
    });

    socketService.emit(`munch:timetracking:${staffId}`, 'timetracking:report_generated', { staffId, reportId: report.id });

    return report;
  } catch (error) {
    logger.error('Time report generation failed', { error: error.message, staffId });
    throw new AppError(`Report generation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Awards time tracking points.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardTimeTrackingPoints(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const action = staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.action;
    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action,
      languageCode: 'en',
    });

    socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
      action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.points,
    });
  } catch (error) {
    logger.error('Time tracking points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  recordClockInOut,
  calculateShiftDuration,
  generateTimeReport,
  awardTimeTrackingPoints,
};