// bookingController.js
// Handles booking-related requests for mtables staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const bookingService = require('@services/staff/mtables/bookingService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const staffConstants = require('@constants/staff/staffConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const { Customer, Staff } = require('@models');

async function getActiveBookings(req, res, next) {
  try {
    const { restaurantId } = req.body;
    const io = req.app.get('io');

    const bookings = await bookingService.getActiveBookings(restaurantId);

    const staffId = req.user?.id; // Assuming auth middleware provides user ID
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_retrieve,
      details: { restaurantId, action: 'get_active_bookings', bookings: bookings.length },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId))?.position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.points,
      details: { staffId, restaurantId, bookings: bookings.length },
    });

    socketService.emit(io, `staff:mtables:logs_retrieved`, {
      restaurantId,
      bookings: bookings.length,
      staffId,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.get_active_bookings', { count: bookings.length }, 'en'), // Default to 'en' for branch-level ops
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
}

async function updateBookingStatus(req, res, next) {
  try {
    const { bookingId, status, staffId } = req.body;
    const io = req.app.get('io');

    const booking = await bookingService.updateBookingStatus(bookingId, status, staffId);

    const customer = await Customer.findByPk(booking.customer_id);
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { bookingId, status, action: 'update_booking_status' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.bookingUpdated.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.bookingUpdated.points,
      details: { bookingId, status },
    });

    await notificationService.sendNotification({
      userId: booking.customer_id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.TABLE_ASSIGNED,
      messageKey: `mtables.${status}`,
      messageParams: { reference: booking.reference },
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || 'en',
    });

    socketService.emit(io, `staff:mtables:status_updated`, {
      bookingId,
      status,
    }, `customer:${booking.customer_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage(`mtables.${status}`, { reference: booking.reference }, customer.preferred_language || 'en'),
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

async function manageWaitlist(req, res, next) {
  try {
    const { restaurantId, customerId, action, staffId } = req.body;
    const io = req.app.get('io');

    const booking = await bookingService.manageWaitlist(restaurantId, customerId, action, staffId);

    const customer = await Customer.findByPk(customerId);
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { bookingId: booking.id, waitlistAction: action, action: 'manage_waitlist' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.waitlistAdded.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.waitlistAdded.points,
      details: { bookingId: booking.id, action },
    });

    let event, messageKey;
    if (action === 'add') {
      event = 'staff:mtables:waitlisted';
      messageKey = 'mtables.waitlisted';
    } else {
      event = 'staff:mtables:waitlist_removed';
      messageKey = 'mtables.removed_from_waitlist';
    }

    await notificationService.sendNotification({
      userId: customerId,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.TABLE_ASSIGNED,
      messageKey,
      messageParams: { reference: booking.reference, position: booking.waitlist_position || 0 },
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || 'en',
    });

    socketService.emit(io, event, {
      bookingId: booking.id,
      waitlistPosition: booking.waitlist_position || null,
    }, `customer:${customerId}`);

    res.status(200).json({
      success: true,
      message: formatMessage(messageKey, { reference: booking.reference, position: booking.waitlist_position || 0 }, customer.preferred_language || 'en'),
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getActiveBookings,
  updateBookingStatus,
  manageWaitlist,
};