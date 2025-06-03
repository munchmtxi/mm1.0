'use strict';

/**
 * Configuration Service for mtables (Admin)
 * Manages table assignment policies, gamification rules, waitlist settings, and pricing models.
 * Integrates with notification, socket, audit, point, and localization services.
 *
 * Last Updated: May 27, 2025
 */

const { sequelize } = require('sequelize');
const { MerchantBranch, Table, BookingTimeSlot } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const adminServiceConstants = require('@constants/admin/adminServiceConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');
const { AppError } = require('@utils/AppError');

/**
 * Defines table assignment policies for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {Object} rules - Table assignment rules (e.g., autoAssign, minCapacity).
 * @returns {Promise<Object>} Updated table rules.
 */
async function setTableRules(restaurantId, rules) {
  try {
    if (!restaurantId || !rules) {
      throw new AppError(
        'Restaurant ID and rules required',
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

    // Validate rules
    const { autoAssign = true, minCapacity, maxCapacity, preferredLocation } = rules;
    if (minCapacity && (minCapacity < mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY)) {
      throw new AppError(
        `Minimum capacity must be at least ${mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY}`,
        400,
        mtablesConstants.ERROR_CODES.INVALID_PARTY_SIZE
      );
    }
    if (maxCapacity && (maxCapacity > mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY)) {
      throw new AppError(
        `Maximum capacity cannot exceed ${mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY}`,
        400,
        mtablesConstants.ERROR_CODES.INVALID_PARTY_SIZE
      );
    }
    if (preferredLocation && !mtablesConstants.TABLE_MANAGEMENT.LOCATION_TYPES.includes(preferredLocation)) {
      throw new AppError(
        'Invalid location type',
        400,
        mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE
      );
    }

    // Update time slot settings
    await BookingTimeSlot.update(
      {
        auto_assign_tables: autoAssign,
        min_party_size: minCapacity || mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY,
        max_party_size: maxCapacity || mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY,
      },
      { where: { branch_id: restaurantId } }
    );

    // Send notification
    await notificationService.sendNotification({
      userId: branch.merchant_id.toString(),
      type: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'configuration.table_rules_updated',
      messageParams: { restaurantId, autoAssign },
      role: 'merchant',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'configuration:table_rules_updated', {
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      restaurantId,
      rules: { autoAssign, minCapacity, maxCapacity, preferredLocation },
    });

    // Log audit action
    await auditService.logAction({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, rules },
      ipAddress: 'unknown',
    });

    logger.info('Table rules updated', { restaurantId, rules });
    return { restaurantId, rules: { autoAssign, minCapacity, maxCapacity, preferredLocation } };
  } catch (error) {
    logger.logErrorEvent(`setTableRules failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

/**
 * Sets gamification point values for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {Object} gamificationRules - Point values for actions.
 * @returns {Promise<Object>} Updated gamification rules.
 */
async function configureGamificationRules(restaurantId, gamificationRules) {
  try {
    if (!restaurantId || !gamificationRules) {
      throw new AppError(
        'Restaurant ID and gamification rules required',
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

    // Validate gamification rules
    for (const [action, config] of Object.entries(gamificationRules)) {
      if (!mtablesConstants.GAMIFICATION_ACTIONS[action]) {
        throw new AppError(
          `Invalid gamification action: ${action}`,
          400,
          mtablesConstants.ERROR_CODES.GAMIFICATION_POINTS_FAILED
        );
      }
      if (config.points < 0 || config.walletCredit < 0) {
        throw new AppError(
          'Points and wallet credit must be non-negative',
          400,
          mtablesConstants.ERROR_CODES.GAMIFICATION_POINTS_FAILED
        );
      }
    }

    // Store gamification rules in branch metadata
    await branch.update({
      booking_metadata: {
        ...branch.booking_metadata,
        gamificationRules,
      },
    });

    // Send notification
    await notificationService.sendNotification({
      userId: branch.merchant_id.toString(),
      type: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'configuration.gamification_updated',
      messageParams: { restaurantId },
      role: 'merchant',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'configuration:gamification_updated', {
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      restaurantId,
      gamificationRules,
    });

    // Log audit action
    await auditService.logAction({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, gamificationRules },
      ipAddress: 'unknown',
    });

    logger.info('Gamification rules updated', { restaurantId, gamificationRules });
    return { restaurantId, gamificationRules };
  } catch (error) {
    logger.logErrorEvent(`configureGamificationRules failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

/**
 * Adjusts waitlist policies for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {Object} waitlistSettings - Waitlist settings (e.g., maxWaitlist, notificationInterval).
 * @returns {Promise<Object>} Updated waitlist settings.
 */
async function updateWaitlistSettings(restaurantId, waitlistSettings) {
  try {
    if (!restaurantId || !waitlistSettings) {
      throw new AppError(
        'Restaurant ID and waitlist settings required',
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

    // Validate waitlist settings
    const { maxWaitlist, notificationInterval } = waitlistSettings;
    if (maxWaitlist && (maxWaitlist > mtablesConstants.TABLE_MANAGEMENT.WAITLIST_LIMIT)) {
      throw new AppError(
        `Waitlist limit cannot exceed ${mtablesConstants.TABLE_MANAGEMENT.WAITLIST_LIMIT}`,
        400,
        mtablesConstants.ERROR_CODES.MAX_BOOKINGS_EXCEEDED
      );
    }
    if (notificationInterval && (notificationInterval < 5 || notificationInterval > 60)) {
      throw new AppError(
        'Notification interval must be between 5 and 60 minutes',
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    // Update branch metadata with waitlist settings
    await branch.update({
      booking_metadata: {
        ...branch.booking_metadata,
        waitlistSettings: {
          maxWaitlist: maxWaitlist || mtablesConstants.TABLE_MANAGEMENT.WAITLIST_LIMIT,
          notificationInterval: notificationInterval || 15,
        },
      },
    });

    // Send notification
    await notificationService.sendNotification({
      userId: branch.merchant_id.toString(),
      type: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'configuration.waitlist_updated',
      messageParams: { restaurantId, maxWaitlist },
      role: 'merchant',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'configuration:waitlist_updated', {
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      restaurantId,
      waitlistSettings,
    });

    // Log audit action
    await auditService.logAction({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, waitlistSettings },
      ipAddress: 'unknown',
    });

    logger.info('Waitlist settings updated', { restaurantId, waitlistSettings });
    return { restaurantId, waitlistSettings };
  } catch (error) {
    logger.logErrorEvent(`updateWaitlistSettings failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

/**
 * Sets deposit and service fee models for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {Object} pricingModels - Pricing configurations (e.g., depositPercentage, serviceFee).
 * @returns {Promise<Object>} Updated pricing models.
 */
async function configurePricingModels(restaurantId, pricingModels) {
  try {
    if (!restaurantId || !pricingModels) {
      throw new AppError(
        'Restaurant ID and pricing models required',
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

    // Validate pricing models
    const { depositPercentage, serviceFee } = pricingModels;
    if (
      depositPercentage &&
      (depositPercentage < mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE ||
        depositPercentage > mtablesConstants.BOOKING_POLICIES.MAX_DEPOSIT_PERCENTAGE)
    ) {
      throw new AppError(
        `Deposit percentage must be between ${mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE}% and ${mtablesConstants.BOOKING_POLICIES.MAX_DEPOSIT_PERCENTAGE}%`,
        400,
        mtablesConstants.ERROR_CODES.PAYMENT_FAILED
      );
    }
    if (serviceFee && (serviceFee < 0 || serviceFee > 100)) {
      throw new AppError(
        'Service fee must be between 0 and 100',
        400,
        mtablesConstants.ERROR_CODES.PAYMENT_FAILED
      );
    }

    // Update branch metadata with pricing models
    await branch.update({
      booking_metadata: {
        ...branch.booking_metadata,
        pricingModels: {
          depositPercentage: depositPercentage || mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE,
          serviceFee: serviceFee || 0,
        },
      },
    });

    // Send notification
    await notificationService.sendNotification({
      userId: branch.merchant_id.toString(),
      type: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'configuration.pricing_updated',
      messageParams: { restaurantId, depositPercentage },
      role: 'merchant',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'configuration:pricing_updated', {
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      restaurantId,
      pricingModels,
    });

    // Log audit action
    await auditService.logAction({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, pricingModels },
      ipAddress: 'unknown',
    });

    logger.info('Pricing models updated', { restaurantId, pricingModels });
    return { restaurantId, pricingModels };
  } catch (error) {
    logger.logErrorEvent(`configurePricingModels failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

module.exports = {
  setTableRules,
  configureGamificationRules,
  updateWaitlistSettings,
  configurePricingModels,
};