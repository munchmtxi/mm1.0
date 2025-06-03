'use strict';

/**
 * schedulingService.js
 * Manages staff scheduling, time tracking, and shift notifications for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const staffConstants = require('@constants/staff/staffSystemConstants');
const { Staff, Merchant, User, Shift, TimeTracking, Notification, AuditLog } = require('@models');

/**
 * Creates a staff schedule.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {Object} schedule - Schedule details { staffId, startTime, endTime, shiftType }.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Shift details.
 */
async function createSchedule(restaurantId, schedule, io) {
  try {
    const { staffId, startTime, endTime, shiftType } = schedule;
    if (!restaurantId || !staffId || !startTime || !endTime || !shiftType) {
      throw new Error('Missing required schedule details');
    }

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }, { model: User, as: 'user' }] });
    if (!staff || staff.branch_id !== restaurantId) throw new Error('Staff or branch not found');

    if (!Object.values(staffConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES).includes(shiftType)) {
      throw new Error('Invalid shift type');
    }

    const shift = await Shift.create({
      staff_id: staffId,
      branch_id: restaurantId,
      start_time: new Date(startTime),
      end_time: new Date(endTime),
      shift_type: shiftType,
      status: 'scheduled',
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, shiftId: shift.id, shiftType },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:scheduleCreated', { staffId, shiftId: shift.id, shiftType }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SHIFT_UPDATE,
      messageKey: 'staff.schedule_created',
      messageParams: { shiftType, date: new Date(startTime) },
      role: 'staff',
      module: 'scheduling',
      languageCode: staff.merchant?.preferred_language || 'en',
    });

    return shift;
  } catch (error) {
    logger.error('Error creating schedule', { error: error.message });
    throw error;
  }
}

/**
 * Records clock-in/out times.
 * @param {number} staffId - Staff ID.
 * @param {Object} timeData - Time details { clockIn, clockOut, shiftId }.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Time tracking record.
 */
async function trackTime(staffId, timeData, io) {
  try {
    const { clockIn, clockOut, shiftId } = timeData;
    if (!staffId || (!clockIn && !clockOut)) throw new Error('Staff ID and time required');

    const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
    if (!staff) throw new Error('Staff not found');

    let record;
    if (clockIn) {
      record = await TimeTracking.create({
        staff_id: staffId,
        shift_id: shiftId,
        clock_in: new Date(clockIn),
      });
      await Staff.update({ availability_status: 'busy' }, { where: { id: staffId } });
    } else {
      record = await TimeTracking.findOne({
        where: { staff_id: staffId, clock_out: null, shift_id: shiftId },
        order: [['created_at', 'DESC']],
      });
      if (!record) throw new Error('No active clock-in found');
      await record.update({ clock_out: new Date(clockOut) });
      await Staff.update({ availability_status: 'available' }, { where: { id: staffId } });
    }

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, clockIn, clockOut, shiftId },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:timeTracked', { staffId, clockIn, clockOut, shiftId }, `staff:${staffId}`);

    return record;
  } catch (error) {
    logger.error('Error tracking time', { error: error.message });
    throw error;
  }
}

/**
 * Sends shift reminders.
 * @param {number} staffId - Staff ID.
 * @param {number} shiftId - Shift ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Notification result.
 */
async function notifySchedule(staffId, shiftId, io) {
  try {
    if (!staffId || !shiftId) throw new Error('Staff ID and shift ID required');

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }, { model: User, as: 'user' }] });
    if (!staff) throw new Error('Staff not found');

    const shift = await Shift.findByPk(shiftId);
    if (!shift || shift.staff_id !== staffId) throw new Error('Shift not found');

    const result = await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SHIFT_UPDATE,
      messageKey: 'staff.shift_reminder',
      messageParams: { shiftType: shift.shift_type, date: shift.start_time },
      role: 'staff',
      module: 'scheduling',
      languageCode: staff.merchant?.preferred_language || 'en',
    });

    socketService.emit(io, 'staff:scheduleNotified', { staffId, shiftId }, `staff:${staffId}`);

    return result;
  } catch (error) {
    logger.error('Error notifying schedule', { error: error.message });
    throw error;
  }
}

/**
 * Modifies an existing schedule.
 * @param {number} scheduleId - Shift ID.
 * @param {Object} updates - Schedule updates { startTime, endTime, shiftType, status }.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated shift details.
 */
async function adjustSchedule(scheduleId, updates, io) {
  try {
    if (!scheduleId || !updates) throw new Error('Shift ID and updates required');

    const shift = await Shift.findByPk(scheduleId, { include: [{ model: Staff, as: 'staff', include: [{ model: Merchant, as: 'merchant' }, { model: User, as: 'user' }] }] });
    if (!shift) throw new Error('Shift not found');

    const allowedUpdates = ['start_time', 'end_time', 'shift_type', 'status'];
    const updateData = Object.keys(updates).reduce((acc, key) => {
      if (allowedUpdates.includes(key)) {
        acc[key] = key.includes('time') ? new Date(updates[key]) : updates[key];
      }
      return acc;
    }, {});

    if (updateData.shift_type && !Object.values(staffConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES).includes(updateData.shift_type)) {
      throw new Error('Invalid shift type');
    }

    if (updateData.status && !['scheduled', 'active', 'completed', 'cancelled'].includes(updateData.status)) {
      throw new Error('Invalid shift status');
    }

    await shift.update(updateData);

    await auditService.logAction({
      userId: shift.staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId: shift.staff_id, shiftId: scheduleId, updates },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:scheduleAdjusted', { staffId: shift.staff_id, shiftId: scheduleId, updates }, `staff:${shift.staff_id}`);

    await notificationService.sendNotification({
      userId: shift.staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SHIFT_UPDATE,
      messageKey: 'staff.schedule_updated',
      messageParams: { shiftType: shift.shift_type, date: shift.start_time },
      role: 'staff',
      module: 'scheduling',
      languageCode: shift.staff.merchant?.preferred_language || 'en',
    });

    return shift;
  } catch (error) {
    logger.error('Error adjusting schedule', { error: error.message });
    throw error;
  }
}

module.exports = {
  createSchedule,
  trackTime,
  notifySchedule,
  adjustSchedule,
};