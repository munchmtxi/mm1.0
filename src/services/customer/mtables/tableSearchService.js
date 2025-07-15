'use strict';

const { Op } = require('sequelize');
const {
  Table,
  MerchantBranch,
  Address,
  BookingTimeSlot,
  BookingBlackoutDate,
  Booking,
  TableLayoutSection,
} = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const dateTimeUtils = require('@utils/dateTimeUtils');

async function searchAvailableTables({ coordinates, radius, date, time, partySize, seatingPreference, transaction }) {
  if (!coordinates || !coordinates.lat || !coordinates.lng) {
    throw new Error(mtablesConstants.ERROR_TYPES[0]); // INVALID_INPUT
  }
  if (!dateTimeUtils.isValidDate(date)) {
    throw new Error(mtablesConstants.ERROR_TYPES[4]); // INVALID_BOOKING_DETAILS
  }
  if (partySize < mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY || partySize > mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY) {
    throw new Error(mtablesConstants.ERROR_TYPES[5]); // INVALID_PARTY_SIZE
  }
  if (seatingPreference && !mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES.includes(seatingPreference)) {
    throw new Error(mtablesConstants.ERROR_TYPES[0]); // INVALID_INPUT
  }

  const branches = await MerchantBranch.findAll({
    include: [{ model: Address, as: 'addressRecord' }],
    where: sequelize.where(
      sequelize.fn(
        'ST_DWithin',
        sequelize.col('addressRecord.location'),
        sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakePoint', coordinates.lng, coordinates.lat), 4326),
        radius
      ),
      true
    ),
    transaction,
  });

  const branchIds = branches.map(branch => branch.id);
  if (!branchIds.length) {
    return [];
  }

  const dayOfWeek = new Date(date).getDay();
  const timeSlots = await BookingTimeSlot.findAll({
    where: {
      branch_id: { [Op.in]: branchIds },
      day_of_week: dayOfWeek,
      start_time: { [Op.lte]: time },
      end_time: { [Op.gte]: time },
      is_active: true,
      min_party_size: { [Op.lte]: partySize },
      max_party_size: { [Op.gte]: partySize },
    },
    transaction,
  });

  if (!timeSlots.length) {
    return [];
  }

  const availableTables = await Table.findAll({
    where: {
      branch_id: { [Op.in]: branchIds },
      status: mtablesConstants.TABLE_STATUSES[0], // AVAILABLE
      capacity: { [Op.gte]: partySize },
      is_active: true,
    },
    include: [
      { model: MerchantBranch, as: 'branch', include: [{ model: Address, as: 'addressRecord' }] },
      {
        model: TableLayoutSection,
        as: 'section',
        where: seatingPreference && seatingPreference !== 'no_preference' ? { location_type: seatingPreference } : {},
        required: seatingPreference && seatingPreference !== 'no_preference',
      },
    ],
    transaction,
  });

  const blackoutDates = await BookingBlackoutDate.findAll({
    where: {
      branch_id: { [Op.in]: branchIds },
      blackout_date: date,
      is_recurring: false,
      [Op.or]: [{ start_time: null }, { start_time: { [Op.lte]: time }, end_time: { [Op.gte]: time } }],
    },
    transaction,
  });

  const bookedTables = await Booking.findAll({
    where: {
      branch_id: { [Op.in]: branchIds },
      booking_date: date,
      booking_time: time,
      status: { [Op.notIn]: [customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[4], customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[5]] },
    },
    transaction,
  });

  const blackoutBranchIds = blackoutDates.map(blackout => blackout.branch_id);
  const bookedTableIds = bookedTables.map(booking => booking.table_id);

  const filteredTables = availableTables.filter(
    table => !blackoutBranchIds.includes(table.branch_id) && !bookedTableIds.includes(table.id)
  );

  return filteredTables;
}

module.exports = {
  searchAvailableTables,
};