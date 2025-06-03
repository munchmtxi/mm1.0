'use strict';

/**
 * checkInService.js
 * Manages check-in operations for mtables (staff role). Handles check-ins, time logging, table status updates,
 * and point awarding. Integrates with models and services.
 * Last Updated: May 25, 2025
 */

const { Booking, Verification, TimeTracking, Table, GamificationPoints, Staff, TableLayoutSection } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const locationService = require('@services/common/locationService');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Processes customer check-in via QR code.
 * @param {number} bookingId - Booking ID.
 * @param {string} qrCode - QR code for verification.
 * @param {number} staffId - Staff ID.
 * @param {Object} coordinates - Location coordinates.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Updated booking.
 */
async function processCheckIn(bookingId, qrCode, staffId, coordinates, ipAddress) {
  try {
    const booking = await Booking.findByPk(bookingId, { include: [{ model: Table, as: 'table' }] });
    if (!booking) {
      throw new AppError('Booking not found', 404, staffConstants.STAFF_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageCheckIns?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const isValidQR = await securityService.verifyQRCode({ qrCode, bookingId });
    if (!isValidQR) {
      throw new AppError('Invalid QR code', 400, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
    }

    await locationService.validateGeofence({ coordinates, branchId: booking.branch_id });

    const verification = await Verification.findOne({
      where: { user_id: booking.customer_id, status: 'verified' },
    });
    if (!verification) {
      throw new AppError('Customer verification pending', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    if (!booking.table_id) {
      const availableTable = await Table.findOne({
        where: {
          branch_id: booking.branch_id,
          status: 'available',
          capacity: { [Op.gte]: booking.guest_count },
          is_active: true,
        },
        include: [{ model: TableLayoutSection, as: 'section', where: { is_active: true } }],
      });
      if (!availableTable) {
        throw new AppError('No available tables', 400, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
      }

      await availableTable.update({ status: 'occupied', assigned_staff_id: staffId });
      await booking.update({ table_id: availableTable.id });
    }

    await booking.update({
      status: 'seated',
      arrived_at: new Date(),
      seated_at: new Date(),
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { bookingId, action: 'check_in', tableId: booking.table_id },
      ipAddress,
    });

    const message = localization.formatMessage('check_in.confirmed', {
      reference: booking.reference,
      tableNumber: booking.table.table_number,
    });
    await notificationService.sendNotification({
      userId: booking.customer_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message,
      role: 'customer',
      module: 'mtables',
      bookingId,
    });

    socketService.emit(`mtables:checkin:${booking.customer_id}`, 'checkin:confirmed', {
      bookingId,
      status: 'seated',
      tableNumber: booking.table.table_number,
    });

    return booking;
  } catch (error) {
    logger.error('Check-in failed', { error: error.message, bookingId });
    throw new AppError(`Check-in failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Logs check-in time for gamification.
 * @param {number} bookingId - Booking ID.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function logCheckInTime(bookingId, staffId) {
  try {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404, staffConstants.STAFF_NOT_FOUND);
    }

    await TimeTracking.create({
      staff_id: staffId,
      clock_in: new Date(),
      task_type: staffRolesConstants.STAFF_TASK_TYPES.CHECK_IN,
    });
  } catch (error) {
    logger.error('Check-in time logging failed', { error: error.message, bookingId, staffId });
    throw new AppError(`Time logging failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Updates table availability status.
 * @param {number} tableId - Table ID.
 * @param {string} status - New status (available, occupied, etc.).
 * @returns {Promise<void>}
 */
async function updateTableStatus(tableId, status) {
  try {
    const table = await Table.findByPk(tableId);
    if (!table) {
      throw new AppError('Table not found', 404, staffConstants.STAFF_NOT_FOUND);
    }

    await table.update({ status });
  } catch (error) {
    logger.error('Table status update failed', { error: error.message, tableId, status });
    throw new AppError(`Table status update failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Awards points for check-in task.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardCheckInPoints(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_NOT_FOUND);
    }

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.CHECK_IN_LOG.action,
      languageCode: 'en',
    });

    socketService.emit(`mtables:staff:${staffId}`, 'points:awarded', {
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.CHECK_IN_LOG.action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.CHECK_IN_LOG.points,
    });
  } catch (error) {
    logger.error('Check-in points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

module.exports = {
  processCheckIn,
  logCheckInTime,
  updateTableStatus,
  awardCheckInPoints,
};