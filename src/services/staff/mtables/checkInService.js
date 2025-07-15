// checkInService.js
// Manages check-in operations for mtables staff. Handles check-ins, time logging, and table status updates.
// Last Updated: May 25, 2025

'use strict';

const { Op } = require('sequelize');
const { Booking, Verification, TimeTracking, Table, Staff, TableLayoutSection } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

async function processCheckIn(bookingId, staffId) {
  try {
    const booking = await Booking.findByPk(bookingId, { include: [{ model: Table, as: 'table' }] });
    if (!booking) throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const verification = await Verification.findOne({
      where: { user_id: booking.customer_id, status: 'verified' },
    });
    if (!verification) throw new Error(mtablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID);

    if (!booking.table_id) {
      const availableTable = await Table.findOne({
        where: {
          branch_id: booking.branch_id,
          status: mtablesConstants.TABLE_STATUSES[0], // 'available'
          capacity: { [Op.gte]: booking.guest_count },
          is_active: true,
        },
        include: [{ model: TableLayoutSection, as: 'section', where: { is_active: true } }],
      });
      if (!availableTable) throw new Error(mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE);

      await availableTable.update({ status: 'occupied', assigned_staff_id: staffId });
      await booking.update({ table_id: availableTable.id });
    }

    await booking.update({
      status: mtablesConstants.BOOKING_STATUSES.CHECKED_IN,
      arrived_at: new Date(),
      seated_at: new Date(),
    });

    return booking;
  } catch (error) {
    logger.error('Error processing check-in', { error: error.message, bookingId });
    throw error;
  }
}

async function logCheckInTime(bookingId, staffId) {
  try {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

    await TimeTracking.create({
      staff_id: staffId,
      clock_in: new Date(),
      task_type: 'check_in',
    });
  } catch (error) {
    logger.error('Error logging check-in time', { error: error.message, bookingId, staffId });
    throw error;
  }
}

async function updateTableStatus(tableId, status) {
  try {
    const table = await Table.findByPk(tableId);
    if (!table) throw new Error(mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE);

    await table.update({ status });
  } catch (error) {
    logger.error('Error updating table status', { error: error.message, tableId, status });
    throw error;
  }
}

module.exports = {
  processCheckIn,
  logCheckInTime,
  updateTableStatus,
};