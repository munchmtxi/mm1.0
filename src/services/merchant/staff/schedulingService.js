// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\services\merchant\staff\schedulingService.js
'use strict';

const logger = require('@utils/logger');
const staffConstants = require('@constants/staff/staffConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { Staff, Merchant, User, Shift, TimeTracking, MerchantBranch } = require('@models');
const { Op } = require('sequelize');

async function createSchedule(restaurantId, schedule, io, auditService, socketService, notificationService, pointService) {
  try {
    const { staffId, startTime, endTime, shiftType } = schedule;
    if (!restaurantId || !staffId || !startTime || !endTime || !shiftType) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Missing required schedule details');
    }

    const staff = await Staff.findByPk(staffId, { 
      include: [
        { model: Merchant, as: 'merchant' }, 
        { model: User, as: 'user' },
        { model: MerchantBranch, as: 'branch' }
      ]
    });
    if (!staff || staff.branch_id !== restaurantId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Staff or branch not found');
    }

    if (!staffConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES.includes(shiftType)) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid shift type');
    }

    const merchant = await Merchant.findByPk(staff.merchant_id);
    if (!merchantConstants.MERCHANT_TYPES.includes(merchant.business_type)) {
      throw new Error(merchantConstants.ERROR_CODES.includes('INVALID_MERCHANT_TYPE') ? 'INVALID_MERCHANT_TYPE' : 'Invalid merchant type');
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
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_profile_update') ? 'staff_profile_update' : 'profile_update',
      details: { staffId, shiftId: shift.id, shiftType, staffTypes: staff.staff_types },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:scheduleCreated', { staffId, shiftId: shift.id, shiftType }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.TYPES.includes('shift_update') ? 'shift_update' : 'general',
      messageKey: 'staff.schedule_created',
      messageParams: { shiftType, date: new Date(startTime) },
      role: 'staff',
      module: 'scheduling',
      languageCode: staff.user?.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    const points = staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS.find(a => a.action === 'task_completion')?.points || 10;
    await pointService.awardPoints(staff.user_id, 'task_completion', points);

    return shift;
  } catch (error) {
    logger.error('Error creating schedule', { error: error.message });
    throw error;
  }
}

async function trackTime(staffId, timeData, io, auditService, socketService, pointService) {
  try {
    const { clockIn, clockOut, shiftId } = timeData;
    if (!staffId || (!clockIn && !clockOut)) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Staff ID and time required');
    }

    const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Staff not found');

    let record;
    if (clockIn) {
      const shift = await Shift.findByPk(shiftId);
      if (!shift || shift.staff_id !== staffId) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid shift');
      }
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
      if (!record) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'No active clock-in found');
      await record.update({ clock_out: new Date(clockOut) });
      await Staff.update({ availability_status: 'available' }, { where: { id: staffId } });
    }

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_profile_update') ? 'staff_profile_update' : 'profile_update',
      details: { staffId, clockIn, clockOut, shiftId, staffTypes: staff.staff_types },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:timeTracked', { staffId, clockIn, clockOut, shiftId }, `staff:${staffId}`);

    const points = staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS.find(a => a.action === 'task_completion')?.points || 10;
    await pointService.awardPoints(staff.user_id, 'task_completion', points);

    return record;
  } catch (error) {
    logger.error('Error tracking time', { error: error.message });
    throw error;
  }
}

async function notifySchedule(staffId, shiftId, io, auditService, socketService, notificationService, pointService) {
  try {
    if (!staffId || !shiftId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Staff ID and shift ID required');
    }

    const staff = await Staff.findByPk(staffId, { 
      include: [
        { model: Merchant, as: 'merchant' }, 
        { model: User, as: 'user' },
        { model: MerchantBranch, as: 'branch' }
      ]
    });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Staff not found');

    const shift = await Shift.findByPk(shiftId);
    if (!shift || shift.staff_id !== staffId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Shift not found');
    }

    const result = await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.TYPES.includes('shift_update') ? 'shift_update' : 'general',
      messageKey: 'staff.shift_reminder',
      messageParams: { shiftType: shift.shift_type, date: shift.start_time },
      role: 'staff',
      module: 'scheduling',
      languageCode: staff.user?.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_profile_update') ? 'staff_profile_update' : 'profile_update',
      details: { staffId, shiftId, staffTypes: staff.staff_types },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:scheduleNotified', { staffId, shiftId }, `staff:${staffId}`);

    const points = staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS.find(a => a.action === 'task_completion')?.points || 10;
    await pointService.awardPoints(staff.user_id, 'task_completion', points);

    return result;
  } catch (error) {
    logger.error('Error notifying schedule', { error: error.message });
    throw error;
  }
}

async function adjustSchedule(scheduleId, updates, io, auditService, socketService, notificationService, pointService) {
  try {
    if (!scheduleId || !updates) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Shift ID and updates required');
    }

    const shift = await Shift.findByPk(scheduleId, {
      include: [{ 
        model: Staff, 
        as: 'staff', 
        include: [
          { model: Merchant, as: 'merchant' }, 
          { model: User, as: 'user' },
          { model: MerchantBranch, as: 'branch' }
        ]
      }],
    });
    if (!shift) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Shift not found');

    const allowedUpdates = ['start_time', 'end_time', 'shift_type', 'status'];
    const updateData = Object.keys(updates).reduce((acc, key) => {
      if (allowedUpdates.includes(key)) {
        acc[key] = key.includes('time') ? new Date(updates[key]) : updates[key];
      }
      return acc;
    }, {});

    if (updateData.shift_type && !staffConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES.includes(updateData.shift_type)) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid shift type');
    }

    if (updateData.status && !['scheduled', 'active', 'completed', 'cancelled'].includes(updateData.status)) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes TinvaliD_SHIFT') ? 'INVALID_SHIFT' : 'Invalid shift status');
    }

    await shift.update(updateData);

    await auditService.logAction({
      userId: shift.staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_profile_update') ? 'staff_profile_update' : 'profile_update',
      details: { staffId: shift.staff_id, shiftId: scheduleId, updates, staffTypes: shift.staff.staff_types },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:scheduleAdjusted', { staffId: shift.staff_id, shiftId: scheduleId, updates }, `staff:${shift.staff_id}`);

    await notificationService.sendNotification({
      userId: shift.staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.TYPES.includes('shift_update') ? 'shift_update' : 'general',
      messageKey: 'staff.schedule_updated',
      messageParams: { shiftType: shift.shift_type, date: shift.start_time },
      role: 'staff',
      module: 'scheduling',
      languageCode: shift.staff.user?.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    const points = staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS.find(a => a.action === 'task_completion')?.points || 10;
    await pointService.awardPoints(shift.staff.user_id, 'task_completion', points);

 Kinreturn shift;
  } catch (error) {
    logger.error('Error adjusting schedule', { error: error.message });
    throw error;
  }
}

module.exports = {
  createSchedule,
  trackTime,
  notifySchedule,
  adjustSchedule
};