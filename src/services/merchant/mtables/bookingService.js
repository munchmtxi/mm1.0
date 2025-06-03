'use strict';

/**
 * bookingService.js
 *
 * Centralized service for managing table reservations in mtables for merchants, handling
 * reservation creation, waitlist management, booking policies, and reservation updates.
 * Integrates with Sequelize models, notificationService, socketService, auditService,
 * pointService, walletService, and locationService for comprehensive booking operations.
 *
 * Dependencies:
 * - logger.js (custom logging)
 * - localizationService.js (message formatting)
 * - Sequelize models: Booking, Table, Customer, User, Merchant, MerchantBranch, Address
 * - notificationService.js (notifications)
 * - socketService.js (real-time updates)
 * - auditService.js (audit logging)
 * - pointService.js (gamification points)
 * - walletService.js (payment processing)
 * - locationService.js (location resolution)
 * - merchantConstants.js (merchant-related constants)
 * - customerConstants.js (customer-related constants)
 * - mtablesConstants.js (mtables-specific constants)
 *
 * Last Updated: May 20, 2025
 */

const { Op, sequelize } = require('sequelize');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localizationService');
const { Booking, Table, Customer, User, Merchant, MerchantBranch, Address } = require('@models');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const walletService = require('@services/common/walletService');
const locationService = require('@services/common/locationService');
const { AppError } = require('@utils/AppError');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const merchantConstants = require('@constants/merchantConstants');

