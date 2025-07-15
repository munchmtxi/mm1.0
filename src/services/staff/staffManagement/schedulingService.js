'use strict';

const { Shift, Staff, TimeWindow } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const { formatMessage } = require('@utils/localization');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function createShiftSchedule(restaurantId, schedule, ipAddress, notificationService, socketService, auditService, pointService) {
  try {
    const { staffId, startTime, endTime, shiftType } = schedule;
    const staff = await Staff.findByPk(staffId);
    if (!staff || staff.branch_id !== restaurantId) {
      throw new AppError('Invalid staff or branch', 404, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
    }

    if (!staffConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES.includes(shiftType)) {
      throw new AppError('Invalid shift type', 400, staffConstants.STAFF_ERROR_CODES.ERROR);
    }

    const timeWindow = await TimeWindow.findOne({ where: { interval: shiftType } });
    if (!timeWindow) {
      throw new AppError('Invalid time window', 400, staffConstants.STAFF_ERROR_CODES.ERROR);
    }

    const shift = await Shift.create({
      staff_id: staffId,
      branch_id: restaurantId,
      start_time: startTime,
      end_time: endTime,
      shift_type: shiftType,
      status: 'scheduled',
    });

    await auditService.logAction({
      userId: staffId,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, shiftId: shift.id, action: 'create_shift' },
      ipAddress,
    });

    const message = formatMessage('scheduling.shift_created', { shiftId: shift.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SHIFT_UPDATE,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:scheduling:${staffId}`, 'scheduling:shift_created', { staffId, shiftId: shift.id });

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

    return shift;
  } catch (error) {
    logger.error('Shift schedule creation failed', { error: error.message, restaurantId });
    throw new AppError(`Shift creation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

async function updateShift(scheduleId, updates, ipAddress, notificationService, socketService, auditService, pointService) {
  try {
    const shift = await Shift.findByPk(scheduleId);
    if (!shift) {
      throw new AppError('Shift not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await shift.update(updates);

    await auditService.logAction({
      userId: shift.staff_id,
      role: staffConstants.STAFF_TYPES.includes(shift.position) ? shift.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { shiftId: scheduleId, updates, action: 'update_shift' },
      ipAddress,
    });

    const message = formatMessage('scheduling.shift_updated', { staffId: shift.staff_id });
    await notificationService.sendNotification({
      userId: shift.staff_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SHIFT_UPDATE,
      message,
      role: staffConstants.STAFF_TYPES.includes(shift.position) ? shift.position : 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:scheduling:${shift.staff_id}`, 'scheduling:shift_updated', { shiftId: scheduleId, updates });

    const action = staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.find(a => a.action === 'task_completion');
    if (action) {
      await pointService.awardPoints({
        userId: shift.staff_id,
        role: shift.position,
        subRole: shift.position,
        action: action.action,
        languageCode: staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
      });
      socketService.emit(`munch:staff:${shift.staff_id}`, 'points:awarded', {
        action: action.action,
        points: action.points,
      });
    }

    return shift;
  } catch (error) {
    logger.error('Shift update failed', { error: error.message, scheduleId });
    throw new AppError(`Shift update failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

async function notifyShiftChange(staffId, ipAddress, notificationService, socketService, auditService) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const message = formatMessage('scheduling.shift_updated', { staffId });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SHIFT_UPDATE,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
    });

    await auditService.logAction({
      userId: staffId,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, action: 'notify_shift_change' },
      ipAddress,
    });

    socketService.emit(`munch:scheduling:${staffId}`, 'scheduling:shift_notified', { staffId });
  } catch (error) {
    logger.error('Shift change notification failed', { error: error.message, staffId });
    throw new AppError(`Notification failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  createShiftSchedule,
  updateShift,
  notifyShiftChange
};