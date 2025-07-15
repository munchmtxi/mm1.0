'use strict';

const { sequelize } = require('sequelize');
const { MerchantBranch, Table, BookingTimeSlot } = require('@models');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const adminServiceConstants = require('@constants/admin/adminServiceConstants');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');
const { AppError } = require('@utils/AppError');

async function setTableRules(restaurantId, rules, { pointService }) {
  try {
    if (!restaurantId || !rules) {
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

    const { autoAssign = true, minCapacity, maxCapacity, preferredLocation } = rules;
    if (minCapacity && minCapacity < mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY) {
      throw new AppError(
        formatMessage('error.invalid_min_capacity', { min: mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY }),
        400,
        mtablesConstants.ERROR_CODES.INVALID_PARTY_SIZE
      );
    }
    if (maxCapacity && maxCapacity > mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY) {
      throw new AppError(
        formatMessage('error.invalid_max_capacity', { max: mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY }),
        400,
        mtablesConstants.ERROR_CODES.INVALID_PARTY_SIZE
      );
    }
    if (preferredLocation && !mtablesConstants.TABLE_MANAGEMENT.LOCATION_TYPES.includes(preferredLocation)) {
      throw new AppError(
        formatMessage('error.invalid_location_type'),
        400,
        mtablesConstants.ERROR_CODES.TABLE_NOT_AVAILABLE
      );
    }

    await BookingTimeSlot.update(
      {
        auto_assign_tables: autoAssign,
        min_party_size: minCapacity || mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY,
        max_party_size: maxCapacity || mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY,
      },
      { where: { branch_id: restaurantId } }
    );

    await pointService.awardPoints({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.POINT_AWARD_ACTIONS.settingsUpdated,
      points: mtablesConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.SETTINGS_UPDATE.points,
    });

    logger.info('Table rules updated', { restaurantId, rules });
    return { restaurantId, rules: { autoAssign, minCapacity, maxCapacity, preferredLocation } };
  } catch (error) {
    logger.logErrorEvent(`setTableRules failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

async function configureGamificationRules(restaurantId, gamificationRules, { pointService }) {
  try {
    if (!restaurantId || !gamificationRules) {
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

    for (const [action, config] of Object.entries(gamificationRules)) {
      if (!mtablesConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS[action] && !mtablesConstants.GAMIFICATION_CONSTANTS.STAFF_ACTIONS[action]) {
        throw new AppError(
          formatMessage('error.invalid_gamification_action', { action }),
          400,
          mtablesConstants.ERROR_CODES.GAMIFICATION_POINTS_FAILED
        );
      }
      if (config.points < 0 || config.walletCredit < 0) {
        throw new AppError(
          formatMessage('error.invalid_gamification_values'),
          400,
          mtablesConstants.ERROR_CODES.GAMIFICATION_POINTS_FAILED
        );
      }
    }

    await branch.update({
      booking_metadata: {
        ...branch.booking_metadata,
        gamificationRules,
      },
    });

    await pointService.awardPoints({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.POINT_AWARD_ACTIONS.settingsUpdated,
      points: mtablesConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.SETTINGS_UPDATE.points,
    });

    logger.info('Gamification rules updated', { restaurantId, gamificationRules });
    return { restaurantId, gamificationRules };
  } catch (error) {
    logger.logErrorEvent(`configureGamificationRules failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

async function updateWaitlistSettings(restaurantId, waitlistSettings, { pointService }) {
  try {
    if (!restaurantId || !waitlistSettings) {
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

    const { maxWaitlist, notificationInterval } = waitlistSettings;
    if (maxWaitlist && maxWaitlist > mtablesConstants.TABLE_MANAGEMENT.WAITLIST_LIMIT) {
      throw new AppError(
        formatMessage('error.max_waitlist_exceeded', { limit: mtablesConstants.TABLE_MANAGEMENT.WAITLIST_LIMIT }),
        400,
        mtablesConstants.ERROR_CODES.MAX_BOOKINGS_EXCEEDED
      );
    }
    if (notificationInterval && (notificationInterval < 5 || notificationInterval > 60)) {
      throw new AppError(
        formatMessage('error.invalid_notification_interval'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    await branch.update({
      booking_metadata: {
        ...branch.booking_metadata,
        waitlistSettings: {
          maxWaitlist: maxWaitlist || mtablesConstants.TABLE_MANAGEMENT.WAITLIST_LIMIT,
          notificationInterval: notificationInterval || 15,
        },
      },
    });

    await pointService.awardPoints({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.POINT_AWARD_ACTIONS.settingsUpdated,
      points: mtablesConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.SETTINGS_UPDATE.points,
    });

    logger.info('Waitlist settings updated', { restaurantId, waitlistSettings });
    return { restaurantId, waitlistSettings };
  } catch (error) {
    logger.logErrorEvent(`updateWaitlistSettings failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

async function configurePricingModels(restaurantId, pricingModels, { pointService }) {
  try {
    if (!restaurantId || !pricingModels) {
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

    const { depositPercentage, serviceFee } = pricingModels;
    if (
      depositPercentage &&
      (depositPercentage < mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE ||
        depositPercentage > mtablesConstants.BOOKING_POLICIES.MAX_DEPOSIT_PERCENTAGE)
    ) {
      throw new AppError(
        formatMessage('error.invalid_deposit_percentage', {
          min: mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE,
          max: mtablesConstants.BOOKING_POLICIES.MAX_DEPOSIT_PERCENTAGE,
        }),
        400,
        mtablesConstants.ERROR_CODES.PAYMENT_FAILED
      );
    }
    if (serviceFee && (serviceFee < 0 || serviceFee > 100)) {
      throw new AppError(
        formatMessage('error.invalid_service_fee'),
        400,
        mtablesConstants.ERROR_CODES.PAYMENT_FAILED
      );
    }

    await branch.update({
      booking_metadata: {
        ...branch.booking_metadata,
        pricingModels: {
          depositPercentage: depositPercentage || mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE,
          serviceFee: serviceFee || 0,
        },
      },
    });

    await pointService.awardPoints({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.POINT_AWARD_ACTIONS.settingsUpdated,
      points: mtablesConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.SETTINGS_UPDATE.points,
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