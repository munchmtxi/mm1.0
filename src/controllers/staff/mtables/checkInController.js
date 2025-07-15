// checkInController.js
// Handles check-in-related requests for mtables staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const checkInService = require('@services/staff/mtables/checkInService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const staffConstants = require('@constants/staff/staffConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const { Booking, Table, Staff } = require('@models');

async function processCheckIn(req, res, next) {
  try {
    const { bookingId, staffId } = req.body;
    const io = req.app.get('io');

    const booking = await checkInService.processCheckIn(bookingId, staffId);

    const table = await Table.findByPk(booking.table_id);
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { bookingId, action: 'check_in', tableId: booking.table_id },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.checkInProcessed.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.checkInProcessed.points,
      details: { bookingId, tableId: booking.table_id },
    });

    await notificationService.sendNotification({
      userId: booking.customer_id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.TABLE_ASSIGNED,
      messageKey: 'mtables.check_in_confirmed',
      messageParams: { reference: booking.reference, tableNumber: table.table_number },
      role: 'customer',
      module: 'mtables',
      languageCode: (await Booking.findByPk(bookingId, { include: [{ model: Customer, as: 'customer' }] })).customer.preferred_language || 'en',
    });

    socketService.emit(io, `staff:mtables:checkin_confirmed`, {
      bookingId,
      status: mtablesConstants.BOOKING_STATUSES.CHECKED_IN,
      tableNumber: table.table_number,
    }, `customer:${booking.customer_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.check_in_confirmed', { reference: booking.reference, tableNumber: table.table_number }, (await Booking.findByPk(bookingId, { include: [{ model: Customer, as: 'customer' }] })).customer.preferred_language || 'en'),
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

async function logCheckInTime(req, res, next) {
  try {
    const { bookingId, staffId } = req.body;
    const io = req.app.get('io');

    await checkInService.logCheckInTime(bookingId, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { bookingId, action: 'log_check_in_time' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.checkInLogged.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.checkInLogged.points,
      details: { bookingId },
    });

    socketService.emit(io, `staff:mtables:time_logged`, {
      bookingId,
      staffId,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.time_logged', { bookingId }, (await Staff.findByPk(staffId)).preferred_language || 'en'),
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

async function updateTableStatus(req, res, next) {
  try {
    const { tableId, status, staffId } = req.body;
    const io = req.app.get('io');

    await checkInService.updateTableStatus(tableId, status);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { tableId, status, action: 'update_table_status' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.tableStatusUpdated.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.tableStatusUpdated.points,
      details: { tableId, status },
    });

    socketService.emit(io, `staff:mtables:table_status_updated`, {
      tableId,
      status,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.table_status_updated', { tableId, status }, (await Staff.findByPk(staffId)).preferred_language || 'en'),
      data: { tableId, status },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  processCheckIn,
  logCheckInTime,
  updateTableStatus,
};