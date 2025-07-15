'use strict';

const { Merchant, MerchantBranch, BranchMetrics, BranchInsights } = require('@models');
const merchantConstants = require('@constants/merchantConstants');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');
const { AppError } = require('@utils/AppError');

async function approveMerchantOnboarding(merchantId) {
  try {
    if (!merchantId) {
      throw new AppError(
        formatMessage('error.merchant_id_required'),
        400,
        merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError(
        formatMessage('error.merchant_not_found'),
        404,
        merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    if (merchant.status === merchantConstants.MERCHANT_STATUSES.ACTIVE) {
      throw new AppError(
        formatMessage('error.merchant_already_active'),
        400,
        merchantConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }

    const requiredDocs = merchantConstants.COMPLIANCE_CONSTANTS.REGULATORY_REQUIREMENTS;
    const missingDocs = Object.keys(requiredDocs).filter(
      doc => !merchant.compliance_data?.[requiredDocs[doc]]
    );
    if (missingDocs.length > 0) {
      throw new AppError(
        formatMessage('error.missing_compliance_documents', { docs: missingDocs.join(', ') }),
        400,
        merchantConstants.ERROR_CODES.COMPLIANCE_VIOLATION
      );
    }

    await merchant.update({
      status: merchantConstants.MERCHANT_STATUSES.ACTIVE,
      updated_at: new Date(),
    });

    logger.info('Merchant onboarding approved', { merchantId });
    return { merchantId, status: merchant.status };
  } catch (error) {
    logger.logErrorEvent(`approveMerchantOnboarding failed: ${error.message}`, { merchantId });
    throw error;
  }
}

async function manageMenus(restaurantId, menuUpdates) {
  try {
    if (!restaurantId || !menuUpdates) {
      throw new AppError(
        formatMessage('error.restaurant_id_menu_required'),
        400,
        merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        formatMessage('error.restaurant_not_found'),
        404,
        merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    if (menuUpdates.items?.length > merchantConstants.MENU_SETTINGS.MAX_MENU_ITEMS) {
      throw new AppError(
        formatMessage('error.menu_exceeds_max_items', { max: merchantConstants.MENU_SETTINGS.MAX_MENU_ITEMS }),
        400,
        merchantConstants.ERROR_CODES.MENU_INVALID
      );
    }

    const validFilters = merchantConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS;
    for (const item of menuUpdates.items || []) {
      if (item.dietaryFilters && !item.dietaryFilters.every(filter => validFilters.includes(filter))) {
        throw new AppError(
          formatMessage('error.invalid_dietary_filters'),
          400,
          merchantConstants.ERROR_CODES.MENU_INVALID
        );
      }
    }

    await branch.update({
      menu_settings: {
        ...branch.menu_settings,
        items: menuUpdates.items,
        last_updated: new Date().toISOString(),
      },
    });

    logger.info('Menu updated', { restaurantId, itemCount: menuUpdates.items?.length || 0 });
    return { restaurantId, menuItems: menuUpdates.items?.length || 0, itemCount: menuUpdates.items?.length || 0 };
  } catch (error) {
    logger.logErrorEvent(`manageMenus failed: ${error.message}`, { restaurantId: restaurantId?.toString() });
    throw error;
  }
}

async function configureReservationPolicies(restaurantId, policies) {
  try {
    if (!restaurantId || !policies) {
      throw new AppError(
        formatMessage('error.restaurant_id_policies_required'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        formatMessage('error.restaurant_not_found'),
        404,
        merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    const { minBookingHours, maxBookingHours, cancellationWindowHours, depositPercentage } = policies;

    if (minBookingHours && minBookingHours < mtablesConstants.BOOKING_HOURS.MIN_BOOKING_HOURS) {
      throw new AppError(
        formatMessage('error.min_booking_hours', { min: mtablesConstants.BOOKING_HOURS.MIN_BOOKING_HOURS }),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING
      );
    }

    if (maxBookingHours && maxBookingHours > mtablesConstants.BOOKING_HOURS.MAX_BOOKING_HOURS) {
      throw new AppError(
        formatMessage('error.max_booking_hours', { max: mtablesConstants.BOOKING_HOURS.MAX_BOOKING_HOURS }),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING
      );
    }

    if (cancellationWindowHours && cancellationWindowHours < 0) {
      throw new AppError(
        formatMessage('error.negative_cancellation_window'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING
      );
    }

    if (
      depositPercentage &&
      (depositPercentage < mtablesConstants.BOOKING_POLICIES.DEFAULT_DEPOSIT_PERCENTAGE || depositPercentage > 100)
    ) {
      throw new AppError(
        formatMessage('error.invalid_deposit_percentage', {
          min: mtablesConstants.BOOKING_POLICIES.DEFAULT_DEPOSIT_PERCENTAGE,
        }),
        400,
        mtablesConstants.ERROR_CODES.PAYMENT_FAILED
      );
    }

    await branch.update({
      booking_metadata: {
        ...branch.booking_metadata,
        reservationPolicies: {
          minBookingHours: minBookingHours || mtablesConstants.BOOKING_HOURS.MIN_BOOKING_HOURS,
          maxBookingHours: maxBookingHours || mtablesConstants.BOOKING_HOURS.MAX_BOOKING_HOURS,
          cancellationWindowHours: cancellationWindowHours || mtablesConstants.BOOKING_POLICIES.CANCELLATION_WINDOW_HOURS,
          depositPercentage: depositPercentage || mtablesConstants.BOOKING_POLICIES.DEFAULT_DEPOSIT_PERCENTAGE,
        },
      },
    });

    logger.info('Reservation policies updated', { restaurantId, policies });
    return { restaurantId, policies };
  } catch (error) {
    logger.logErrorEvent(`configureReservationPolicies failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

async function monitorBranchPerformance(merchantId) {
  try {
    if (!merchantId) {
      throw new AppError(
        formatMessage('error.merchant_id_required'),
        400,
        merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    const merchant = await Merchant.findByPk(merchantId, {
      include: [{ model: MerchantBranch, as: 'branches', include: [{ model: BranchMetrics, as: 'metrics' }, { model: BranchInsights, as: 'insights' }] }],
    });
    if (!merchant) {
      throw new AppError(
        formatMessage('error.merchant_not_found'),
        404,
        merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

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