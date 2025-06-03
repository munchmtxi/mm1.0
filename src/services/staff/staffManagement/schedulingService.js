'use strict';

/**
 * schedulingService.js
 * Manages staff scheduling for munch (staff role). Plans shifts, updates assignments,
 * notifies changes, and awards scheduling points.
 * Last Updated: May 26, 2025
 */

const { Shift, Staff, Notification, TimeWindow } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Plans shift schedules for a restaurant.
 * @param {number} restaurantId - Branch ID.
 * @param {Object} schedule - Shift schedule details.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Created shift.
 */
async function createShiftSchedule(restaurantId, schedule, ipAddress) {
  try {
    const { staffId, startTime, endTime, shiftType } = schedule;
    const staff = await Staff.findByPk(staffId);
    if (!staff || staff.branch_id !== restaurantId) {
      throw new AppError('Invalid staff or branch', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    if (!staffRolesConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES[shiftType]) {
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
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, shiftId: shift.id, action: 'create_shift' },
      ipAddress,
    });

    const message = localization.formatMessage('scheduling.shift_created', { shiftId: shift.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SHIFT_UPDATE,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:scheduling:${staffId}`, 'scheduling:shift_created', { staffId, shiftId: shift.id });

    return shift;
  } catch (error) {
    logger.error('Shift schedule creation failed', { error: error.message, restaurantId });
    throw new AppError(`Shift creation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Adjusts shift assignments.
 * @param {number} scheduleId - Shift ID.
 * @param {Object} updates - Shift updates.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Updated shift.
 */
async function updateShift(scheduleId, updates, ipAddress) {
  try {
    const shift = await Shift.findByPk(scheduleId);
    if (!shift) {
      throw new AppError('Shift not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await shift.update(updates);

    await auditService.logAction({
      userId: shift.staff_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { shiftId: scheduleId, updates, action: 'update_shift' },
      ipAddress,
    });

    socketService.emit(`munch:scheduling:${shift.staff_id}`, 'scheduling:shift_updated', { shiftId: scheduleId, updates });

    return shift;
  } catch (error) {
    logger.error('Shift update failed', { error: error.message, scheduleId });
    throw new AppError(`Shift update failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Alerts staff of schedule updates.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<void>}
 */
async function notifyShiftChange(staffId, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const message = localization.formatMessage('scheduling.shift_updated', { staffId });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SHIFT_UPDATE,
      message,
      role: 'staff',
      module: 'munch',
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
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

/**
 * Awards scheduling points.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardSchedulingPoints(staffId) {
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
    logger.error('Scheduling points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  createShiftSchedule,
  updateShift,
  notifyShiftChange,
  awardSchedulingPoints,
};