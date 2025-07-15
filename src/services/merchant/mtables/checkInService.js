'use strict';

const { Op, sequelize } = require('sequelize');
const { Booking, Table, Customer, User, Merchant, MerchantBranch, Address, TableLayoutSection, Staff, BookingTimeSlot, BookingPartyMember, BookingBlackoutDate } = require('@models');
const mtablesConstants = require('@constants/merchant/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const staffConstants = require('@constants/staff/staffConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function processCheckIn(bookingId, checkInDetails, ipAddress, transaction = null) {
  const { qrCode, method, coordinates, staffId } = checkInDetails;

  try {
    if (!bookingId || !method) {
      throw new AppError('Invalid check-in details', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    if (!mtablesConstants.CHECK_IN_METHODS.includes(method.toUpperCase())) {
      throw new AppError('Invalid check-in method', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Table,
          as: 'table',
          include: [
            { model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }, { model: Address, as: 'address' }] },
            { model: TableLayoutSection, as: 'section', attributes: ['id', 'assigned_staff_id'] },
            { model: Staff, as: 'assignedStaff', attributes: ['id', 'staff_type'] },
          ],
        },
        { model: Customer, as: 'customer', attributes: ['id', 'user_id'] },
        { model: Staff, as: 'staff', attributes: ['id', 'staff_type'] },
        { model: BookingPartyMember, as: 'partyMembers', attributes: ['customer_id', 'status'] },
      ],
      transaction,
    });
    if (!booking || booking.status.toLowerCase() !== customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.CONFIRMED) {
      throw new AppError('Booking not found or not confirmed', 400, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);
    }

    if (method.toUpperCase() === mtablesConstants.CHECK_IN_METHODS.QR_CODE && qrCode !== booking.check_in_code) {
      throw new AppError('Invalid QR code', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    // Validate against BookingTimeSlot
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
    const bookingDay = bookingDateTime.getDay();
    const timeSlot = await BookingTimeSlot.findOne({
      where: {
        branch_id: booking.branch_id,
        day_of_week: bookingDay,
        start_time: { [Op.lte]: booking.booking_time },
        end_time: { [Op.gte]: booking.booking_time },
        is_active: true,
      },
      transaction,
    });
    if (!timeSlot) {
      throw new AppError('Invalid time slot for check-in', 400, mtablesConstants.ERROR_TYPES.INVALID_TIME_SLOT);
    }

    // Check BookingBlackoutDate
    const blackout = await BookingBlackoutDate.findOne({
      where: {
        branch_id: booking.branch_id,
        blackout_date: booking.booking_date,
        [Op.or]: [
          { start_time: null, end_time: null },
          { start_time: { [Op.lte]: booking.booking_time }, end_time: { [Op.gte]: booking.booking_time } },
        ],
      },
      transaction,
    });
    if (blackout) {
      throw new AppError('Check-in blocked due to blackout', 400, mtablesConstants.ERROR_TYPES.BLACKOUT_DATE_CONFLICT);
    }

    // Validate party size with BookingPartyMember
    const acceptedMembers = booking.partyMembers.filter(m => m.status === 'accepted').length;
    if (acceptedMembers > booking.guest_count || acceptedMembers > mtablesConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_BOOKING) {
      throw new AppError('Party size exceeds booking or limits', 400, mtablesConstants.ERROR_TYPES.MAX_FRIENDS_EXCEEDED);
    }

    // Validate staffId if provided
    let assignedStaffId = staffId || booking.staff_id || booking.table.assigned_staff_id || booking.table.section?.assigned_staff_id;
    if (staffId) {
      const staff = await Staff.findByPk(staffId, { attributes: ['id', 'staff_type'], transaction });
      if (!staff || !staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(staff.staff_type) ||
          !staffConstants.STAFF_PERMISSIONS[staff.staff_type]?.includes('manage_check_ins')) {
        throw new AppError('Invalid staff assignment', 404, staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
      }
      assignedStaffId = staffId;
    }

    await booking.update({
      status: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.CHECKED_IN,
      staff_id: assignedStaffId,
      check_in_time: new Date(),
      booking_modified_at: new Date(),
      booking_metadata: { ...booking.booking_metadata, ipAddress, coordinates },
    }, { transaction });

    await booking.table.update({ status: mtablesConstants.TABLE_STATUSES.OCCUPIED }, { transaction });

    logger.info(`Check-in processed: ${bookingId}`);
    const user = await User.findByPk(booking.customer.user_id, { attributes: ['preferred_language'], transaction });
    return {
      bookingId,
      tableId: booking.table_id,
      branchId: booking.branch_id,
      staffId: assignedStaffId,
      language: user?.preferred_language && localizationConstants.SUPPORTED_LANGUAGES.includes(user.preferred_language) ? user.preferred_language : localizationConstants.DEFAULT_LANGUAGE,
      action: mtablesConstants.SUCCESS_MESSAGES.CHECK_IN_CONFIRMED,
    };
  } catch (error) {
    logger.error(`processCheckIn failed: ${error.message}`, { bookingId });
    throw error;
  }
}

async function updateTableStatus(tableId, status, ipAddress, transaction = null) {
  try {
    if (!tableId || !mtablesConstants.TABLE_STATUSES.includes(status.toUpperCase())) {
      throw new AppError('Invalid table status', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    const table = await Table.findByPk(tableId, {
      include: [
        { model: MerchantBranch, as: 'branch', attributes: ['id', 'merchant_id'] },
        { model: TableLayoutSection, as: 'section', attributes: ['id', 'assigned_staff_id'] },
        { model: Staff, as: 'assignedStaff', attributes: ['id', 'staff_type'] },
      ],
      transaction,
    });
    if (!table) {
      throw new AppError('Table not found', 404, mtablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
    }

    await table.update({ status: status.toUpperCase(), booking_modified_at: new Date() }, { transaction });

    logger.info(`Table status updated: ${tableId}`);
    const merchant = await Merchant.findByPk(table.branch.merchant_id, { attributes: ['preferred_language'], transaction });
    return {
      tableId,
      status,
      branchId: table.branch_id,
      language: merchant?.preferred_language && localizationConstants.SUPPORTED_LANGUAGES.includes(merchant.preferred_language) ? merchant.preferred_language : localizationConstants.DEFAULT_LANGUAGE,
      action: mtablesConstants.AUDIT_TYPES.TABLE_AVAILABILITY_UPDATED,
    };
  } catch (error) {
    logger.error(`updateTableStatus failed: ${error.message}`, { tableId });
    throw error;
  }
}

async function logCheckInTime(bookingId, ipAddress, transaction = null) {
  try {
    if (!bookingId) {
      throw new AppError('Booking not found', 400, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'user_id'] },
        { model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant', attributes: ['id', 'preferred_language'] }] },
      ],
      transaction,
    });
    if (!booking || booking.status.toLowerCase() !== customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.CHECKED_IN) {
      throw new AppError('Booking not found or not checked in', 400, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);
    }

    logger.info(`Check-in time logged: ${bookingId}`);
    return {
      bookingId,
      language: booking.branch.merchant.preferred_language && localizationConstants.SUPPORTED_LANGUAGES.includes(booking.branch.merchant.preferred_language) ? booking.branch.merchant.preferred_language : localizationConstants.DEFAULT_LANGUAGE,
      action: mtablesConstants.AUDIT_TYPES.CHECK_IN_PROCESSED,
    };
  } catch (error) {
    logger.error(`logCheckInTime failed: ${error.message}`, { bookingId });
    throw error;
  }
}

module.exports = { processCheckIn, updateTableStatus, logCheckInTime };