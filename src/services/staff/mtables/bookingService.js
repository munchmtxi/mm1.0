// bookingService.js
// Manages booking operations for mtables staff. Handles booking retrieval, status updates, waitlist, table assignments, blackout dates, party members, and check-in logging.
// Last Updated: July 15, 2025

'use strict';

const { Op } = require('sequelize');
const { Booking, MerchantBranch, Customer, Staff, Waitlist, BookingTimeSlot, Table, TableLayoutSection, BookingBlackoutDate, BookingPartyMember } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const staffConstants = require('@constants/staff/staffConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');
const { handleServiceError } = require('@utils/errorHandling');
const AppError = require('@utils/AppError');
const { formatDate, getCurrentTimestamp, isValidDate } = require('@utils/dateTimeUtils');

async function getActiveBookings(restaurantId, staffId) {
  try {
    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) throw new AppError('Branch not found', 404, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    const staff = await Staff.findByPk(staffId, { include: ['permissions'] });
    if (!staff || !staff.permissions.some(p => staffConstants.STAFF_PERMISSIONS.host.includes(p.name))) {
      throw new AppError('Unauthorized: Insufficient permissions', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const bookings = await Booking.findAll({
      where: {
        branch_id: restaurantId,
        status: { [Op.in]: mtablesConstants.BOOKING_STATUSES },
      },
      include: [
        { model: Customer, as: 'customer' },
        { model: Table, as: 'table', include: [{ model: TableLayoutSection, as: 'section' }] },
        { model: Staff, as: 'staff' },
        { model: BookingPartyMember, as: 'BookingPartyMembers' },
      ],
      order: [['booking_date', 'ASC'], ['booking_time', 'ASC']],
    });

    return bookings.map(booking => ({
      ...booking.toJSON(),
      booking_date: formatDate(booking.booking_date, localizationConstants.LOCALIZATION_SETTINGS.DATE_FORMATS[branch.preferred_language] || 'MM/DD/YYYY'),
    }));
  } catch (error) {
    logger.logErrorEvent('Error retrieving active bookings', { error: error.message, restaurantId, staffId });
    throw handleServiceError('getActiveBookings', error, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);
  }
}

async function updateBookingStatus(bookingId, status, staffId, tableId = null) {
  try {
    if (!mtablesConstants.BOOKING_STATUSES.includes(status)) {
      throw new AppError('Invalid booking status', 400, mtablesConstants.ERROR_TYPES.INVALID_INPUT);
    }

    const booking = await Booking.findByPk(bookingId, { include: [{ model: Table, as: 'table' }] });
    if (!booking) throw new AppError('Booking not found', 404, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    const staff = await Staff.findByPk(staffId, { include: ['permissions'] });
    if (!staff || !staff.permissions.some(p => staffConstants.STAFF_PERMISSIONS.manager.includes(p.name))) {
      throw new AppError('Unauthorized: Insufficient permissions', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    if (tableId) {
      const table = await Table.findByPk(tableId);
      if (!table || table.branch_id !== booking.branch_id || !mtablesConstants.TABLE_STATUSES.includes(table.status) || table.status !== 'AVAILABLE') {
        throw new AppError('Table not available', 400, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
      }
      await table.update({ status: 'RESERVED', assigned_staff_id: staffId });
    }

    await booking.update({
      status,
      table_id: tableId || booking.table_id,
      staff_id: staffId,
      booking_modified_at: getCurrentTimestamp(),
      booking_modified_by: staffId,
    });

    logger.logApiEvent(mtablesConstants.SUCCESS_MESSAGES.BOOKING_UPDATED, { bookingId, status, staffId });
    return booking;
  } catch (error) {
    logger.logErrorEvent('Error updating booking status', { error: error.message, bookingId, status, staffId });
    throw handleServiceError('updateBookingStatus', error, mtablesConstants.ERROR_TYPES.BOOKING_UPDATE_FAILED);
  }
}

async function manageWaitlist(restaurantId, customerId, action, staffId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: ['permissions'] });
    if (!staff || !staff.permissions.some(p => staffConstants.STAFF_PERMISSIONS.host.includes(p.name))) {
      throw new AppError('Unauthorized: Insufficient permissions', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const booking = await Booking.findOne({
      where: {
        customer_id: customerId,
        branch_id: restaurantId,
        status: { [Op.in]: mtablesConstants.BOOKING_STATUSES.filter(s => s !== 'CANCELLED' && s !== 'NO_SHOW') },
      },
    });
    if (!booking) throw new AppError('Booking not found', 404, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    const blackout = await BookingBlackoutDate.findOne({
      where: {
        branch_id: restaurantId,
        blackout_date: booking.booking_date,
        [Op.or]: [
          { start_time: { [Op.eq]: null } },
          { start_time: { [Op.lte]: booking.booking_time }, end_time: { [Op.gte]: booking.booking_time } },
        ],
      },
    });
    if (blackout) throw new AppError('Booking date is blacked out', 400, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    const timeSlot = await BookingTimeSlot.findOne({
      where: { branch_id: restaurantId, is_active: true, day_of_week: new Date(booking.booking_date).getDay() },
    });
    if (!timeSlot) throw new AppError('No available time slot', 400, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);

    if (action === 'add') {
      const currentBookings = await Booking.count({
        where: {
          branch_id: restaurantId,
          booking_date: booking.booking_date,
          status: { [Op.ne]: 'CANCELLED' },
        },
      });

      if (currentBookings >= timeSlot.max_capacity + timeSlot.overbooking_limit) {
        const waitlistPosition = (await Waitlist.count({ where: { branch_id: restaurantId, booking_date: booking.booking_date } })) + 1;
        await Waitlist.create({
          booking_id: booking.id,
          branch_id: restaurantId,
          booking_date: booking.booking_date,
          position: waitlistPosition,
          created_at: getCurrentTimestamp(),
        });
        await booking.update({ waitlist_position: waitlistPosition, waitlisted_at: getCurrentTimestamp(), staff_id: staffId });
        logger.logApiEvent('Waitlist entry added', { bookingId: booking.id, waitlistPosition, staffId });
      }
    } else if (action === 'remove') {
      await Waitlist.destroy({ where: { booking_id: booking.id } });
      await booking.update({ waitlist_position: null, waitlisted_at: null });
      logger.logApiEvent('Waitlist entry removed', { bookingId: booking.id, staffId });
    } else {
      throw new AppError('Invalid action', 400, mtablesConstants.ERROR_TYPES.INVALID_INPUT);
    }

    return booking;
  } catch (error) {
    logger.logErrorEvent('Error managing waitlist', { error: error.message, restaurantId, customerId, action, staffId });
    throw handleServiceError('manageWaitlist', error, mtablesConstants.ERROR_TYPES.BOOKING_UPDATE_FAILED);
  }
}

async function assignTableToBooking(bookingId, tableId, staffId) {
  try {
    const booking = await Booking.findByPk(bookingId, { include: [{ model: Table, as: 'table' }] });
    if (!booking) throw new AppError('Booking not found', 404, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    const staff = await Staff.findByPk(staffId, { include: ['permissions'] });
    if (!staff || !staff.permissions.some(p => staffConstants.STAFF_PERMISSIONS.host.includes(p.name))) {
      throw new AppError('Unauthorized: Insufficient permissions', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const table = await Table.findByPk(tableId, { include: [{ model: TableLayoutSection, as: 'section' }] });
    if (!table || table.branch_id !== booking.branch_id || table.status !== 'AVAILABLE') {
      throw new AppError('Table not available', 400, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
    }

    const timeSlot = await BookingTimeSlot.findOne({
      where: { branch_id: booking.branch_id, is_active: true, day_of_week: new Date(booking.booking_date).getDay() },
    });
    if (!timeSlot || booking.guest_count > timeSlot.max_party_size || booking.guest_count < timeSlot.min_party_size) {
      throw new AppError('Invalid party size for time slot', 400, mtablesConstants.ERROR_TYPES.INVALID_PARTY_SIZE);
    }

    const blackout = await BookingBlackoutDate.findOne({
      where: {
        branch_id: booking.branch_id,
        blackout_date: booking.booking_date,
        [Op.or]: [
          { start_time: { [Op.eq]: null } },
          { start_time: { [Op.lte]: booking.booking_time }, end_time: { [Op.gte]: booking.booking_time } },
        ],
      },
    });
    if (blackout) throw new AppError('Booking date is blacked out', 400, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    await table.update({ status: 'RESERVED', assigned_staff_id: staffId });
    await booking.update({
      table_id: tableId,
      staff_id: staffId,
      booking_modified_at: getCurrentTimestamp(),
      booking_modified_by: staffId,
    });

    logger.logApiEvent(mtablesConstants.AUDIT_TYPES.TABLE_ASSIGNED, { bookingId, tableId, staffId });
    return { booking, table };
  } catch (error) {
    logger.logErrorEvent('Error assigning table to booking', { error: error.message, bookingId, tableId, staffId });
    throw handleServiceError('assignTableToBooking', error, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
  }
}

async function managePartyMembers(bookingId, customerIds, action, staffId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: ['permissions'] });
    if (!staff || !staff.permissions.some(p => staffConstants.STAFF_PERMISSIONS.host.includes(p.name))) {
      throw new AppError('Unauthorized: Insufficient permissions', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const booking = await Booking.findByPk(bookingId);
    if (!booking) throw new AppError('Booking not found', 404, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    const timeSlot = await BookingTimeSlot.findOne({
      where: { branch_id: booking.branch_id, is_active: true, day_of_week: new Date(booking.booking_date).getDay() },
    });
    if (!timeSlot) throw new AppError('No available time slot', 400, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);

    const currentPartySize = await BookingPartyMember.count({
      where: { booking_id: bookingId, status: { [Op.in]: mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES.filter(s => s === 'ACCEPTED' || s === 'PENDING') } },
    });

    if (action === 'add') {
      if (currentPartySize + customerIds.length > timeSlot.max_party_size || currentPartySize + customerIds.length > mtablesConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_BOOKING) {
        throw new AppError('Party size limit exceeded', 400, mtablesConstants.ERROR_TYPES.INVALID_PARTY_SIZE);
      }

      for (const customerId of customerIds) {
        const customer = await Customer.findByPk(customerId);
        if (!customer) throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);

        if (customer.dietary_preferences && !customer.dietary_preferences.every(pref => mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref))) {
          throw new AppError('Invalid dietary preferences', 400, customerConstants.ERROR_CODES.INVALID_DIETARY_FILTER);
        }

        await BookingPartyMember.create({
          booking_id: bookingId,
          customer_id: customerId,
          status: 'PENDING',
          created_at: getCurrentTimestamp(),
          updated_at: getCurrentTimestamp(),
        });
      }

      await booking.update({ guest_count: currentPartySize + customerIds.length, booking_modified_by: staffId, booking_modified_at: getCurrentTimestamp() });
      logger.logApiEvent(mtablesConstants.AUDIT_TYPES.PARTY_MEMBER_ADDED, { bookingId, customerIds, staffId });
    } else if (action === 'remove') {
      for (const customerId of customerIds) {
        await BookingPartyMember.update(
          { status: 'REMOVED', updated_at: getCurrentTimestamp() },
          { where: { booking_id: bookingId, customer_id: customerId } }
        );
      }
      const newPartySize = await BookingPartyMember.count({
        where: { booking_id: bookingId, status: { [Op.in]: ['PENDING', 'ACCEPTED'] } },
      });
      await booking.update({ guest_count: newPartySize, booking_modified_by: staffId, booking_modified_at: getCurrentTimestamp() });
      logger.logApiEvent('Party members removed', { bookingId, customerIds, staffId });
    } else {
      throw new AppError('Invalid action', 400, mtablesConstants.ERROR_TYPES.INVALID_INPUT);
    }

    return booking;
  } catch (error) {
    logger.logErrorEvent('Error managing party members', { error: error.message, bookingId, customerIds, action, staffId });
    throw handleServiceError('managePartyMembers', error, mtablesConstants.ERROR_TYPES.PARTY_MEMBER_ADDITION_FAILED);
  }
}

async function checkInBooking(bookingId, staffId, checkInMethod) {
  try {
    if (!mtablesConstants.CHECK_IN_METHODS.includes(checkInMethod)) {
      throw new AppError('Invalid check-in method', 400, mtablesConstants.ERROR_TYPES.INVALID_INPUT);
    }

    const booking = await Booking.findByPk(bookingId, { include: [{ model: Table, as: 'table' }] });
    if (!booking) throw new AppError('Booking not found', 404, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    const staff = await Staff.findByPk(staffId, { include: ['permissions'] });
    if (!staff || !staff.permissions.some(p => staffConstants.STAFF_PERMISSIONS.host.includes(p.name))) {
      throw new AppError('Unauthorized: Insufficient permissions', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    if (booking.status !== 'CONFIRMED') {
      throw new AppError('Booking not in confirmed state', 400, mtablesConstants.ERROR_TYPES.CHECK_IN_FAILED);
    }

    if (!booking.table_id) {
      throw new AppError('No table assigned', 400, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
    }

    await booking.update({
      status: 'CHECKED_IN',
      arrived_at: getCurrentTimestamp(),
      booking_modified_at: getCurrentTimestamp(),
      booking_modified_by: staffId,
    });

    await Table.update({ status: 'OCCUPIED' }, { where: { id: booking.table_id } });
    logger.logApiEvent(mtablesConstants.AUDIT_TYPES.CHECK_IN_PROCESSED, { bookingId, staffId, checkInMethod });
    return booking;
  } catch (error) {
    logger.logErrorEvent('Error checking in booking', { error: error.message, bookingId, staffId, checkInMethod });
    throw handleServiceError('checkInBooking', error, mtablesConstants.ERROR_TYPES.CHECK_IN_FAILED);
  }
}

async function logCheckInTime(bookingId, staffId, checkInTime) {
  try {
    if (!isValidDate(checkInTime)) {
      throw new AppError('Invalid check-in time', 400, mtablesConstants.ERROR_TYPES.INVALID_INPUT);
    }

    const booking = await Booking.findByPk(bookingId, { include: [{ model: Table, as: 'table' }] });
    if (!booking) throw new AppError('Booking not found', 404, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    const staff = await Staff.findByPk(staffId, { include: ['permissions'] });
    if (!staff || !staff.permissions.some(p => staffConstants.STAFF_PERMISSIONS.host.includes(p.name))) {
      throw new AppError('Unauthorized: Insufficient permissions', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
      throw new AppError('Booking not in valid state for check-in', 400, mtablesConstants.ERROR_TYPES.CHECK_IN_FAILED);
    }

    if (!booking.table_id) {
      throw new AppError('No table assigned', 400, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
    }

    await booking.update({
      arrived_at: checkInTime,
      booking_modified_at: getCurrentTimestamp(),
      booking_modified_by: staffId,
    });

    logger.logApiEvent(mtablesConstants.AUDIT_TYPES.CHECK_IN_PROCESSED, { bookingId, staffId, checkInTime: formatDate(checkInTime) });
    return booking;
  } catch (error) {
    logger.logErrorEvent('Error logging check-in time', { error: error.message, bookingId, staffId, checkInTime });
    throw handleServiceError('logCheckInTime', error, mtablesConstants.ERROR_TYPES.CHECK_IN_FAILED);
  }
}

module.exports = {
  getActiveBookings,
  updateBookingStatus,
  manageWaitlist,
  assignTableToBooking,
  managePartyMembers,
  checkInBooking,
  logCheckInTime,
};