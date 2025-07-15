'use strict';

const { Op, sequelize } = require('sequelize');
const {
  Booking,
  BookingBlackoutDate,
  Customer,
  MerchantBranch,
  Table,
} = require('@models');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const adminServiceConstants = require('@constants/admin/adminServiceConstants');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');
const { AppError } = require('@utils/AppError');

async function monitorBookings(restaurantId) {
  try {
    if (!restaurantId) {
      throw new AppError(
        formatMessage('error.invalid_booking_details'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        formatMessage('error.restaurant_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const bookings = await Booking.findAll({
      where: {
        branch_id: restaurantId,
        booking_date: {
          [Op.gte]: new Date(),
        },
        status: {
          [Op.in]: [
            adminServiceConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.PENDING,
            adminServiceConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.CONFIRMED,
            adminServiceConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.CHECKED_IN,
          ],
        },
      },
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'user_id'] },
        { model: Table, as: 'table', attributes: ['id', 'table_number', 'status'] },
      ],
      order: [['booking_date', 'ASC'], ['booking_time', 'ASC']],
    });

    const blackoutDates = await BookingBlackoutDate.findAll({
      where: {
        branch_id: restaurantId,
        blackout_date: { [Op.gte]: new Date() },
      },
    });

    const summary = {
      totalActiveBookings: bookings.length,
      byStatus: bookings.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {}),
      upcomingBlackouts: blackoutDates.map(d => ({
        date: d.blackout_date,
        reason: d.reason,
        timeRange: d.start_time && d.end_time ? `${d.start_time}-${d.end_time}` : 'All Day',
      })),
    };

    logger.info('Bookings monitored', { restaurantId, totalActiveBookings: summary.totalActiveBookings });
    return summary;
  } catch (error) {
    logger.logErrorEvent(`monitorBookings failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

async function manageTableAdjustments(bookingId, reassignment, { pointService }) {
  try {
    if (!bookingId || !reassignment?.tableId) {
      throw new AppError(
        formatMessage('error.invalid_booking_details'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: MerchantBranch, as: 'branch' },
        { model: Table, as: 'table' },
      ],
    });
    if (!booking) {
      throw new AppError(
        formatMessage('error.booking_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const newTable = await Table.findByPk(reassignment.tableId);
    if (!newTable || newTable.branch_id !== booking.branch_id) {
      throw new AppError(
        formatMessage('error.invalid_table'),
        400,
        mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE
      );
    }

    if (newTable.status !== mtablesConstants.TABLE_STATUSES.AVAILABLE) {
      throw new AppError(
        formatMessage('error.table_not_available'),
        400,
        mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE
      );
    }

    if (booking.table) {
      await booking.table.update({ status: mtablesConstants.TABLE_STATUSES.AVAILABLE });
    }
    await newTable.update({ status: mtablesConstants.TABLE_STATUSES.RESERVED });

    await booking.update({
      table_id: newTable.id,
      party_notes: reassignment.reason
        ? `${booking.party_notes || ''} | Reassignment: ${reassignment.reason}`
        : booking.party_notes,
      booking_modified_at: new Date(),
    });

    await pointService.awardPoints({
      userId: booking.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.POINT_AWARD_ACTIONS.tableStatusUpdated,
      points: mtablesConstants.GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.points,
    });

    logger.info('Table reassigned', { bookingId, newTableId: newTable.id });
    return {
      bookingId: booking.id,
      tableNumber: newTable.table_number,
      status: booking.status,
    };
  } catch (error) {
    logger.logErrorEvent(`manageTableAdjustments failed: ${error.message}`, { bookingId });
    throw error;
  }
}

async function closeBookings(bookingId, { pointService }) {
  try {
    if (!bookingId) {
      throw new AppError(
        formatMessage('error.invalid_booking_details'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: MerchantBranch, as: 'branch' },
        { model: Table, as: 'table' },
        { model: Customer, as: 'customer', include: [{ model: sequelize.models.User, as: 'user' }] },
      ],
    });
    if (!booking) {
      throw new AppError(
        formatMessage('error.booking_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    if (booking.status === adminServiceConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.COMPLETED) {
      throw new AppError(
        formatMessage('error.booking_already_completed'),
        400,
        mtablesConstants.ERROR_CODES.BOOKING_UPDATE_FAILED
      );
    }

    await booking.update({
      status: adminServiceConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.COMPLETED,
      departed_at: new Date(),
      booking_modified_at: new Date(),
    });

    if (booking.table) {
      await booking.table.update({ status: mtablesConstants.TABLE_STATUSES.AVAILABLE });
    }

    const inDiningOrder = await sequelize.models.InDiningOrder.findOne({
      where: { table_id: booking.table_id, customer_id: booking.customer_id },
    });
    if (inDiningOrder && inDiningOrder.status !== 'closed') {
      await inDiningOrder.update({ status: 'closed' });
    }

    const actionConfig = mtablesConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.CHECK_IN;
    await pointService.awardPoints({
      userId: booking.customer.user_id.toString(),
      role: 'customer',
      action: actionConfig.action,
      points: actionConfig.points,
      metadata: { bookingId, branchId: booking.branch_id },
      expiresAt: new Date(Date.now() + mtablesConstants.GAMIFICATION_CONSTANTS.POINT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    await pointService.awardPoints({
      userId: booking.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.POINT_AWARD_ACTIONS.checkInProcessed,
      points: mtablesConstants.GAMIFICATION_CONSTANTS.STAFF_ACTIONS.CHECK_IN_LOG.points,
    });

    logger.info('Booking closed', { bookingId });
    return {
      bookingId: booking.id,
      status: booking.status,
      completedAt: booking.departed_at,
    };
  } catch (error) {
    logger.logErrorEvent(`closeBookings failed: ${error.message}`, { bookingId });
    throw error;
  }
}

module.exports = {
  monitorBookings,
  manageTableAdjustments,
  closeBookings,
};