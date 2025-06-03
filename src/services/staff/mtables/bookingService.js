'use strict';

/**
 * bookingService.js
 * Manages booking operations for mtables (staff role). Handles FOH booking retrieval, status updates,
 * waitlist management, and point awarding. Integrates with models and services.
 * Last Updated: May 25, 2025
 */

const { Op } = require('sequelize');
const { Booking, MerchantBranch, Customer, Staff, Waitlist, BookingTimeStamp } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const locationService = require('@services/common/locationService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Retrieves active bookings for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @returns {Promise<Array>} List of active bookings.
 */
async function getActiveBookings(restaurantId) {
  try {
    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError('Restaurant not found', 404, staffConstants.STAFF_NOT_FOUND);
    }

    const bookings = await Booking.findAll({
      where: {
        branch_id: restaurantId,
        status: { [Op.in]: ['pending', 'confirmed', 'seated'] },
      },
      include: [{ model: Customer, as: 'customer' }],
      order: [['booking_date', 'ASC'], ['booking_time', 'ASC']],
    });

    return bookings;
  } catch (error) {
    logger.error('Failed to retrieve active bookings', { error: error.message, restaurantId });
    throw new AppError(`Failed to retrieve bookings: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Updates booking status.
 * @param {number} bookingId - Booking ID.
 * @param {string} status - New status.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Updated booking.
 */
async function updateBookingStatus(bookingId, status, staffId, ipAddress) {
  try {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404, staffConstants.STAFF_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageBookings?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    await booking.update({ status, booking_modified_at: new Date(), booking_modified_by: staffId });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { bookingId, status },
      ipAddress,
    });

    const message = localization.formatMessage(`booking.${status}`, { reference: booking.reference });
    await notificationService.sendNotification({
      userId: booking.customer_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message,
      role: 'customer',
      module: 'mtables',
      bookingId,
    });

    socketService.emit(`mtables:booking:${booking.customer_id}`, 'booking:status_updated', {
      bookingId,
      status,
    });

    return booking;
  } catch (error) {
    logger.error('Booking status update failed', { error: error.message, bookingId, status });
    throw new AppError(`Booking status update failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Manages waitlist for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {number} customerId - Customer ID.
 * @param {string} action - 'add' or 'remove'.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Updated booking or waitlist entry.
 */
async function manageWaitlist(restaurantId, customerId, action, staffId, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageBookings?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const booking = await Booking.findOne({
      where: { customer_id: customerId, branch_id: restaurantId, status: { [Op.in]: ['pending', 'confirmed'] } },
    });
    if (!booking) {
      throw new AppError('No active booking found', 404, staffConstants.STAFF_NOT_FOUND);
    }

    if (action === 'add') {
      const timeSlot = await BookingTimeSlot.findOne({
        where: { branch_id: restaurantId, is_active: true, day_of_week: new Date(booking.booking_date).getDay() },
      });
      const currentBookings = await Booking.count({
        where: { branch_id: restaurantId, booking_date: booking.booking_date, status: { [Op.ne]: 'cancelled' } },
      });

      if (currentBookings >= timeSlot.max_capacity + timeSlot.overbooking_limit) {
        const waitlistPosition = await Waitlist.count({ where: { branch_id: restaurantId, booking_date: booking.booking_date } }) + 1;
        await Waitlist.create({
          booking_id: booking.id,
          branch_id: restaurantId,
          booking_date: booking.booking_date,
          position: waitlistPosition,
          created_at: new Date(),
        });
        await booking.update({ waitlist_position: waitlistPosition, waitlisted_at: new Date() });

        const message = localization.formatMessage('booking.waitlisted', {
          reference: booking.reference,
          position: waitlistPosition,
        });
        await notificationService.sendNotification({
          userId: customerId,
          notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
          message,
          role: 'customer',
          module: 'mtables',
          bookingId: booking.id,
        });

        socketService.emit(`mtables:booking:${customerId}`, 'booking:waitlisted', {
          bookingId: booking.id,
          waitlistPosition,
        });
      }
    } else if (action === 'remove') {
      await Waitlist.destroy({ where: { booking_id: booking.id } });
      await booking.update({ waitlist_position: null, waitlisted_at: null });

      const message = localization.formatMessage('booking.removed_from_waitlist', { reference: booking.reference });
      await notificationService.sendNotification({
        userId: customerId,
        notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
        message,
        role: 'customer',
        module: 'mtables',
        bookingId: booking.id,
      });

      socketService.emit(`mtables:booking:${customerId}`, 'booking:waitlist_removed', { bookingId: booking.id });
    }

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { bookingId: booking.id, waitlistAction: action },
      ipAddress,
    });

    return booking;
  } catch (error) {
    logger.error('Waitlist management failed', { error: error.message, restaurantId, customerId, action });
    throw new AppError(`Waitlist management failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Awards points for booking task completion.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardBookingPoints(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_NOT_FOUND);
    }

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.action,
      languageCode: 'en',
    });

    socketService.emit(`mtables:staff:${staffId}`, 'points:awarded', {
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.points,
    });
  } catch (error) {
    logger.error('Booking points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

module.exports = {
  getActiveBookings,
  updateBookingStatus,
  manageWaitlist,
  awardBookingPoints,
};