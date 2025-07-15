// bookingService.js
// Manages booking operations for mtables staff. Handles booking retrieval, status updates, and waitlist management.
// Last Updated: May 25, 2025

'use strict';

const { Op } = require('sequelize');
const { Booking, MerchantBranch, Customer, Staff, Waitlist, BookingTimeSlot } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

async function getActiveBookings(restaurantId) {
  try {
    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

    const bookings = await Booking.findAll({
      where: {
        branch_id: restaurantId,
        status: { [Op.in]: [mtablesConstants.BOOKING_STATUSES.PENDING, mtablesConstants.BOOKING_STATUSES.CONFIRMED, 'seated'] },
      },
      include: [{ model: Customer, as: 'customer' }],
      order: [['booking_date', 'ASC'], ['booking_time', 'ASC']],
    });

    return bookings;
  } catch (error) {
    logger.error('Error retrieving active bookings', { error: error.message, restaurantId });
    throw error;
  }
}

async function updateBookingStatus(bookingId, status, staffId) {
  try {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    await booking.update({ status, booking_modified_at: new Date(), booking_modified_by: staffId });

    return booking;
  } catch (error) {
    logger.error('Error updating booking status', { error: error.message, bookingId, status });
    throw error;
  }
}

async function manageWaitlist(restaurantId, customerId, action, staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const booking = await Booking.findOne({
      where: { customer_id: customerId, branch_id: restaurantId, status: { [Op.in]: [mtablesConstants.BOOKING_STATUSES.PENDING, mtablesConstants.BOOKING_STATUSES.CONFIRMED] } },
    });
    if (!booking) throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

    if (action === 'add') {
      const timeSlot = await BookingTimeSlot.findOne({
        where: { branch_id: restaurantId, is_active: true, day_of_week: new Date(booking.booking_date).getDay() },
      });
      if (!timeSlot) throw new Error(mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE);

      const currentBookings = await Booking.count({
        where: { branch_id: restaurantId, booking_date: booking.booking_date, status: { [Op.ne]: mtablesConstants.BOOKING_STATUSES.CANCELLED } },
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
      }
    } else if (action === 'remove') {
      await Waitlist.destroy({ where: { booking_id: booking.id } });
      await booking.update({ waitlist_position: null, waitlisted_at: null });
    } else {
      throw new Error(mtablesConstants.ERROR_CODES.INVALID_INPUT);
    }

    return booking;
  } catch (error) {
    logger.error('Error managing waitlist', { error: error.message, restaurantId, customerId, action });
    throw error;
  }
}

module.exports = {
  getActiveBookings,
  updateBookingStatus,
  manageWaitlist,
};