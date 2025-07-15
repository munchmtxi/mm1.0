'use strict';

const { Op, sequelize } = require('sequelize');
const { Booking, Table, Customer, User, Merchant, MerchantBranch, Address, TableLayoutSection, Staff, BookingTimeSlot, BookingPartyMember, BookingBlackoutDate } = require('@models');
const mtablesConstants = require('@constants/merchant/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const staffConstants = require('@constants/staff/staffConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function createReservation(bookingId, customerId, details, ipAddress, transaction = null) {
  const { branchId, tableId, guestCount, date, time, seatingPreference, dietaryFilters, paymentMethodId, depositAmount, coordinates, staffId, source, occasion } = details;

  try {
    if (!bookingId || !customerId || !branchId || !tableId || !guestCount || !date || !time) {
      throw new AppError('Invalid booking details', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    if (guestCount < mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY ||
        guestCount > mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY ||
        guestCount > mtablesConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_BOOKING) {
      throw new AppError('Invalid party size', 400, mtablesConstants.ERROR_TYPES.INVALID_PARTY_SIZE);
    }

    if (seatingPreference && !mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES.includes(seatingPreference.toUpperCase())) {
      throw new AppError('Invalid seating preference', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    if (dietaryFilters && !dietaryFilters.every(filter => mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(filter.toUpperCase()))) {
      throw new AppError('Invalid dietary filters', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    const customer = await Customer.findByPk(customerId, { attributes: ['id', 'user_id'], transaction });
    if (!customer) {
      throw new AppError('Invalid customer ID', 404, customerConstants.ERROR_CODES.INVALID_CUSTOMER);
    }

    const activeBookings = await Booking.count({
      where: {
        customer_id: customerId,
        status: { [Op.in]: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.filter(s => ['pending', 'confirmed', 'checked_in'].includes(s.toLowerCase())) },
      },
      transaction,
    });
    if (activeBookings >= customerConstants.CUSTOMER_SETTINGS.MAX_ACTIVE_BOOKINGS) {
      throw new AppError('Maximum bookings exceeded', 400, mtablesConstants.ERROR_TYPES.MAX_BOOKINGS_EXCEEDED);
    }

    const table = await Table.findByPk(tableId, {
      include: [
        { model: MerchantBranch, as: 'branch', attributes: ['id', 'merchant_id'] },
        { model: TableLayoutSection, as: 'section', attributes: ['id', 'assigned_staff_id'] },
        { model: Staff, as: 'assignedStaff', attributes: ['id', 'staff_type'] }
      ],
      attributes: ['id', 'branch_id', 'status', 'capacity', 'assigned_staff_id', 'section_id'],
      transaction,
    });
    if (!table || table.branch_id !== branchId || table.status.toUpperCase() !== mtablesConstants.TABLE_STATUSES.AVAILABLE || guestCount > table.capacity) {
      throw new AppError('Table not available', 400, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
    }

    const bookingDateTime = new Date(`${date}T${time}`);
    if (isNaN(bookingDateTime)) {
      throw new AppError('Invalid booking date/time', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    // Validate against BookingTimeSlot
    const bookingDay = bookingDateTime.getDay();
    const timeSlot = await BookingTimeSlot.findOne({
      where: {
        branch_id: branchId,
        day_of_week: bookingDay,
        start_time: { [Op.lte]: time },
        end_time: { [Op.gte]: time },
        is_active: true,
      },
      transaction,
    });
    if (!timeSlot) {
      throw new AppError('Invalid time slot', 400, mtablesConstants.ERROR_TYPES.INVALID_TIME_SLOT);
    }
    if (guestCount < timeSlot.min_party_size || guestCount > timeSlot.max_party_size) {
      throw new AppError('Party size outside time slot limits', 400, mtablesConstants.ERROR_TYPES.INVALID_PARTY_SIZE);
    }
    if (bookingDateTime > new Date(Date.now() + timeSlot.max_advance_booking_days * 24 * 60 * 60 * 1000)) {
      throw new AppError('Booking too far in advance', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }
    // Validate booking interval
    const [hours, minutes] = time.split(':').map(Number);
    if (minutes % timeSlot.booking_interval_minutes !== 0) {
      throw new AppError('Booking time not aligned with interval', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    // Check BookingBlackoutDate
    const blackout = await BookingBlackoutDate.findOne({
      where: {
        branch_id: branchId,
        blackout_date: date,
        [Op.or]: [
          { start_time: null, end_time: null },
          { start_time: { [Op.lte]: time }, end_time: { [Op.gte]: time } },
        ],
      },
      transaction,
    });
    if (blackout) {
      throw new AppError('Booking blocked due to blackout', 400, mtablesConstants.ERROR_TYPES.BLACKOUT_DATE_CONFLICT);
    }

    // Check existing bookings for capacity
    const totalGuests = await Booking.sum('guest_count', {
      where: {
        branch_id: branchId,
        booking_date: date,
        booking_time: time,
        status: { [Op.in]: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.filter(s => ['pending', 'confirmed', 'checked_in'].includes(s.toLowerCase())) },
      },
      transaction,
    });
    if ((totalGuests || 0) + guestCount > timeSlot.max_capacity + (timeSlot.overbooking_limit || 0)) {
      throw new AppError('Time slot capacity exceeded', 400, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
    }

    const conflictingBooking = await Booking.findOne({
      where: {
        table_id: tableId,
        booking_date: date,
        booking_time: time,
        status: { [Op.notIn]: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.filter(s => s.toLowerCase() === 'cancelled') },
      },
      transaction,
    });
    if (conflictingBooking) {
      throw new AppError('Table not available', 400, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
    }

    // Validate staffId if provided
    let assignedStaffId = staffId || table.assigned_staff_id || table.section?.assigned_staff_id;
    if (staffId) {
      const staff = await Staff.findByPk(staffId, { attributes: ['id', 'staff_type'], transaction });
      if (!staff || !staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(staff.staff_type) ||
          !staffConstants.STAFF_PERMISSIONS[staff.staff_type]?.includes('manage_bookings')) {
        throw new AppError('Invalid staff assignment', 404, staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
      }
      assignedStaffId = staffId;
    }

    const reference = `BK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const checkInCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const booking = await Booking.create({
      id: bookingId,
      customer_id: customerId,
      merchant_id: table.branch.merchant_id,
      branch_id: branchId,
      table_id: tableId,
      staff_id: assignedStaffId,
      reference,
      check_in_code: checkInCode,
      booking_date: date,
      booking_time: time,
      booking_type: mtablesConstants.BOOKING_TYPES.TABLE,
      guest_count: guestCount,
      seating_preference: seatingPreference?.toUpperCase() || mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES[0],
      details: { dietaryFilters: dietaryFilters?.map(f => f.toUpperCase()), depositAmount },
      status: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.PENDING,
      source: source?.toLowerCase() || 'app',
      occasion,
      booking_metadata: { ipAddress, coordinates },
    }, { transaction });

    // Add customer as a BookingPartyMember
    await BookingPartyMember.create({
      booking_id: bookingId,
      customer_id: customerId,
      status: 'accepted',
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction });

    await table.update({ status: mtablesConstants.TABLE_STATUSES.RESERVED }, { transaction });

    logger.info(`Reservation created: ${bookingId}`);
    const user = await User.findByPk(customer.user_id, { attributes: ['preferred_language'], transaction });
    return {
      bookingId,
      reference,
      guestCount,
      staffId: assignedStaffId,
      language: user?.preferred_language && localizationConstants.SUPPORTED_LANGUAGES.includes(user.preferred_language) ? user.preferred_language : localizationConstants.DEFAULT_LANGUAGE,
      action: mtablesConstants.SUCCESS_MESSAGES.BOOKING_CREATED,
    };
  } catch (error) {
    logger.error(`createReservation failed: ${error.message}`, { bookingId, customerId });
    throw error;
  }
}

async function manageWaitlist(branchId, customerId, ipAddress, transaction = null) {
  try {
    if (!branchId || !customerId) {
      throw new AppError('Invalid booking details', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    const customer = await Customer.findByPk(customerId, { attributes: ['id', 'user_id'], transaction });
    if (!customer) {
      throw new AppError('Invalid customer ID', 404, customerConstants.ERROR_CODES.INVALID_CUSTOMER);
    }

    const branch = await MerchantBranch.findByPk(branchId, { attributes: ['id', 'merchant_id'], transaction });
    if (!branch) {
      throw new AppError('Invalid branch ID', 404, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    const waitlistEntry = await Booking.findOne({
      where: {
        branch_id: branchId,
        customer_id: customerId,
        status: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.PENDING,
        table_id: null,
      },
      transaction,
    });

    if (waitlistEntry) {
      const user = await User.findByPk(customer.user_id, { attributes: ['preferred_language'], transaction });
      return {
        waitlistId: waitlistEntry.id,
        status: 'already_waitlisted',
        language: user?.preferred_language && localizationConstants.SUPPORTED_LANGUAGES.includes(user.preferred_language) ? user.preferred_language : localizationConstants.DEFAULT_LANGUAGE,
        action: 'waitlistChecked',
      };
    }

    const reference = `WL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const waitlistBooking = await Booking.create({
      customer_id: customerId,
      merchant_id: branch.merchant_id,
      branch_id: branchId,
      reference,
      status: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.PENDING,
      booking_date: new Date(),
      booking_type: mtablesConstants.BOOKING_TYPES.TABLE,
      waitlisted_at: new Date(),
      booking_metadata: { ipAddress },
    }, { transaction });

    logger.info(`Waitlist entry created: ${waitlistBooking.id}`);
    const user = await User.findByPk(customer.user_id, { attributes: ['preferred_language'], transaction });
    return {
      waitlistId: waitlistBooking.id,
      status: 'added',
      language: user?.preferred_language && localizationConstants.SUPPORTED_LANGUAGES.includes(user.preferred_language) ? user.preferred_language : localizationConstants.DEFAULT_LANGUAGE,
      action: 'waitlistAdded',
    };
  } catch (error) {
    logger.error(`manageWaitlist failed: ${error.message}`, { branchId, customerId });
    throw error;
  }
}

async function setBookingPolicies(merchantId, policies, ipAddress, transaction = null) {
  const { cancellationWindowHours, depositPercentage } = policies;

  try {
    if (!merchantId || cancellationWindowHours < 0 || depositPercentage < mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE) {
      throw new AppError('Invalid booking policies', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    const merchant = await Merchant.findByPk(merchantId, { attributes: ['id', 'preferred_language'], transaction });
    if (!merchant) {
      throw new AppError('Invalid merchant ID', 404, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    const updatedPolicies = {
      cancellation_window_hours: cancellationWindowHours || mtablesConstants.BOOKING_POLICIES.CANCELLATION_WINDOW_HOURS,
      deposit_percentage: depositPercentage || mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE,
    };

    await merchant.update({ booking_policies: updatedPolicies }, { transaction });

    logger.info(`Booking policies updated for merchant: ${merchantId}`);
    return {
      merchantId,
      policies: updatedPolicies,
      language: merchant.preferred_language && localizationConstants.SUPPORTED_LANGUAGES.includes(merchant.preferred_language) ? merchant.preferred_language : localizationConstants.DEFAULT_LANGUAGE,
      action: mtablesConstants.SUCCESS_MESSAGES.BOOKING_UPDATED,
    };
  } catch (error) {
    logger.error(`setBookingPolicies failed: ${error.message}`, { merchantId });
    throw error;
  }
}

async function updateReservation(bookingId, updates, ipAddress, transaction = null) {
  const { guestCount, date, time, seatingPreference, dietaryFilters, staffId, modifiedBy } = updates;

  try {
    if (!bookingId) {
      throw new AppError('Booking not found', 400, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { 
          model: Table, 
          as: 'table', 
          include: [
            { model: MerchantBranch, as: 'branch', attributes: ['id', 'merchant_id'] },
            { model: TableLayoutSection, as: 'section', attributes: ['id', 'assigned_staff_id'] },
            { model: Staff, as: 'assignedStaff', attributes: ['id', 'staff_type'] }
          ]
        },
        { model: Customer, as: 'customer', attributes: ['id', 'user_id'] },
        { model: Staff, as: 'staff', attributes: ['id', 'staff_type'] },
        { model: BookingPartyMember, as: 'partyMembers', attributes: ['customer_id', 'status'] }
      ],
      transaction,
    });
    if (!booking || booking.status.toLowerCase() === customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.CANCELLED) {
      throw new AppError('Booking not found or cancelled', 404, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);
    }

    if (booking.status.toLowerCase() !== customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.PENDING) {
      throw new AppError('Cancellation window expired', 400, mtablesConstants.ERROR_TYPES.CANCELLATION_WINDOW_EXPIRED);
    }

    if (guestCount && (guestCount < mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY ||
                       guestCount > mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY ||
                       guestCount > mtablesConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_BOOKING)) {
      throw new AppError('Invalid party size', 400, mtablesConstants.ERROR_TYPES.INVALID_PARTY_SIZE);
    }

    if (seatingPreference && !mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES.includes(seatingPreference.toUpperCase())) {
      throw new AppError('Invalid seating preference', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    if (dietaryFilters && !dietaryFilters.every(filter => mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(filter.toUpperCase()))) {
      throw new AppError('Invalid dietary filters', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    // Validate party size with BookingPartyMember
    if (guestCount) {
      const acceptedMembers = booking.partyMembers.filter(m => m.status === 'accepted').length;
      if (acceptedMembers + guestCount > mtablesConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_BOOKING) {
        throw new AppError('Maximum party size exceeded', 400, mtablesConstants.ERROR_TYPES.MAX_FRIENDS_EXCEEDED);
      }
    }

    let newTable = booking.table;
    if (guestCount || seatingPreference) {
      newTable = await Table.findOne({
        where: {
          branch_id: booking.branch_id,
          status: mtablesConstants.TABLE_STATUSES.AVAILABLE,
          capacity: { [Op.gte]: guestCount || booking.guest_count },
          ...(seatingPreference && { location_type: seatingPreference.toUpperCase() }),
        },
        include: [
          { model: TableLayoutSection, as: 'section', attributes: ['id', 'assigned_staff_id'] },
          { model: Staff, as: 'assignedStaff', attributes: ['id', 'staff_type'] }
        ],
        transaction,
      });
      if (!newTable) {
        throw new AppError('Table not available', 400, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
      }

      await booking.table.update({ status: mtablesConstants.TABLE_STATUSES.AVAILABLE }, { transaction });
      await newTable.update({ status: mtablesConstants.TABLE_STATUSES.RESERVED }, { transaction });
    }

    if (date || time) {
      const newDate = date || booking.booking_date;
      const newTime = time || booking.booking_time;
      const bookingDateTime = new Date(`${newDate}T${newTime}`);
      if (isNaN(bookingDateTime)) {
        throw new AppError('Invalid booking date/time', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
      }

      // Validate against BookingTimeSlot
      const bookingDay = bookingDateTime.getDay();
      const timeSlot = await BookingTimeSlot.findOne({
        where: {
          branch_id: booking.branch_id,
          day_of_week: bookingDay,
          start_time: { [Op.lte]: newTime },
          end_time: { [Op.gte]: newTime },
          is_active: true,
        },
        transaction,
      });
      if (!timeSlot) {
        throw new AppError('Invalid time slot', 400, mtablesConstants.ERROR_TYPES.INVALID_TIME_SLOT);
      }
      if (guestCount && (guestCount < timeSlot.min_party_size || guestCount > timeSlot.max_party_size)) {
        throw new AppError('Party size outside time slot limits', 400, mtablesConstants.ERROR_TYPES.INVALID_PARTY_SIZE);
      }
      if (bookingDateTime > new Date(Date.now() + timeSlot.max_advance_booking_days * 24 * 60 * 60 * 1000)) {
        throw new AppError('Booking too far in advance', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
      }
      // Validate booking interval
      const [hours, minutes] = newTime.split(':').map(Number);
      if (minutes % timeSlot.booking_interval_minutes !== 0) {
        throw new AppError('Booking time not aligned with interval', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
      }

      // Check BookingBlackoutDate
      const blackout = await BookingBlackoutDate.findOne({
        where: {
          branch_id: booking.branch_id,
          blackout_date: newDate,
          [Op.or]: [
            { start_time: null, end_time: null },
            { start_time: { [Op.lte]: newTime }, end_time: { [Op.gte]: newTime } },
          ],
        },
        transaction,
      });
      if (blackout) {
        throw new AppError('Booking blocked due to blackout', 400, mtablesConstants.ERROR_TYPES.BLACKOUT_DATE_CONFLICT);
      }

      // Check time slot capacity
      const totalGuests = await Booking.sum('guest_count', {
        where: {
          branch_id: booking.branch_id,
          booking_date: newDate,
          booking_time: newTime,
          status: { [Op.in]: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.filter(s => ['pending', 'confirmed', 'checked_in'].includes(s.toLowerCase())) },
        },
        transaction,
      });
      if ((totalGuests || 0) + (guestCount || booking.guest_count) > timeSlot.max_capacity + (timeSlot.overbooking_limit || 0)) {
        throw new AppError('Time slot capacity exceeded', 400, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
      }

      const conflictingBooking = await Booking.findOne({
        where: {
          table_id: newTable.id,
          booking_date: newDate,
          booking_time: newTime,
          id: { [Op.ne]: bookingId },
          status: { [Op.notIn]: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.filter(s => s.toLowerCase() === 'cancelled') },
        },
        transaction,
      });
      if (conflictingBooking) {
        throw new AppError('Table not available', 400, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
      }
    }

    // Validate staffId if provided
    let assignedStaffId = staffId || newTable.assigned_staff_id || newTable.section?.assigned_staff_id;
    if (staffId) {
      const staff = await Staff.findByPk(staffId, { attributes: ['id', 'staff_type'], transaction });
      if (!staff || !staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(staff.staff_type) ||
          !staffConstants.STAFF_PERMISSIONS[staff.staff_type]?.includes('manage_bookings')) {
        throw new AppError('Invalid staff assignment', 404, staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
      }
      assignedStaffId = staffId;
    }

    const updatedBooking = await booking.update({
      guest_count: guestCount || booking.guest_count,
      booking_date: date || booking.booking_date,
      booking_time: time || booking.booking_time,
      seating_preference: seatingPreference?.toUpperCase() || booking.seating_preference,
      details: { ...booking.details, dietaryFilters: dietaryFilters?.map(f => f.toUpperCase()) || booking.details?.dietaryFilters },
      table_id: newTable.id,
      staff_id: assignedStaffId,
      booking_modified_at: new Date(),
      booking_modified_by: modifiedBy || booking.booking_modified_by,
      booking_metadata: { ...booking.booking_metadata, ipAddress },
    }, { transaction });

    logger.info(`Reservation updated: ${bookingId}`);
    const user = await User.findByPk(booking.customer.user_id, { attributes: ['preferred_language'], transaction });
    return {
      bookingId,
      guestCount: updatedBooking.guest_count,
      staffId: assignedStaffId,
      language: user?.preferred_language && localizationConstants.SUPPORTED_LANGUAGES.includes(user.preferred_language) ? user.preferred_language : localizationConstants.DEFAULT_LANGUAGE,
      action: mtablesConstants.SUCCESS_MESSAGES.BOOKING_UPDATED,
    };
  } catch (error) {
    logger.error(`updateReservation failed: ${error.message}`, { bookingId });
    throw error;
  }
}

module.exports = { createReservation, manageWaitlist, setBookingPolicies, updateReservation };