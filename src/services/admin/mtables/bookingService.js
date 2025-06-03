'use strict';

/**
 * Booking Service for mtables (Admin)
 * Manages booking monitoring, table adjustments, booking finalization, and gamification points.
 * Integrates with notification, socket, audit, point, and localization services.
 *
 * Last Updated: May 27, 2025
 */

const { Op, sequelize } = require('sequelize');
const {
  Booking,
  BookingTimeSlot,
  BookingBlackoutDate,
  Customer,
  MerchantBranch,
  Table,
} = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const adminServiceConstants = require('@constants/admin/adminServiceConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');
const { AppError } = require('@utils/AppError');

/**
 * Tracks real-time booking statuses for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @returns {Promise<Object>} Booking status summary.
 */
async function monitorBookings(restaurantId) {
  try {
    if (!restaurantId) {
      throw new AppError(
        'Restaurant ID required',
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        'Restaurant not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const bookings = await Booking.findAll({
      where: {
        branch_id: restaurantId,
        booking_date: {
          [Op.gte]: new Date(), // Future or current bookings
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

    // Emit socket event
    await socketService.emit(null, 'bookings:status_updated', {
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      restaurantId,
      summary,
    });

    // Log audit action
    await auditService.logAction({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, summary },
      ipAddress: 'unknown',
    });

    logger.info('Bookings monitored', { restaurantId, totalActiveBookings: summary.totalActiveBookings });
    return summary;
  } catch (error) {
    logger.logErrorEvent(`monitorBookings failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

/**
 * Handles table reassignments for a booking.
 * @param {number} bookingId - Booking ID.
 * @param {Object} reassignment - { tableId: number, reason: string }
 * @returns {Promise<Object>} Updated booking details.
 */
async function manageTableAdjustments(bookingId, reassignment) {
  try {
    if (!bookingId || !reassignment?.tableId) {
      throw new AppError(
        'Booking ID and table ID required',
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
        'Booking not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const newTable = await Table.findByPk(reassignment.tableId);
    if (!newTable || newTable.branch_id !== booking.branch_id) {
      throw new AppError(
        'Invalid or incompatible table',
        400,
        mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE
      );
    }

    if (newTable.status !== mtablesConstants.TABLE_STATUSES.AVAILABLE) {
      throw new AppError(
        'Table not available',
        400,
        mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE
      );
    }

    // Update table statuses
    if (booking.table) {
      await booking.table.update({ status: mtablesConstants.TABLE_STATUSES.AVAILABLE });
    }
    await newTable.update({ status: mtablesConstants.TABLE_STATUSES.RESERVED });

    // Update booking
    await booking.update({
      table_id: newTable.id,
      party_notes: reassignment.reason
        ? `${booking.party_notes || ''} | Reassignment: ${reassignment.reason}`
        : booking.party_notes,
      booking_modified_at: new Date(),
    });

    // Send notification
    await notificationService.sendNotification({
      userId: booking.customer_id.toString(),
      type: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'booking.table_reassigned',
      messageParams: { tableNumber: newTable.table_number, reason: reassignment.reason || 'N/A' },
      role: 'customer',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'booking:table_reassigned', {
      userId: booking.customer_id.toString(),
      role: 'customer',
      bookingId,
      newTable: { id: newTable.id, tableNumber: newTable.table_number },
    });

    // Log audit action
    await auditService.logAction({
      userId: booking.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { bookingId, newTableId: newTable.id, reason: reassignment.reason },
      ipAddress: 'unknown',
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

/**
 * Finalizes completed bookings.
 * @param {number} bookingId - Booking ID.
 * @returns {Promise<Object>} Finalized booking details.
 */
async function closeBookings(bookingId) {
  try {
    if (!bookingId) {
      throw new AppError(
        'Booking ID required',
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: MerchantBranch, as: 'branch' },
        { model: Table, as: 'table' },
        { model: Customer, as: 'customer' },
      ],
    });
    if (!booking) {
      throw new AppError(
        'Booking not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    if (booking.status === adminServiceConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.COMPLETED) {
      throw new AppError(
        'Booking already completed',
        400,
        mtablesConstants.ERROR_CODES.BOOKING_FAILED
      );
    }

    // Update booking status
    await booking.update({
      status: adminServiceConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.COMPLETED,
      departed_at: new Date(),
      booking_modified_at: new Date(),
    });

    // Update table status
    if (booking.table) {
      await booking.table.update({ status: mtablesConstants.TABLE_STATUSES.AVAILABLE });
    }

    // Check for associated in-dining orders
    const inDiningOrder = await sequelize.models.InDiningOrder.findOne({
      where: { table_id: booking.table_id, customer_id: booking.customer_id },
    });
    if (inDiningOrder && inDiningOrder.status !== 'closed') {
      await inDiningOrder.update({ status: 'closed' });
    }

    // Send notification
    await notificationService.sendNotification({
      userId: booking.customer_id.toString(),
      type: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'booking.completed',
      messageParams: { bookingId, date: booking.format_date() },
      role: 'customer',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'booking:completed', {
      userId: booking.customer_id.toString(),
      role: 'customer',
      bookingId,
    });

    // Log audit action
    await auditService.logAction({
      userId: booking.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { bookingId, status: 'completed' },
      ipAddress: 'unknown',
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

/**
 * Awards gamification points for a booking.
 * @param {number} customerId - Customer ID.
 * @param {number} bookingId - Booking ID.
 * @returns {Promise<Object>} Points awarded details.
 */
async function awardBookingPoints(customerId, bookingId) {
  try {
    if (!customerId || !bookingId) {
      throw new AppError(
        'Customer ID and booking ID required',
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const customer = await Customer.findByPk(customerId, {
      include: [{ model: sequelize.models.User, as: 'user' }],
    });
    if (!customer) {
      throw new AppError(
        'Customer not found',
        404,
        mtablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: MerchantBranch, as: 'branch' }],
    });
    if (!booking) {
      throw new AppError(
        'Booking not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const actionConfig = mtablesConstants.GAMIFICATION_ACTIONS.BOOKING_CREATED;
    if (!actionConfig || !actionConfig.roles.includes('customer')) {
      throw new AppError(
        'Invalid gamification action',
        400,
        mtablesConstants.ERROR_CODES.GAMIFICATION_POINTS_FAILED
      );
    }

    // Award points
    const pointsAwarded = await pointService.awardPoints({
      userId: customer.user_id,
      role: 'customer',
      action: actionConfig.action,
      points: actionConfig.points,
      metadata: { bookingId, branchId: booking.branch_id },
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
    });

    // Send notification
    await notificationService.sendNotification({
      userId: customer.user_id.toString(),
      type: mtablesConstants.NOTIFICATION_TYPES.BOOKING_CONFIRMATION,
      messageKey: 'gamification.points_awarded',
      messageParams: { points: actionConfig.points, action: actionConfig.name },
      role: 'customer',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'gamification:points_awarded', {
      userId: customer.user_id.toString(),
      role: 'customer',
      points: actionConfig.points,
      bookingId,
    });

    // Log audit action
    await auditService.logAction({
      userId: customer.user_id.toString(),
      role: 'customer',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_CREATED,
      details: { bookingId, points: actionConfig.points },
      ipAddress: 'unknown',
    });

    logger.info('Points awarded', { customerId, bookingId, points: actionConfig.points });
    return {
      customerId,
      bookingId,
      points: actionConfig.points,
      walletCredit: actionConfig.walletCredit,
    };
  } catch (error) {
    logger.logErrorEvent(`awardBookingPoints failed: ${error.message}`, { customerId, bookingId });
    throw error;
  }
}

module.exports = {
  monitorBookings,
  manageTableAdjustments,
  closeBookings,
  awardBookingPoints,
};