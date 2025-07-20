'use strict';

const { TimeTracking, Staff, Report, Shift, Merchant } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');
const { getTimeDifference, formatDuration } = require('@utils/dateTimeUtils');

async function calculateShiftDuration(staffId) {
  try {
    const staff = await Staff.findByPk(staffId, {
      include: [{ model: Merchant, as: 'merchant' }],
    });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    if (!merchantConstants.MERCHANT_TYPES.includes(staff.merchant.business_type)) {
      throw new AppError('Invalid merchant type', 400, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    const records = await TimeTracking.findAll({
      where: {
        staff_id: staffId,
        clock_out: { [Op.ne]: null },
      },
      include: [{ model: Shift, as: 'shift' }],
      order: [['clock_in', 'DESC']],
      limit: 100,
    });

    const totalSeconds = records.reduce((sum, record) => {
      if (record.shift && !staffConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES.includes(record.shift.shift_type)) {
        throw new AppError('Invalid shift type', 400, staffConstants.STAFF_ERROR_CODES.INVALID_SHIFT_TYPE);
      }
      return sum + getTimeDifference(record.clock_in, record.clock_out);
    }, 0);

    return formatDuration(totalSeconds);
  } catch (error) {
    logger.error('Shift duration calculation failed', { error: error.message, staffId });
    throw new AppError(`Duration calculation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

async function generateTimeReport(staffId, securityService) {
  try {
    const staff = await Staff.findByPk(staffId, {
      include: [{ model: Merchant, as: 'merchant' }],
    });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    if (!merchantConstants.MERCHANT_TYPES.includes(staff.merchant.business_type)) {
      throw new AppError('Invalid merchant type', 400, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    if (!staff.staff_types.every(type => staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(type))) {
      throw new AppError('Invalid staff type', 400, staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    const records = await TimeTracking.findAll({
      where: { staff_id: staffId },
      include: [{ model: Shift, as: 'shift' }],
      order: [['clock_in', 'DESC']],
      limit: 100,
    });

    const reportData = {
      staffId,
      merchantId: staff.merchant_id,
      records: records.map(r => ({
        action: r.action,
        clockIn: r.clock_in,
        clockOut: r.clock_out,
        duration: r.clock_out ? formatDuration(getTimeDifference(r.clock_in, r.clock_out)) : null,
        shiftType: r.shift ? r.shift.shift_type : null,
      })),
    };

    const encryptedData = await securityService.encryptData(reportData);
    const report = await Report.create({
      report_type: 'time_tracking',
      data: encryptedData,
      generated_by: staffId,
    });

    return report;
  } catch (error) {
    logger.error('Time report generation failed', { error: error.message, staffId });
    throw new AppError(`Report generation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  calculateShiftDuration,
  generateTimeReport,
};