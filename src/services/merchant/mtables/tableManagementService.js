'use strict';

/**
 * Table Management Service (Merchant Side)
 * Manages merchant-side table operations, including assigning tables, adjusting bookings,
 * tracking gamification points, and monitoring table availability. Integrates with Booking,
 * Customer, Table, TableLayoutSection, MerchantBranch, Staff, and GamificationPoints models,
 * and uses notification, audit, socket, and point services.
 *
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const { Booking, Customer, Table, TableLayoutSection, MerchantBranch, Staff, GamificationPoints } = require('@models');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const mTablesConstants = require('@constants/mTablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const gamificationConstants = require('@constants/gamificationConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');

class TableManagementService {
  /**
   * Assigns a table to a booking based on preferences
   * @param {number} bookingId - Booking ID
   * @param {number} tableId - Table ID
   * @returns {Promise<Object>} Updated booking record
   */
  static async assignTable(bookingId, tableId) {
    const transaction = await sequelize.transaction();

    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Customer, as: 'customer' },
          { model: MerchantBranch, as: 'branch' },
        ],
        transaction,
      });
      if (!booking || ![mTablesConstants.BOOKING_STATUSES.CONFIRMED, mTablesConstants.BOOKING_STATUSES.PENDING].includes(booking.status)) {
        throw new AppError('Invalid or unconfirmed booking', 400, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      const table = await Table.findByPk(tableId, {
        include: [{ model: TableLayoutSection, as: 'section' }],
        transaction,
      });
      if (!table || table.branch_id !== booking.branch_id || table.status !== 'available') {
        throw new AppError('Table unavailable or invalid', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      if (table.section && !table.section.is_active) {
        throw new AppError('Table section is inactive', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      // Check for conflicting bookings
      const conflictingBookings = await Booking.findAll({
        where: {
          table_id: tableId,
          status: { [Op.in]: [mTablesConstants.BOOKING_STATUSES.CONFIRMED, mTablesConstants.BOOKING_STATUSES.SEATED] },
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
        },
        transaction,
      });
      if (conflictingBookings.length > 0) {
        throw new AppError('Table already booked for this time', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      // Validate preferences (e.g., capacity, location)
      if (booking.preferences?.party_size && table.capacity < booking.preferences.party_size) {
        throw new AppError('Table capacity insufficient', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }
      if (booking.preferences?.location_type && table.section?.location_type !== booking.preferences.location_type) {
        throw new AppError('Table location does not match preferences', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      await booking.update({
        table_id: tableId,
        status: mTablesConstants.BOOKING_STATUSES.CONFIRMED,
        updated_at: new Date(),
      }, { transaction });

      await table.update({ status: 'occupied' }, { transaction });

      await notificationService.sendNotification({
        userId: booking.customer.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.TABLE_ASSIGNED,
        messageKey: 'table.assigned',
        messageParams: { tableNumber: table.table_number },
        role: 'customer',
        module: 'mtables',
        bookingId,
      });

      await auditService.logAction({
        userId: booking.customer.user_id,
        role: 'customer',
        action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.TABLE_ASSIGNED,
        details: { bookingId, tableId },
        ipAddress: 'unknown',
      }, { transaction });

      await socketService.emit(null, 'table:assigned', {
        userId: booking.customer.user_id,
        role: 'customer',
        bookingId,
        tableId,
      });

      await transaction.commit();
      logger.info('Table assigned', { bookingId, tableId });
      return booking;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error assigning table', { error: error.message });
      throw error;
    }
  }

  /**
   * Adjusts table assignment or extends booking duration
   * @param {number} bookingId - Booking ID
   * @param {Object} newTable - New table details { tableId, extendDuration, ipAddress }
   * @returns {Promise<Object>} Updated booking record
   */
  static async adjustTable(bookingId, newTable) {
    const { tableId, extendDuration, ipAddress } = newTable;
    const transaction = await sequelize.transaction();

    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Customer, as: 'customer' },
          { model: MerchantBranch, as: 'branch' },
          { model: Table, as: 'table' },
        ],
        transaction,
      });
      if (!booking || ![mTablesConstants.BOOKING_STATUSES.CONFIRMED, mTablesConstants.BOOKING_STATUSES.SEATED].includes(booking.status)) {
        throw new AppError('Invalid or unconfirmed booking', 400, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      let oldTable = null;
      if (tableId) {
        const newTableRecord = await Table.findByPk(tableId, {
          include: [{ model: TableLayoutSection, as: 'section' }],
          transaction,
        });
        if (!newTableRecord || newTableRecord.branch_id !== booking.branch_id || newTableRecord.status !== 'available') {
          throw new AppError('New table unavailable or invalid', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
        }

        if (newTableRecord.section && !newTableRecord.section.is_active) {
          throw new AppError('New table section is inactive', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
        }

        // Check for conflicting bookings
        const conflictingBookings = await Booking.findAll({
          where: {
            table_id: tableId,
            status: { [Op.in]: [mTablesConstants.BOOKING_STATUSES.CONFIRMED, mTablesConstants.BOOKING_STATUSES.SEATED] },
            booking_date: booking.booking_date,
            booking_time: booking.booking_time,
          },
          transaction,
        });
        if (conflictingBookings.length > 0) {
          throw new AppError('New table already booked for this time', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
        }

        // Validate preferences
        if (booking.preferences?.party_size && newTableRecord.capacity < booking.preferences.party_size) {
          throw new AppError('New table capacity insufficient', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
        }
        if (booking.preferences?.location_type && newTableRecord.section?.location_type !== booking.preferences.location_type) {
          throw new AppError('New table location does not match preferences', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
        }

        oldTable = booking.table;
        await booking.update({ table_id: tableId, updated_at: new Date() }, { transaction });
        await newTableRecord.update({ status: 'occupied' }, { transaction });
        if (oldTable) {
          await Table.update({ status: 'available' }, { where: { id: oldTable.id }, transaction });
        }
      }

      if (extendDuration) {
        const newEndTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
        newEndTime.setMinutes(newEndTime.getMinutes() + extendDuration);
        if (newEndTime > new Date(booking.booking_date + 'T23:59:59')) {
          throw new AppError('Extension exceeds operating hours', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
        }

        // Check for conflicts with extended time
        const conflictingBookings = await Booking.findAll({
          where: {
            table_id: tableId || booking.table_id,
            status: { [Op.in]: [mTablesConstants.BOOKING_STATUSES.CONFIRMED, mTablesConstants.BOOKING_STATUSES.SEATED] },
            booking_date: booking.booking_date,
            booking_time: { [Op.between]: [booking.booking_time, newEndTime.toTimeString().slice(0, 8)] },
            id: { [Op.ne]: bookingId },
          },
          transaction,
        });
        if (conflictingBookings.length > 0) {
          throw new AppError('Extension conflicts with other bookings', 400, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
        }

        await booking.update({ duration: (booking.duration || 60) + extendDuration, updated_at: new Date() }, { transaction });
      }

      await notificationService.sendNotification({
        userId: booking.customer.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.TABLE_ADJUSTED,
        messageKey: 'table.adjusted',
        messageParams: { tableNumber: tableId ? (await Table.findByPk(tableId)).table_number : booking.table.table_number },
        role: 'customer',
        module: 'mtables',
        bookingId,
      });

      await auditService.logAction({
        userId: booking.customer.user_id,
        role: 'customer',
        action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.TABLE_ADJUSTED,
        details: { bookingId, tableId, extendDuration },
        ipAddress: ipAddress || 'unknown',
      }, { transaction });

      await socketService.emit(null, 'table:adjusted', {
        userId: booking.customer.user_id,
        role: 'customer',
        bookingId,
        tableId,
      });

      await transaction.commit();
      logger.info('Table adjusted', { bookingId, tableId, extendDuration });
      return booking;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error adjusting table', { error: error.message });
      throw error;
    }
  }

  /**
   * Tracks gamification points for table adjustments
   * @param {number} customerId - Customer ID
   * @returns {Promise<Object>} Points record
   */
  static async trackTableGamification(customerId) {
    const transaction = await sequelize.transaction();

    try {
      if (!customerId) {
        throw new AppError('Customer ID required', 400, mTablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID);
      }

      const customer = await Customer.findByPk(customerId, { transaction });
      if (!customer) {
        throw new AppError('Customer not found', 404, mTablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID);
      }

      const gamificationAction = gamificationConstants.CUSTOMER_ACTIONS.TABLE_ADJUSTMENT;
      const pointsRecord = await pointService.awardPoints({
        userId: customer.user_id,
        role: 'customer',
        action: gamificationAction.action,
        languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      }, { transaction });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + gamificationConstants.POINTS_EXPIRY_DAYS);
      const gamification = await GamificationPoints.create({
        user_id: customer.user_id,
        role: 'customer',
        action: gamificationAction.action,
        points: pointsRecord.points,
        metadata: { customerId },
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction });

      await notificationService.sendNotification({
        userId: customer.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.POINTS_AWARDED,
        messageKey: 'points.awarded',
        messageParams: { points: pointsRecord.points, action: gamificationAction.action },
        role: 'customer',
        module: 'mtables',
      });

      await socketService.emit(null, 'points:awarded', {
        userId: customer.user_id,
        role: 'customer',
        points: pointsRecord.points,
      });

      await auditService.logAction({
        userId: customer.user_id,
        role: 'customer',
        action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.POINTS_AWARDED,
        details: { customerId, points: pointsRecord.points, action: gamificationAction.action },
        ipAddress: 'unknown',
      }, { transaction });

      await transaction.commit();
      logger.info('Table gamification points awarded', { customerId, points: pointsRecord.points });
      return gamification;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error tracking table gamification', { error: error.message });
      throw error;
    }
  }

  /**
   * Monitors real-time table availability for a restaurant
   * @param {number} restaurantId - Merchant branch ID
   * @returns {Promise<Array>} List of available tables
   */
  static async monitorTableAvailability(restaurantId) {
    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError('Restaurant not found', 404, mTablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
    }

    const tables = await Table.findAll({
      where: {
        branch_id: restaurantId,
        status: 'available',
      },
      include: [{
        model: TableLayoutSection,
        as: 'section',
        where: { is_active: true },
        required: false,
      }],
    });

    const availabilityData = tables.map(table => ({
      tableId: table.id,
      tableNumber: table.table_number,
      capacity: table.capacity,
      section: table.section ? {
        name: table.section.name,
        locationType: table.section.location_type,
        floor: table.section.floor,
      } : null,
    }));

    await socketService.emit(null, 'table:availability', {
      restaurantId,
      tables: availabilityData,
    });

    logger.info('Table availability monitored', { restaurantId, availableTables: tables.length });
    return availabilityData;
  }
}

module.exports = TableManagementService;