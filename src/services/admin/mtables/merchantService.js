'use strict';

/**
 * Merchant Service for mtables (Admin)
 * Manages merchant onboarding, menu approvals, reservation policies, and branch performance.
 * Integrates with notification, socket, audit, point, and localization services.
 *
 * Last Updated: May 27, 2025
 */

const { Merchant, MerchantBranch, BranchMetrics, BranchInsights } = require('@models');
const merchantConstants = require('@constants/common/merchantConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils');
const { AppError } = require('@utils/AppError');

/**
 * Verifies and approves merchant setup for onboarding.
 * @param {number} merchantId - Merchant ID.
 * @returns {Promise<Object>} Onboarding approval status.
 */
async function approveMerchantOnboarding(merchantId) {
  try {
    if (!merchantId) {
      throw new AppError(
        'merchant_id required',
        400,
        merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError(
        'merchant not found',
        404,
        merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    if (merchant.status === merchantConstants.MERCHANT_STATUSES.ACTIVE) {
      throw new AppError(
        'merchant already active',
        400,
        merchantConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }

    // Verify compliance requirements
    const requiredDocs = merchantConstants.COMPLIANCE_CONSTANTS.REGULATORY_REQUIREMENTS;
    const missingDocs = Object.keys(requiredDocs).filter(
      doc => !merchant.compliance_data?.[requiredDocs[doc]]
    );
    if (missingDocs.length > 0) {
      throw new AppError(
        `missing compliance documents: ${missingDocs.join(', ')}`,
        400,
        merchantConstants.ERROR_CODES.COMPLIANCE_VIOLATION
      );
    }

    // Update merchant status
    await merchant.update({
      status: merchantConstants.MERCHANT_STATUSES.ACTIVE,
      updated_at: new Date(),
    });

    // Send notification
    await notificationService.sendNotification({
      userId: merchant.id.toString(),
      type: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.MERCHANT_ONBOARDING,
      messageKey: 'merchant.onboarding_approved',
      messageParams: { merchantId },
      role: 'merchant',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'merchant:onboarding_approved', {
      userId: merchant.id.toString(),
      role: 'merchant',
      merchantId,
    });

    // Log audit action
    await auditService.logAction({
      userId: 'admin',
      action: merchantConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ONBOARDING_APPROVED,
      details: { merchantId, status: 'active' },
      ipAddress: 'unknown',
    });

    logger.info('Merchant onboarding approved', { merchantId });
    return { merchantId, status: merchant.status };
  } catch (error) {
    logger.logErrorEvent(`approveMerchantOnboarding failed: ${error.message}`, { merchantId });
    throw error;
  }
}

/**
 * Approves or manages menu updates for a restaurant.
 * @param {number} restaurantId - Merchant Branch ID.
 * @param {Object} menuUpdates - Menu items to approve/update.
 * @returns {Promise<Object>} Updated menu status.
 */
async function manageMenus(restaurantId, menuUpdates) {
  try {
    if (!restaurantId || !menuUpdates) {
      throw new AppError(
        'restaurant_id and menu updates required',
        400,
        merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        'restaurant not found',
        404,
        merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    // Validate menu updates
    if (menuUpdates.items?.length > merchantConstants.MUNCH_CONSTANTS.MENU_SETTINGS.MAX_MENU_ITEMS) {
      throw new AppError(
        `menu exceeds max items: ${merchantConstants.MUNCH_CONSTANTS.MENU_SETTINGS.MAX_MENU_ITEMS}`,
        400,
        merchantConstants.ERROR_CODES.MENU_INVALID
      );
    }

    // Validate dietary filters
    const validFilters = merchantConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS;
    for (const item of menuUpdates.items || []) {
      if (item.dietaryFilters && !item.dietaryFilters.every(filter => validFilters.includes(filter))) {
        throw new AppError(
          'invalid dietary filters',
          400,
          merchantConstants.ERROR_CODES.MENU_INVALID
        );
      }
    }

    // Update menu
    await branch.update({
      menu_settings: {
        ...branch.menu_settings,
        items: menuUpdates.items,
        last_updated: new Date().toISOString(),
      },
    });

    // Send notification
    await notificationService.sendNotification({
      userId: branch.merchant_id.toString(),
      type: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROMOTION_UPDATE,
      messageKey: 'merchant.menu_updated',
      messageParams: { restaurantId },
      role: 'merchant',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'merchant:menu_updated', {
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      restaurantId,
    });

    // Log audit action
    await auditService.logAction({
      userId: branch.merchant_id.toString(),
      action: 'menu_updated',
      details: { restaurantId, itemCount: menuUpdates.items?.length || []0 },
      ipAddress: 'unknown',
    });

    logger.info('Menu updated', { restaurantId, itemCount: menuUpdates.items?.length || []0 });
    return { restaurantId, menuItems: menuUpdates.items?.length, itemCount: menuUpdates?.items?.length || []0 };
  } catch (error) {
    logger.logErrorEvent(`manageMenus failed: ${error.message}`, { restaurantId: restaurantId?.toString() });
    throw error;
  }
}

/**
 * Sets booking and reservation policies for a restaurant.
 * @param {number} restaurantId - Merchant Branch ID.
 * @param {Object} policies - Reservation policies.
 * @returns {Promise<Object>} Updated policies.
 */
async function configureReservationPolicies(restaurantId, policies) {
  try {
        if (!restaurantId || !policies) {
            throw new AppError(
                'restaurant_id and policies required',
                400,
                mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
            );
        }

        const branch = await MerchantBranch.findByPk(restaurantId);
        if (!branch) {
            throw new AppError(
                'restaurant not found',
                404,
                merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
            );
        }

        // Validate reservation policies
        const { 
            minBookingHours, 
            maxBookingHours, 
            cancellationWindowHours, 
            depositPercentage 
        } = policies;

        if (minBookingHours && minBookingHours < mtablesConstants.MTABLES_CONSTANTS.BOOKING_HOURS.MIN_BOOKING_HOURS) {
            throw new AppError(
                `minimum booking hours must be at least ${mtablesConstants.MTABLES_CONSTANTS.BOOKING_MIN_BOOKING_HOURS}`,
                400,
                mtablesConstants.ERROR_CODES.INVALID_BOOKING
            );
        }

        if (maxBookingHours && maxBookingHours > mtablesConstants.MTABLES_CONSTANTS.MAX_BOOKING_HOURS) {
            throw new AppError(
                `maximum booking hours must not exceed ${mtablesConstants.MTABLES.MTABLES_CONSTAX_BOOKING_HOURS}`,
                400,
                mtablesConstants.ERROR_CODES.INVALID_BOOKING
            );
        }

        if (cancellationWindowHours && cancellationWindowHours < 0) {
            throw new AppError(
                'cancellation window cannot be negative',
                400,
                mtablesConstants.ERROR_CODES.INVALID_BOOKING
            );
        }

        if (
            depositPercentage &&
            (depositPercentage < mtablesConstants.MTABLES_CONSTANTS.BOOKING_POLICIES.DEFAULT_DEPOSIT_PERCENTAGE ||
            depositPercentage > 100)
        ) {
            throw new AppError(
                `deposit percentage must be between ${mtablesConstants.MTABLES_CONSTANTS.BOOKING_POLICIES.DEFAULT_DEPOSIT_PERCENTAGE}% and 100}%`,
                400,
                mtablesConstants.ERROR_CODES.PAYMENT_FAILED
            );
        }

        // Update branch booking policies
        await branch.update({
            booking_metadata: {
                ...branch.booking_metadata,
                reservationPolicies: {
                    minBookingHours: minBookingHours || mtablesConstants.MTABLES_CONSTANTS.BOOKING_POLICIES.MIN_BOOKING_HOURS,
                    maxBookingHours: maxBookingHours || mtablesConstants.MTABLES_CONSTANTS.BOOKING_POLICIES.MAX_BOOKING_HOURS,
                    cancellationWindowHours: cancellationWindowHours || mtablesConstants.MTABLES_CONSTANTS.BOOKING_POLICIES.CANCELLATION_WINDOW_HOURS,
                    depositPercentage: depositPercentage || mtablesConstants.MTABLES_CONSTANTS.BOOKING_POLICIES.DEFAULT_DEPOSIT_PERCENTAGE,
                },
            },
        });

        // Send notification
        await notificationService.sendNotification({
            userId: branch.merchant_id.toString(),
            type: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
            messageKey: 'merchant.reservation_policies_updated',
            messageParams: { restaurantId },
            role: 'merchant',
            module: 'mtables',
        });

        // Emit socket event
        await socketService.emit(null, 'merchant:reservation_policies_updated', {
            userId: branch.merchant_id.toString(),
            role: 'merchant',
            restaurantId,
            policies,
        });

        // Log audit action
        await auditService.logAction({
            userId: branch.merchant_id.toString(),
            action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
            details: { restaurantId, policies },
            ipAddress: 'unknown',
        });

        logger.info('Reservation policies updated', { restaurantId, policies });
        return { restaurantId, policies };
    } catch (error) {
        logger.logErrorEvent(`configureReservationPolicies failed: ${error.message}`, { restaurantId });
        throw error;
    }
}

/**
 * Tracks performance metrics for merchant branches.
 * @param {number} merchantId - Merchant ID.
 * @returns {Promise<Object>} Branch performance metrics.
 */
async function monitorBranchPerformance(merchantId) {
  try {
    if (!merchantId) {
      throw new AppError(
        'merchant_id required',
        400,
        merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    const merchant = await Merchant.findByPk(merchantId, {
      include: [{ model: MerchantBranch, as: 'branches', include: [{ model: BranchMetrics, as: 'metrics' }, { model: BranchInsights, as: 'insights' }] }],
    });
    if (!merchant) {
      throw new AppError(
        'merchant not found',
        404,
        merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    // Aggregate performance metrics
    const performanceSummary = merchant.branches.map(branch => {
      const latestMetrics = branch.metrics?.[0] || {};
      const latestInsights = branch.insights?.[0] || {};

      return {
        branchId: branch.id,
        name: branch.name,
        revenue: latestMetrics.total_revenue || 0,
        orders: latestMetrics.total_orders || 0,
        averageOrderValue: latestMetrics.average_order_value || 0,
        customerRetention: latestInsights.metrics?.customerRetention || 0,
        sentiment: latestInsights.customer_sentiment || { positive: 0, neutral: 0, negative: 0 },
        performanceScores: latestInsights.performance_scores || { overall: 0, service: 0, quality: 0, timeliness: 0 },
      };
    });

    // Send notification
    await notificationService.sendNotification({
      userId: merchantId.toString(),
      type: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
      messageKey: 'merchant.performance_updated',
      messageParams: { merchantId },
      role: 'merchant',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'merchant:performance_updated', {
      userId: merchantId.toString(),
      role: 'merchant',
      merchantId,
      performanceSummary,
    });

    // Log audit action
    await auditService.logAction({
      userId: merchantId.toString(),
      action: merchantConstants.ANALYTICS_CONSTANTS.METRICS.SALES,
      details: { merchantId, branches: performanceSummary.length },
      ipAddress: 'unknown',
    });

    logger.info('Branch performance monitored', { merchantId, branches: performanceSummary.length });
    return { merchantId, performanceSummary };
  } catch (error) {
    logger.logErrorEvent(`monitorBranchPerformance failed: ${error.message}`, { merchantId });
    throw error;
  }
}

module.exports = {
  approveMerchantOnboarding,
  manageMenus,
  configureReservationPolicies,
  monitorBranchPerformance,
};