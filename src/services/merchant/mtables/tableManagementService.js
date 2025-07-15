'use strict';

const { Op } = require('sequelize');
const { sequelize } = require('@models');
const { Booking, Customer, Table, TableLayoutSection, MerchantBranch, Staff, BookingPartyMember, BookingTimeSlot } = sequelize.models;
const mTablesConstants = require('@constants/common/mTablesConstants');
const staffConstants = require('@constants/staff/staffConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');

async function assignTable(bookingId, tableId, staffId = null) {
  const transaction = await sequelize.transaction();

  try {
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Customer, as: 'customer' },
        { model: MerchantBranch, as: 'branch' },
        { model: BookingPartyMember, as: 'partyMembers' },
      ],
      transaction,
    });
    if (!booking || !customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.includes(booking.status) || !['pending', 'confirmed'].includes(booking.status)) {
      throw new AppError('Booking not found or invalid status', 400, mTablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);
    }

    const table = await Table.findByPk(tableId, {
      include: [
        { model: TableLayoutSection, as: 'section' },
        { model: Staff, as: 'assignedStaff' },
      ],
      transaction,
    });
    if (!table || table.branch_id !== booking.branch_id || !mTablesConstants.TABLE_STATUSES.includes(table.status) || table.status !== mTablesConstants.TABLE_STATUSES[0]) {
      throw new AppError('Invalid table or branch mismatch', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    if (table.section && !table.section.is_active) {
      throw new AppError('Table section inactive', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    const timeSlot = await BookingTimeSlot.findOne({
      where: {
        branch_id: booking.branch_id,
        start_time: { [Op.lte]: booking.booking_time },
        end_time: { [Op.gte]: booking.booking_time },
        day_of_week: new Date(booking.booking_date).getDay(),
        is_active: true,
      },
      transaction,
    });
    if (!timeSlot || !mTablesConstants.TIME_SLOT_SETTINGS.SLOT_TYPES.includes(timeSlot.slot_type)) {
      throw new AppError('Invalid or unavailable time slot', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    const totalGuests = booking.guest_count || (booking.partyMembers ? booking.partyMembers.length + 1 : 1);
    if (totalGuests > timeSlot.max_party_size || totalGuests < timeSlot.min_party_size || totalGuests > mTablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY || totalGuests < mTablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY) {
      throw new AppError('Party size out of allowed range', 400, mTablesConstants.ERROR_TYPES.INVALID_PARTY_SIZE);
    }

    const conflictingBookings = await Booking.findAll({
      where: {
        table_id: tableId,
        status: { [Op.in]: ['confirmed', 'checked_in'] },
        booking_date: booking.booking_date,
        booking_time: { [Op.between]: [timeSlot.start_time, timeSlot.end_time] },
      },
      transaction,
    });
    if (conflictingBookings.length > 0) {
      throw new AppError('Table already booked', 400, mTablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
    }

    if (booking.seating_preference !== 'NO_PREFERENCE' && table.table_type !== booking.seating_preference) {
      throw new AppError('Table type does not match seating preference', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    let assignedStaffId = staffId || table.assigned_staff_id || table.section?.assigned_staff_id;
    if (assignedStaffId) {
      const staff = await Staff.findByPk(assignedStaffId, { transaction });
      if (!staff || !staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(staff.staff_types[0]) || staff.availability_status !== staffConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES[0]) {
        throw new AppError('Staff unavailable or invalid', 400, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
      }
      const requiredRoles = ['server', 'host', 'manager', 'front_of_house'];
      if (!staff.staff_types.some(type => requiredRoles.includes(type))) {
        throw new AppError('Staff role not suitable for table assignment', 400, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
      }
    }

    if (booking.partyMembers && booking.partyMembers.length > mTablesConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_BOOKING) {
      throw new AppError('Max party members exceeded', 400, customerConstants.ERROR_CODES.MAX_FRIENDS_EXCEEDED);
    }

    const currency = booking.branch?.currency || localizationConstants.DEFAULT_CURRENCY;
    if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
      throw new AppError('Unsupported currency', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    await booking.update(
      {
        table_id: tableId,
        staff_id: assignedStaffId,
        status: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[1], // confirmed
        updated_at: new Date(),
        booking_modified_at: new Date(),
        notification_status: mTablesConstants.NOTIFICATION_TYPES.TABLE_ASSIGNED,
      },
      { transaction },
    );

    await table.update({ status: mTablesConstants.TABLE_STATUSES[1] }, { transaction });

    await transaction.commit();
    logger.info('Table assigned', { bookingId, tableId, staffId: assignedStaffId, audit: mTablesConstants.AUDIT_TYPES.TABLE_ASSIGNED });
    return booking;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error assigning table', { error: error.message });
    throw error;
  }
}

async function adjustTable(bookingId, newTable) {
  const { tableId, extendDuration, staffId, ipAddress } = newTable;
  const transaction = await sequelize.transaction();

  try {
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Customer, as: 'customer' },
        { model: MerchantBranch, as: 'branch' },
        { model: Table, as: 'table' },
        { model: BookingPartyMember, as: 'partyMembers' },
        { model: Staff, as: 'staff' },
      ],
      transaction,
    });
    if (!booking || !['confirmed', 'checked_in'].includes(booking.status)) {
      throw new AppError('Booking not found or invalid status', 400, mTablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);
    }

    const timeSlot = await BookingTimeSlot.findOne({
      where: {
        branch_id: booking.branch_id,
        start_time: { [Op.lte]: booking.booking_time },
        end_time: { [Op.gte]: booking.booking_time },
        day_of_week: new Date(booking.booking_date).getDay(),
        is_active: true,
      },
      transaction,
    });
    if (!timeSlot || !mTablesConstants.TIME_SLOT_SETTINGS.SLOT_TYPES.includes(timeSlot.slot_type)) {
      throw new AppError('Invalid or unavailable time slot', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    let oldTable = null;
    let assignedStaffId = staffId || booking.staff_id;

    if (tableId) {
      const newTableRecord = await Table.findByPk(tableId, {
        include: [
          { model: TableLayoutSection, as: 'section' },
          { model: Staff, as: 'assignedStaff' },
        ],
        transaction,
      });
      if (!newTableRecord || newTableRecord.branch_id !== booking.branch_id || newTableRecord.status !== mTablesConstants.TABLE_STATUSES[0]) {
        throw new AppError('Invalid table or branch mismatch', 400, mTablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
      }

      if (newTableRecord.section && !newTableRecord.section.is_active) {
        throw new AppError('Table section inactive', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
      }

      const totalGuests = booking.guest_count || (booking.partyMembers ? booking.partyMembers.length + 1 : 1);
      if (totalGuests > timeSlot.max_party_size || totalGuests < timeSlot.min_party_size || totalGuests > mTablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY) {
        throw new AppError('Party size out of allowed range', 400, mTablesConstants.ERROR_TYPES.INVALID_PARTY_SIZE);
      }

      const conflictingBookings = await Booking.findAll({
        where: {
          table_id: tableId,
          status: { [Op.in]: ['confirmed', 'checked_in'] },
          booking_date: booking.booking_date,
          booking_time: { [Op.between]: [timeSlot.start_time, timeSlot.end_time] },
        },
        transaction,
      });
      if (conflictingBookings.length > 0) {
        throw new AppError('Table already booked', 400, mTablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
      }

      if (booking.seating_preference !== 'NO_PREFERENCE' && newTableRecord.table_type !== booking.seating_preference) {
        throw new AppError('Table type does not match seating preference', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
      }

      assignedStaffId = staffId || newTableRecord.assigned_staff_id || newTableRecord.section?.assigned_staff_id;
      if (assignedStaffId) {
        const staff = await Staff.findByPk(assignedStaffId, { transaction });
        if (!staff || !staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(staff.staff_types[0]) || staff.availability_status !== staffConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES[0]) {
          throw new AppError('Staff unavailable or invalid', 400, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
        }
        const requiredRoles = ['server', 'host', 'manager', 'front_of_house'];
        if (!staff.staff_types.some(type => requiredRoles.includes(type))) {
          throw new AppError('Staff role not suitable for table assignment', 400, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
        }
      }

      oldTable = booking.table;
      await booking.update(
        {
          table_id: tableId,
          staff_id: assignedStaffId,
          updated_at: new Date(),
          booking_modified_at: new Date(),
          notification_status: mTablesConstants.NOTIFICATION_TYPES.TABLE_ADJUSTED,
        },
        { transaction },
      );
      await newTableRecord.update({ status: mTablesConstants.TABLE_STATUSES[1] }, { transaction });
      if (oldTable) {
        await Table.update({ status: mTablesConstants.TABLE_STATUSES[0] }, { where: { id: oldTable.id }, transaction });
      }
    }

    if (extendDuration) {
      if (extendDuration > mTablesConstants.BOOKING_POLICIES.EXTENSION_LIMIT_MINUTES) {
        throw new AppError('Extension exceeds limit', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
      }

      const newEndTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
      newEndTime.setMinutes(newEndTime.getMinutes() + extendDuration);
      if (newEndTime > new Date(`${booking.booking_date}T${timeSlot.end_time}`)) {
        throw new AppError('Extension exceeds time slot', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
      }

      const conflictingBookings = await Booking.findAll({
        where: {
          table_id: tableId || booking.table_id,
          status: { [Op.in]: ['confirmed', 'checked_in'] },
          booking_date: booking.booking_date,
          booking_time: { [Op.between]: [booking.booking_time, newEndTime.toTimeString().slice(0, 8)] },
          id: { [Op.ne]: bookingId },
        },
        transaction,
      });
      if (conflictingBookings.length > 0) {
        throw new AppError('Table conflict with extension', 400, mTablesConstants.ERROR_TYPES.TABLE_NOT_AVAILABLE);
      }

      await booking.update(
        {
          duration: (booking.duration || 60) + extendDuration,
          updated_at: new Date(),
          booking_modified_at: new Date(),
          notification_status: mTablesConstants.NOTIFICATION_TYPES.TABLE_ADJUSTED,
        },
        { transaction },
      );
    }

    await transaction.commit();
    logger.info('Table adjusted', { bookingId, tableId, staffId: assignedStaffId, extendDuration, audit: mTablesConstants.AUDIT_TYPES.TABLE_ADJUSTED });
    return booking;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error adjusting table', { error: error.message });
    throw error;
  }
}

async function monitorTableAvailability(restaurantId) {
  const transaction = await sequelize.transaction();

  try {
    const branch = await MerchantBranch.findByPk(restaurantId, {
      include: [{ model: Merchant, as: 'merchant' }],
      transaction,
    });
    if (!branch || !merchantConstants.MERCHANT_TYPES.includes(branch.merchant?.business_type)) {
      throw new AppError('Invalid branch or merchant type', 404, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    const tables = await Table.findAll({
      where: {
        branch_id: restaurantId,
        status: mTablesConstants.TABLE_STATUSES[0],
        is_active: true,
      },
      include: [
        {
          model: TableLayoutSection,
          as: 'section',
          where: { is_active: true },
          required: false,
        },
        {
          model: Staff,
          as: 'assignedStaff',
          where: { availability_status: staffConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES[0] },
          required: false,
        },
      ],
      transaction,
    });

    const timeSlots = await BookingTimeSlot.findAll({
      where: {
        branch_id: restaurantId,
        is_active: true,
      },
      transaction,
    });

    const currency = branch.currency || localizationConstants.DEFAULT_CURRENCY;
    if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
      throw new AppError('Unsupported currency', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    const availabilityData = tables.map(table => ({
      tableId: table.id,
      tableNumber: table.table_number,
      capacity: table.capacity,
      tableType: table.table_type,
      section: table.section
        ? {
            name: table.section.name,
            locationType: table.section.location_type,
            floor: table.section.floor,
            assignedStaff: table.section.assigned_staff_id
              ? { id: table.section.assigned_staff_id }
              : null,
          }
        : null,
      assignedStaff: table.assignedStaff
        ? {
            id: table.assignedStaff.id,
            staffTypes: table.assignedStaff.staff_types,
            availabilityStatus: table.assignedStaff.availability_status,
          }
        : null,
      availableTimeSlots: timeSlots
        .filter(slot => slot.day_of_week === new Date().getDay() && mTablesConstants.TIME_SLOT_SETTINGS.SLOT_TYPES.includes(slot.slot_type))
        .map(slot => ({
          startTime: slot.start_time,
          endTime: slot.end_time,
          maxPartySize: slot.max_party_size,
          minPartySize: slot.min_party_size,
          slotType: slot.slot_type,
        })),
      currency,
    }));

    await transaction.commit();
    logger.info('Table availability monitored', { restaurantId, availableTables: tables.length, audit: mTablesConstants.AUDIT_TYPES.TABLE_AVAILABILITY_UPDATED });
    return availabilityData;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error monitoring table availability', { error: error.message });
    throw error;
  }
}

module.exports = { assignTable, adjustTable, monitorTableAvailability };