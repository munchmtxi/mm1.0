'use strict';

const bookingService = require('@services/admin/mtables/bookingService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');

async function monitorBookings(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const summary = await bookingService.monitorBookings(restaurantId);

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: mtablesConstants.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, summary },
      ipAddress: req.ip,
    });

    await socketService.emit(null, 'bookings:status_updated', {
      userId: req.user.id,
      role: 'merchant',
      restaurantId,
      summary,
    });

    res.status(200).json({
      status: 'success',
      data: summary,
      message: formatMessage('success.bookings_monitored'),
    });
  } catch (error) {
    next(error);
  }
}

async function manageTableAdjustments(req, res, next) {
  try {
    const { bookingId } = req.params;
    const { tableId, reason } = req.body;
    const reassignment = { tableId, reason };
    const booking = await bookingService.manageTableAdjustments(bookingId, reassignment, { pointService });

    const bookingDetails = await bookingService.getBookingDetails(bookingId);
    await notificationService.sendNotification({
      userId: bookingDetails.customer_id.toString(),
      notificationType: mtablesConstants.NOTIFICATION_TYPES.TABLE_ASSIGNED,
      messageKey: 'booking.table_reassigned',
      messageParams: { tableNumber: booking.tableNumber, reason: reassignment.reason || 'N/A' },
      role: 'customer',
      module: 'mtables',
    });

    await socketService.emit(null, 'booking:table_reassigned', {
      userId: bookingDetails.customer_id.toString(),
      role: 'customer',
      bookingId,
      newTable: { id: booking.tableId, tableNumber: booking.tableNumber },
    });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: mtablesConstants.AUDIT_TYPES.TABLE_ASSIGNED,
      details: { bookingId, newTableId: reassignment.tableId, reason: reassignment.reason },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      data: booking,
      message: formatMessage('success.table_reassigned'),
    });
  } catch (error) {
    next(error);
  }
}

async function closeBookings(req, res, next) {
  try {
    const { bookingId } = req.params;
    const booking = await bookingService.closeBookings(bookingId, { pointService });

    const bookingDetails = await bookingService.getBookingDetails(bookingId);
    await notificationService.sendNotification({
      userId: bookingDetails.customer_id.toString(),
      notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'booking.completed',
      messageParams: { bookingId, date: bookingDetails.format_date() },
      role: 'customer',
      module: 'mtables',
    });

    await socketService.emit(null, 'booking:completed', {
      userId: bookingDetails.customer_id.toString(),
      role: 'customer',
      bookingId,
    });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: mtablesConstants.AUDIT_TYPES.BOOKING_UPDATED,
      details: { bookingId, status: 'completed' },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      data: booking,
      message: formatMessage('success.booking_closed'),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  monitorBookings,
  manageTableAdjustments,
  closeBookings,
};