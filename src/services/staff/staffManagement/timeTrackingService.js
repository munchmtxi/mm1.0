'use strict';

const { TimeTracking, Staff, Report } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const { formatMessage } = require('@utils/localization');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function recordClockInOut(staffId, action, ipAddress, notificationService, socketService, auditService, pointService) {
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

      const actionPoints = staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.find(a => a.action === 'task_completion');
      if (actionPoints) {
        await pointService.awardPoints({
          userId: staffId,
          role: staff.position,
          subRole: staff.position,
          action: actionPoints.action,
          languageCode: staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
        });
        socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
          action: actionPoints.action,
          points: actionPoints.points,
        });
      }
    } else {
      record = await latestRecord.update({
        clock_out_time: new Date(),
        action,
      });
    }

    await auditService.logAction({
      userId: staffId,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, action, recordId: record.id },
      ipAddress,
    });

    const message = formatMessage(`timeTracking.${action}`, { staffId });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:timetracking:${staffId}`, `timetracking:${action}`, { staffId, timestamp: record.timestamp });

    return record;
  } catch (error) {
    logger.error('Clock-in/out failed', { error: error.message, staffId, action });
    throw new AppError(`Clock-in/out failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

async function calculateShiftDuration(staffId, socketService) {
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

async function generateTimeReport(staffId, ipAddress, notificationService, socketService, auditService, securityService, pointService) {
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
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
      details: { staffId, reportId: report.id, action: 'generate_time_report' },
      ipAddress,
    });

    const message = formatMessage('timeTracking.report_generated', { reportId: report.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
      reportId: report.id,
    });

    socketService.emit(`munch:timetracking:${staffId}`, 'timetracking:report_generated', { staffId, reportId: report.id });

    const action = staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.find(a => a.action === 'task_completion');
    if (action) {
      await pointService.awardPoints({
        userId: staffId,
        role: staff.position,
        subRole: staff.position,
        action: action.action,
        languageCode: staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
      });
      socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
        action: action.action,
        points: action.points,
      });
    }

    return report;
  } catch (error) {
    logger.error('Time report generation failed', { error: error.message, staffId });
    throw new AppError(`Report generation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  recordClockInOut,
  calculateShiftDuration,
  generateTimeReport
};