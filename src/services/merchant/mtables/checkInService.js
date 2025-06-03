'use strict';

/**
 * checkInService.js
 *
 * Centralized service for managing check-in operations in mtables for merchants, handling
 * QR code or manual check-ins, table status updates, check-in logging for gamification,
 * and customer support requests. Integrates with Sequelize models, notificationService,
 * socketService, auditService, pointService, and locationService for comprehensive
 * check-in operations.
 *
 * Dependencies:
 * - logger.js (custom logging)
 * - localizationService.js (message formatting)
 * - Sequelize models: Booking, Table, Customer, User, Merchant, MerchantBranch, Address
 * - notificationService.js (notifications)
 * - socketService.js (real-time updates)
 * - auditService.js (audit logging)
 * - pointService.js (gamification points)
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
const locationService = require('@services/common/locationService');
const { AppError } = require('@utils/AppError');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const merchantConstants = require('@constants/merchantConstants');

class CheckInService {
  /**
   * Handles QR code or manual check-ins.
   * @param {number} bookingId - Booking ID
   * @param {Object} checkInDetails - Check-in details (qrCode, method, coordinates, ipAddress)
   * @returns {Promise<Object>} Updated booking
   */
  async processCheckIn(bookingId, checkInDetails) {
    try {
      const { qrCode, method, coordinates, ipAddress } = checkInDetails;

      if (!bookingId || !method) {
        throw new AppError('Missing required fields', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      if (!Object.values(mtablesConstants.CHECK_IN_METHODS).includes(method)) {
        throw new AppError('Invalid check-in method', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Table, as: 'table', include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }, { model: Address, as: 'address' }] }] },
          { model: Customer, as: 'customer' },
        ],
      });
      if (!booking || booking.status !== mtablesConstants.BOOKING_STATUSES.CONFIRMED) {
        throw new AppError('Invalid booking for check-in', 400, mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      if (method === mtablesConstants.CHECK_IN_METHODS.QR_CODE && qrCode !== booking.check_in_code) {
        throw new AppError('Invalid QR code', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      // Validate and store check-in location
      if (coordinates?.lat && coordinates?.lng && booking.branch.address?.latitude && booking.branch.address?.longitude) {
        const resolvedLocation = await locationService.resolveLocation(coordinates, booking.customer.user_id);
        await locationService.storeAddress(resolvedLocation, booking.customer.user_id);
      }

      // Update booking status and check-in time
      await booking.update({
        status: mtablesConstants.BOOKING_STATUSES.CHECKED_IN,
        check_in_time: new Date(),
        updated_at: new Date(),
      });

      // Log audit
      await auditService.logAction({
        userId: booking.customer_id,
        role: 'customer',
        action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.CHECK_IN,
        details: { bookingId, method, tableId: booking.table_id, branchId: booking.branch_id },
        ipAddress: ipAddress || 'unknown',
      });

      // Send notification
      await notificationService.sendNotification({
        userId: booking.customer.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.CHECK_IN_REMINDER,
        messageKey: 'check_in.confirmed',
        messageParams: { bookingId, tableId: booking.table_id, branchId: booking.branch_id },
        role: 'customer',
        module: 'mtables',
        bookingId,
      });

      // Emit socket event
      await socketService.emit(null, 'booking:checked_in', {
        userId: booking.customer.user_id,
        role: 'customer',
        bookingId,
        tableId: booking.table_id,
        branchId: booking.branch_id,
        merchantId: booking.merchant_id,
      });

      logger.info('Check-in processed', { bookingId, method, customerId: booking.customer_id });
      return booking;
    } catch (error) {
      logger.logErrorEvent(`processCheckIn failed: ${error.message}`, { bookingId, checkInDetails });
      throw error;
    }
  }

  /**
   * Updates table availability status.
   * @param {number} tableId - Table ID
   * @param {string} status - New status (e.g., AVAILABLE, RESERVED)
   * @returns {Promise<Object>} Updated table
   */
  async updateTableStatus(tableId, status) {
    try {
      if (!tableId || !mtablesConstants.TABLE_STATUSES[status]) {
        throw new AppError('Invalid table ID or status', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      const table = await Table.findByPk(tableId, {
        include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }],
      });
      if (!table) {
        throw new AppError('Table not found', 404, mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE);
      }

      await table.update({ status, updated_at: new Date() });

      // Log audit
      await auditService.logAction({
        userId: table.branch.merchant_id,
        role: 'merchant',
        action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.TABLE_STATUS_UPDATED,
        details: { tableId, status, branchId: table.branch_id },
        ipAddress: 'unknown',
      });

      // Emit socket event
      await socketService.emit(null, 'table:status_updated', {
        userId: table.branch.merchant.user_id,
        role: 'merchant',
        tableId,
        status,
        branchId: table.branch_id,
        merchantId: table.branch.merchant_id,
      });

      logger.info('Table status updated', { tableId, status, branchId: table.branch_id });
      return table;
    } catch (error) {
      logger.logErrorEvent(`updateTableStatus failed: ${error.message}`, { tableId, status });
      throw error;
    }
  }

  /**
   * Logs check-in time for gamification.
   * @param {number} bookingId - Booking ID
   * @returns {Promise<Object>} Points record
   */
  async logCheckInTime(bookingId) {
    try {
      if (!bookingId) {
        throw new AppError('Booking ID required', 400, mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      const booking = await Booking.findByPk(bookingId, {
        include: [{ model: Customer, as: 'customer' }, { model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }],
      });
      if (!booking || booking.status !== mtablesConstants.BOOKING_STATUSES.CHECKED_IN) {
        throw new AppError('Booking not found or not checked in', 400, mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      const pointsRecord = await pointService.awardPoints({
        userId: booking.customer.user_id,
        role: 'customer',
        action: mtablesConstants.GAMIFICATION_ACTIONS.CHECK_IN.action,
        languageCode: booking.branch.merchant.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });

      // Log audit
      await auditService.logAction({
        userId: booking.customer_id,
        role: 'customer',
        action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.GAMIFICATION_POINTS_AWARDED,
        details: { bookingId, points: pointsRecord.points, action: mtablesConstants.GAMIFICATION_ACTIONS.CHECK_IN.action },
        ipAddress: 'unknown',
      });

      // Send notification
      await notificationService.sendNotification({
        userId: booking.customer.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'check_in.points_awarded',
        messageParams: { bookingId, points: pointsRecord.points },
        role: 'customer',
        module: 'mtables',
        bookingId,
      });

      // Emit socket event
      await socketService.emit(null, 'gamification:points_awarded', {
        userId: booking.customer.user_id,
        role: 'customer',
        bookingId,
        points: pointsRecord.points,
        action: mtablesConstants.GAMIFICATION_ACTIONS.CHECK_IN.action,
        merchantId: booking.merchant_id,
      });

      logger.info('Check-in points awarded', { bookingId, customerId: booking.customer_id, points: pointsRecord.points });
      return pointsRecord;
    } catch (error) {
      logger.logErrorEvent(`logCheckInTime failed: ${error.message}`, { bookingId });
      throw error;
    }
  }

  /**
   * Processes customer support requests during check-in.
   * @param {number} bookingId - Booking ID
   * @param {Object} request - Support request details (type, description, ipAddress)
   * @returns {Promise<Object>} Support request response
   */
  async handleSupportRequest(bookingId, request) {
    try {
      const { type, description, ipAddress } = request;

      if (!bookingId || !type || !description) {
        throw new AppError('Missing required fields', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      if (!mtablesConstants.SUPPORT_REQUEST_TYPES.includes(type)) {
        throw new AppError('Invalid support request type', 400, mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS);
      }

      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Customer, as: 'customer' },
          { model: Table, as: 'table', include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }],
          }],
      });
      if (!booking) {
        throw new AppError('Booking not found', 404, mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }

      // Assume a SupportRequest model or equivalent for logging requests
      const supportRequest = {
        booking_id: bookingId,
        customer_id: booking.customer_id,
        merchant_id: booking.merchant_id,
        branch_id: booking.branch_id,
        type,
        description,
        status: 'open',
        created_at: new Date(),
      };

      // Placeholder: Store support request (assumes a SupportRequest model or similar)
      // await sequelize.models.SupportRequest.create(supportRequest);
      // For now, log as audit action due to lack of SupportRequest model
      await auditService.logAction({
        userId: booking.customer_id,
        role: 'customer',
        action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.SUPPORT_REQUEST,
        details: { bookingId, type, description, branchId: booking.branch_id },
        ipAddress: ipAddress || 'unknown',
      });

      // Send notification to merchant
      await notificationService.sendNotification({
        userId: booking.branch.merchant.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.SUPPORT_REQUEST,
        messageKey: 'support.request_received',
        messageParams: { bookingId, type, branchId: booking.branch_id },
        role: 'merchant',
        module: 'mtables',
        bookingId,
      });

      // Send confirmation to customer
      await notificationService.sendNotification({
        userId: booking.customer.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.SUPPORT_REQUEST,
        messageKey: 'support.request_submitted',
        messageParams: { bookingId, type },
        role: 'customer',
        module: 'mtables',
        bookingId,
      });

      // Emit socket event
      await socketService.emit(null, 'support:request_received', {
        userId: booking.branch.merchant.user_id,
        role: 'merchant',
        bookingId,
        type,
        branchId: booking.branch_id,
        merchantId: booking.merchant_id,
      });

      logger.info('Support request processed', { bookingId, type, customerId: booking.customer_id, branchId: booking.branch_id });
      return supportRequest;
    } catch (error) {
      logger.logErrorEvent(`handleSupportRequest failed: ${error.message}`, { bookingId, request });
      throw error;
    }
  }
}

module.exports = new CheckInService();