class BookingService {
  /**
   * Creates a table reservation with an optional deposit.
   * @param {number} bookingId - Booking ID
   * @param {number} customerId - Customer ID
   * @param {Object} details - Reservation details (branchId, tableId, guestCount, date, time, seatingPreference, dietaryFilters, paymentMethodId, depositAmount, ipAddress, coordinates)
   * @returns {Promise<Object>} Created booking
   */
  async createReservation(bookingId, customerId, details) {
    try {
      const {
        branchId,
        tableId,
        guestCount,
        date,
        time,
        seatingPreference,
        dietaryFilters,
        paymentMethodId,
        depositAmount,
        ipAddress,
        coordinates,
      } = details;

      // Validate required fields
      if (!bookingId || !customerId || !branchId || !tableId || !guestCount || !date || !time) {
        throw new AppError('Missing required fields', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      // Validate guest count
      if (guestCount < mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY ||
          guestCount > mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY) {
        throw new AppError('Invalid party size', 400, mtablesConstants.ERROR_CODES.INVALID_PARTY_SIZE);
      }

      // Validate seating preference
      if (seatingPreference && !mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES.includes(seatingPreference)) {
        throw new AppError('Invalid seating preference', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      // Validate dietary filters
      if (dietaryFilters && !dietaryFilters.every(filter =>
          mtablesConstants.PRE_ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(filter))) {
        throw new AppError('Invalid dietary preferences', 400, customerConstants.ERROR_CODES.INVALID_DIETARY_FILTER);
      }

      // Validate customer
      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
      }

      // Check max active bookings
      const activeBookings = await Booking.count({
        where: {
          customer_id: customerId,
          status: {
            [Op.in]: [
              mtablesConstants.BOOKING_STATUSES.PENDING,
              mtablesConstants.BOOKING_STATUSES.CONFIRMED,
              mtablesConstants.BOOKING_STATUSES.CHECKED_IN,
            ],
          },
        },
      });
      if (activeBookings >= customerConstants.CUSTOMER_SETTINGS.MAX_ACTIVE_BOOKINGS) {
        throw new AppError('Maximum bookings reached', 400, mtablesConstants.ERROR_CODES.MAX_BOOKINGS_EXCEEDED);
      }

      // Validate table and branch
      const table = await Table.findByPk(tableId, {
        include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }, { model: Address, as: 'address' }] }],
      });
      if (!table || table.branch_id !== branchId || table.status !== mtablesConstants.TABLE_STATUSES.AVAILABLE) {
        throw new AppError('Table not available', 400, mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE);
      }
      if (guestCount > table.capacity) {
        throw new AppError('Party size exceeds table capacity', 400, mtablesConstants.ERROR_CODES.INVALID_PARTY_SIZE);
      }

      // Validate location
      if (coordinates?.lat && coordinates?.lng && table.branch.address?.latitude && table.branch.address?.longitude) {
        await locationService.resolveLocation(coordinates, customer.user_id);
      }

      // Validate booking time and date
      const bookingDateTime = new Date(`${date}T${time}`);
      if (isNaN(bookingDateTime)) {
        throw new AppError('Invalid date or time', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      // Check for conflicting bookings
      const conflictingBooking = await Booking.findOne({
        where: {
          table_id: tableId,
          booking_date: date,
          booking_time: time,
          status: {
            [Op.notIn]: [mtablesConstants.BOOKING_STATUSES.CANCELLED, mtablesConstants.BOOKING_STATUSES.COMPLETED],
          },
        },
      });
      if (conflictingBooking) {
        throw new AppError('Table already booked', 400, mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE);
      }

      // Process deposit if provided
      let transaction = null;
      if (depositAmount && paymentMethodId) {
        if (depositAmount < mtablesConstants.FINANCIAL_SETTINGS.MIN_DEPOSIT_AMOUNT ||
            depositAmount > mtablesConstants.FINANCIAL_SETTINGS.MAX_DEPOSIT_AMOUNT) {
          throw new AppError('Invalid deposit amount', 400, mtablesConstants.ERROR_CODES.PAYMENT_FAILED);
        }
        const wallet = await sequelize.models.Wallet.findOne({ where: { user_id: customer.user_id } });
        if (!wallet) {
          throw new AppError('Wallet not found', 404, mtablesConstants.ERROR_CODES.PAYMENT_FAILED);
        }
        transaction = await walletService.processTransaction(wallet.id, {
          type: mtablesConstants.FINANCIAL_SETTINGS.DEPOSIT_TRANSACTION_TYPE,
          amount: depositAmount,
          currency: table.branch.merchant.currency,
          paymentMethodId,
        });
      }

      // Create booking
      const reference = `BK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const checkInCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const booking = await Booking.create({
        id: bookingId,
        customer_id: customerId,
        merchant_id: table.branch.merchant_id,
        branch_id: branchId,
        table_id: tableId,
        reference,
        check_in_code: checkInCode,
        booking_date: date,
        booking_time: time,
        booking_type: mtablesConstants.BOOKING_TYPES.TABLE,
        guest_count: guestCount,
        seating_preference: seatingPreference || mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES[0],
        details: { dietaryFilters, depositTransactionId: transaction?.id },
        status: mtablesConstants.BOOKING_STATUSES.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Update table status
      await table.update({ status: mtablesConstants.TABLE_STATUSES.RESERVED });

      // Award gamification points
      await pointService.awardPoints({
        userId: customer.user_id,
        role: 'customer',
        action: mtablesConstants.GAMIFICATION_ACTIONS.BOOKING_CREATED.action,
        languageCode: table.branch.merchant.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });

      // Send notifications
      await notificationService.sendNotification({
        userId: customer.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_CONFIRMATION,
        messageKey: 'booking.created',
        messageParams: { bookingId, tableId, branchId, date, time },
        role: 'customer',
        module: 'mtables',
        bookingId,
      });

      // Emit socket event
      await socketService.emit(null, 'booking:created', {
        userId: customer.user_id,
        role: 'customer',
        bookingId,
        tableId,
        branchId,
        merchantId: table.branch.merchant_id,
      });

      // Log audit
      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_CREATED,
        details: { bookingId, branchId, tableId, guestCount, date, time, depositAmount: depositAmount || 0 },
        ipAddress: ipAddress || 'unknown',
      });

      logger.info('Reservation created', { bookingId, customerId, branchId, tableId });
      return booking;
    } catch (error) {
      logger.logErrorEvent(`createReservation failed: ${error.message}`, { bookingId, customerId, details });
      throw error;
    }
  }

  /**
   * Manages waitlist for a branch.
   * @param {number} branchId - Merchant branch ID
   * @param {number} customerId - Customer ID
   * @returns {Promise<Object>} Waitlist status
   */
  async manageWaitlist(branchId, customerId) {
    try {
      if (!branchId || !customerId) {
        throw new AppError('Missing required fields', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
      }

      const branch = await MerchantBranch.findByPk(branchId, {
        include: [{ model: Merchant, as: 'merchant' }],
      });
      if (!branch) {
        throw new AppError('Branch not found', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      // Check existing waitlist entry
      const waitlistEntry = await Booking.findOne({
        where: {
          branch_id: branchId,
          customer_id: customerId,
          status: mtablesConstants.BOOKING_STATUSES.PENDING,
          table_id: null,
        },
      });

      if (waitlistEntry) {
        return { status: 'already_waitlisted', waitlistId: waitlistEntry.id };
      }

      // Create waitlist entry
      const waitlistBooking = await Booking.create({
        customer_id: customerId,
        merchant_id: branch.merchant_id,
        branch_id: branchId,
        reference: `WL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: mtablesConstants.BOOKING_STATUSES.PENDING,
        booking_date: new Date(),
        booking_type: mtablesConstants.BOOKING_TYPES.TABLE,
      });

      // Send notification
      await notificationService.sendNotification({
        userId: customer.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_CONFIRMATION,
        messageKey: 'waitlist.added',
        messageParams: { branchId },
        role: 'customer',
        module: 'mtables',
        bookingId: waitlistBooking.id,
      });

      // Emit socket event
      await socketService.emit(null, 'waitlist:added', {
        userId: customer.user_id,
        role: 'customer',
        waitlistId: waitlistBooking.id,
        branchId,
        merchantId: branch.merchant_id,
      });

      // Log audit
      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.WAITLIST_RESOLUTION,
        details: { branchId, waitlistId: waitlistBooking.id },
        ipAddress: 'unknown',
      });

      logger.info('Waitlist entry created', { waitlistId: waitlistBooking.id, customerId, branchId });
      return { status: 'added', waitlistId: waitlistBooking.id };
    } catch (error) {
      logger.logErrorEvent(`manageWaitlist failed: ${error.message}`, { branchId, customerId });
      throw error;
    }
  }

  /**
   * Defines cancellation and deposit rules for a merchant.
   * @param {number} merchantId - Merchant ID
   * @param {Object} policies - Booking policies (cancellationWindowHours, depositPercentage)
   * @returns {Promise<Object>} Updated policies
   */
  async setBookingPolicies(merchantId, policies) {
    try {
      const { cancellationWindowHours, depositPercentage } = policies;

      if (!merchantId) {
        throw new AppError('Merchant ID required', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      if (cancellationWindowHours < 0 ||
          depositPercentage < mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE) {
        throw new AppError('Invalid policy values', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) {
        throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const updatedPolicies = {
        cancellation_window_hours: cancellationWindowHours || mtablesConstants.BOOKING_POLICIES.CANCELLATION_WINDOW_HOURS,
        deposit_percentage: depositPercentage || mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE,
      };

      await merchant.update({
        booking_policies: updatedPolicies,
      });

      // Log audit
      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
        details: { merchantId, policies: updatedPolicies },
        ipAddress: 'unknown',
      });

      // Emit socket event
      await socketService.emit(null, 'booking:policies_updated', {
        userId: merchant.user_id,
        role: 'merchant',
        merchantId,
        policies: updatedPolicies,
      });

      logger.info('Booking policies updated', { merchantId, policies: updatedPolicies });
      return updatedPolicies;
    } catch (error) {
      logger.logErrorEvent(`setBookingPolicies failed: ${error.message}`, { merchantId, policies });
      throw error;
    }
  }

  /**
   * Modifies an existing reservation.
   * @param {number} bookingId - Booking ID
   * @param {Object} updates - Updates (guestCount, date, time, seatingPreference, dietaryFilters, ipAddress)
   * @returns {Promise<Object>} Updated booking
   */
  async updateReservation(bookingId, updates) {
    try {
      const { guestCount, date, time, seatingPreference, dietaryFilters, ipAddress } = updates;

      if (!bookingId) {
        throw new AppError('Booking ID required', 400, mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Table, as: 'table', include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }] },
          { model: Customer, as: 'customer' },
        ],
      });
      if (!booking || booking.status === mtablesConstants.BOOKING_STATUSES.CANCELLED) {
        throw new AppError('Booking not found or cancelled', 404, mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      if (booking.status !== mtablesConstants.BOOKING_STATUSES.PENDING) {
        throw new AppError('Cannot update non-pending booking', 400, mtablesConstants.ERROR_CODES.CANCELLATION_WINDOW_EXPIRED);
      }

      if (guestCount && (guestCount < mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY ||
          guestCount > mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY)) {
        throw new AppError('Invalid party size', 400, mtablesConstants.ERROR_CODES.INVALID_PARTY_SIZE);
      }

      if (seatingPreference && !mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES.includes(seatingPreference)) {
        throw new AppError('Invalid seating preference', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      if (dietaryFilters && !dietaryFilters.every(filter =>
          mtablesConstants.PRE_ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(filter))) {
        throw new AppError('Invalid dietary preferences', 400, customerConstants.ERROR_CODES.INVALID_DIETARY_FILTER);
      }

      // Validate new table if guest count or seating preference changes
      let newTable = booking.table;
      if (guestCount || seatingPreference) {
        newTable = await Table.findOne({
          where: {
            branch_id: booking.branch_id,
            status: mtablesConstants.TABLE_STATUSES.AVAILABLE,
            capacity: { [Op.gte]: guestCount || booking.guest_count },
            ...(seatingPreference && { location_type: seatingPreference }),
          },
        });
        if (!newTable) {
          throw new AppError('No suitable table available', 400, mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE);
        }

        await booking.table.update({ status: mtablesConstants.TABLE_STATUSES.AVAILABLE });
        await newTable.update({ status: mtablesConstants.TABLE_STATUSES.RESERVED });
      }

      // Validate new date/time
      if (date || time) {
        const newDate = date || booking.booking_date;
        const newTime = time || booking.booking_time;
        const bookingDateTime = new Date(`${newDate}T${newTime}`);
        if (isNaN(bookingDateTime)) {
          throw new AppError('Invalid date or time', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
        }

        const conflictingBooking = await Booking.findOne({
          where: {
            table_id: newTable.id,
            booking_date: newDate,
            booking_time: newTime,
            id: { [Op.ne]: bookingId },
            status: {
              [Op.notIn]: [mtablesConstants.BOOKING_STATUSES.CANCELLED, mtablesConstants.BOOKING_STATUSES.COMPLETED],
            },
          },
        });
        if (conflictingBooking) {
          throw new AppError('Table not available', 400, mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE);
        }
      }

      // Update booking
      const updatedBooking = await booking.update({
        guest_count: guestCount || booking.guest_count,
        booking_date: date || booking.booking_date,
        booking_time: time || booking.booking_time,
        seating_preference: seatingPreference || booking.seating_preference,
        details: { ...booking.details, dietaryFilters: dietaryFilters || booking.details?.dietaryFilters },
        table_id: newTable.id,
        booking_modified_at: new Date(),
        updated_at: new Date(),
      });

      // Send notification
      await notificationService.sendNotification({
        userId: booking.customer.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
        messageKey: 'booking.updated',
        messageParams: {
          bookingId,
          tableId: updatedBooking.table_id,
          branchId: updatedBooking.branch_id,
          date: updatedBooking.booking_date,
          time: updatedBooking.booking_time,
        },
        role: 'customer',
        module: 'mtables',
        bookingId,
      });

      // Emit socket event
      await socketService.emit(null, 'booking:updated', {
        userId: booking.customer.user_id,
        role: 'customer',
        bookingId,
        tableId: updatedBooking.table_id,
        branchId: updatedBooking.branch_id,
        merchantId: booking.merchant_id,
      });

      // Log audit
      await auditService.logAction({
        userId: booking.customer_id,
        role: 'customer',
        action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
        details: { bookingId, updates },
        ipAddress: ipAddress || 'unknown',
      });

      logger.info('Reservation updated', { bookingId, updates });
      return updatedBooking;
    } catch (error) {
      logger.logErrorEvent(`updateReservation failed: ${error.message}`, { bookingId, updates });
      throw error;
    }
  }
}

module.exports = new BookingService();