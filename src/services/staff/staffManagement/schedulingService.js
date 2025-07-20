'use strict';

const { Shift, Staff, TimeWindow, Merchant, TimeTracking } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const staffConstants = require('@constants/staff/staffConstants');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function createSchedule(merchantId, scheduleData) {
  const { staffId, startTime, endTime, shiftType, branchId } = scheduleData;
  const merchant = await Merchant.findByPk(merchantId);
  if (!merchant) {
    throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES[0]);
  }

  const staff = await Staff.findByPk(staffId);
  if (!staff || staff.merchant_id !== merchantId || (branchId && staff.branch_id !== branchId)) {
    throw new AppError('Invalid staff or branch', 404, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }

  if (!merchantConstants.STAFF_CONSTANTS.SHIFT_SETTINGS.SHIFT_TYPES.includes(shiftType)) {
    throw new AppError('Invalid shift type', 400, staffConstants.STAFF_ERROR_CODES[0]);
  }

  const timeWindow = await TimeWindow.findOne({ where: { interval: shiftType } });
  if (!timeWindow) {
    throw new AppError('Invalid time window', 400, staffConstants.STAFF_ERROR_CODES[0]);
  }

  const shift = await Shift.create({
    staff_id: staffId,
    branch_id: branchId,
    start_time: startTime,
    end_time: endTime,
    shift_type: shiftType,
    status: 'scheduled',
  });

  return shift;
}

async function trackTime(shiftId, merchantId) {
  const shift = await Shift.findByPk(shiftId);
  if (!shift) {
    throw new AppError('Shift not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
  }

  const staff = await Staff.findByPk(shift.staff_id);
  if (!staff || staff.merchant_id !== merchantId) {
    throw new AppError('Invalid staff or merchant', 404, merchantConstants.ERROR_CODES[0]);
  }

  const duration = (new Date(shift.end_time) - new Date(shift.start_time)) / (1000 * 60 * 60);

  return { shiftId, duration };
}

async function adjustSchedule(shiftId, updates, merchantId) {
  const shift = await Shift.findByPk(shiftId);
  if (!shift) {
    throw new AppError('Shift not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
  }

  const staff = await Staff.findByPk(shift.staff_id);
  if (!staff || staff.merchant_id !== merchantId) {
    throw new AppError('Invalid staff or merchant', 404, merchantConstants.ERROR_CODES[0]);
  }

  await shift.update(updates);

  return shift;
}

async function clockIn(staffId, shiftId, merchantId) {
  const staff = await Staff.findByPk(staffId);
  if (!staff || staff.merchant_id !== merchantId) {
    throw new AppError('Invalid staff or merchant', 404, merchantConstants.ERROR_CODES[0]);
  }

  const shift = await Shift.findByPk(shiftId);
  if (!shift || shift.staff_id !== staffId) {
    throw new AppError('Invalid shift or staff', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
  }

  const timeTracking = await TimeTracking.create({
    staff_id: staffId,
    shift_id: shiftId,
    clock_in: new Date(),
  });

  return timeTracking;
}

async function clockOut(staffId, shiftId, merchantId) {
  const staff = await Staff.findByPk(staffId);
  if (!staff || staff.merchant_id !== merchantId) {
    throw new AppError('Invalid staff or merchant', 404, merchantConstants.ERROR_CODES[0]);
  }

  const shift = await Shift.findByPk(shiftId);
  if (!shift || shift.staff_id !== staffId) {
    throw new AppError('Invalid shift or staff', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
  }

  const timeTracking = await TimeTracking.findOne({
    where: { staff_id: staffId, shift_id: shiftId, clock_out: null },
  });

  if (!timeTracking) {
    throw new AppError('No active clock-in found', 404, staffConstants.STAFF_ERROR_CODES[0]);
  }

  await timeTracking.update({ clock_out: new Date() });

  return timeTracking;
}

module.exports = {
  createSchedule,
  trackTime,
  adjustSchedule,
  clockIn,
  clockOut,
};