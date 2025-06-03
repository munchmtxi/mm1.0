'use strict';

/**
 * Customer Profile Service (Admin)
 * Manages customer profile operations for admin use, including creation, updates, localization,
 * dietary preferences, gamification points, and wallet settings, aligned with the Customer model.
 */

const { Customer, User, Address, Notification, GamificationPoints } = require('@models');
const walletService = require('@services/common/walletService');
const pointService = require('@services/common/gamification/pointService');
const mapService = require('@services/common/mapService');
const notificationService = require('@services/common/notificationService');
const verificationService = require('@services/common/verificationService');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const socketService = require('@services/common/socketService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization/localization');
const validation = require('@utils/validation');
const { USER_MANAGEMENT_CONSTANTS, SUCCESS_MESSAGES } = require('@constants/admin/adminCoreConstants');
const catchAsync = require('@utils/catchAsync');

/**
 * Creates a new customer profile.
 * @param {Object} customerData - Customer data.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Created customer object.
 */
const createCustomer = catchAsync(async (customerData, io) => {
  const requiredFields = ['user_id', 'phone_number', 'address', 'country'];
  validation.validateRequiredFields(customerData, requiredFields);

  await validation.validatePhoneNumber(customerData.phone_number);

  const user = await User.findByPk(customerData.user_id);
  if (!user || user.role !== USER_MANAGEMENT_CONSTANTS.USER_TYPES.CUSTOMER) {
    throw new AppError('Invalid or non-customer user', 400, 'INVALID_USER');
  }

  const customer = await Customer.create({
    ...customerData,
    preferences: customerData.preferences || { dietary: [] },
    created_at: new Date(),
    updated_at: new Date(),
  });

  await auditService.logAction({
    action: 'CREATE_CUSTOMER',
    userId: customer.user_id,
    details: `Customer profile created for user_id: ${customer.user_id}`,
  });

  const message = formatMessage('customer', 'profile', customerData.preferred_language || 'en', 'profile.created', {
    name: user.full_name || 'Customer',
  });

  await notificationService.sendNotification({
    userId: customer.user_id,
    type: 'profile_created',
    message,
  });

  try {
    socketService.emit(io, 'customer:profile:created', {
      userId: customer.user_id,
      role: 'customer',
      message,
      details: `Customer profile created for user_id: ${customer.user_id}`,
      logType: 'PROFILE_CREATED',
    }, `user:${customer.user_id}`);
    socketService.emit(io, 'customer:profile:created', {
      userId: customer.user_id,
      role: 'customer',
      message: `New customer profile created for ${user.full_name || 'Customer'}`,
      details: `Customer profile created for user_id: ${customer.user_id}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in createCustomer', {
      error: error.message,
      userId: customer.user_id,
    });
  }

  logger.info('Customer created successfully', { customerId: customer.id });
  return customer;
});

/**
 * Updates customer profile information.
 * @param {string} userId - Customer user ID.
 * @param {Object} profileData - Updated profile data.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated customer object.
 */
const updateProfile = catchAsync(async (userId, profileData, io) => {
  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  if (profileData.phone_number) {
    await validation.validatePhoneNumber(profileData.phone_number);
  }

  const sanitizedData = await securityService.sanitizeInput(profileData);
  await customer.update(sanitizedData);

  await auditService.logAction({
    action: 'UPDATE_CUSTOMER_PROFILE',
    userId,
    details: `Customer profile updated for user_id: ${userId}`,
  });

  const message = formatMessage('customer', 'profile', customer.preferences?.preferred_language || 'en', 'profile.updated', {
    name: (await User.findByPk(userId))?.full_name || 'Customer',
  });

  await notificationService.sendNotification({
    userId,
    type: 'profile_updated',
    message,
  });

  try {
    socketService.emit(io, 'customer:profile:updated', {
      userId,
      role: 'customer',
      message,
      details: `Customer profile updated for user_id: ${userId}`,
      logType: 'PROFILE_UPDATED',
    }, `user:${userId}`);
    socketService.emit(io, 'customer:profile:updated', {
      userId,
      role: 'customer',
      message: `Customer profile updated for ${userId}`,
      details: `Customer profile updated for user_id: ${userId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in updateProfile', {
      error: error.message,
      userId,
    });
  }

  logger.info('Customer profile updated', { userId });
  return customer;
});

/**
 * Configures customer country-specific settings.
 * @param {string} userId - Customer user ID.
 * @param {string} countryCode - ISO country code.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated customer object.
 */
const setCountry = catchAsync(async (userId, countryCode, io) => {
  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  const supportedCountries = Object.keys(USER_MANAGEMENT_CONSTANTS.ADMIN_SETTINGS.SUPPORTED_CITIES);
  if (!supportedCountries.includes(countryCode)) {
    throw new AppError('Unsupported country code', 400, 'INVALID_COUNTRY_CODE');
  }

  const currency = USER_MANAGEMENT_CONSTANTS.ADMIN_SETTINGS.SUPPORTED_CURRENCIES.find((c) => c === countryCode) || 'USD';
  const mapProvider = USER_MANAGEMENT_CONSTANTS.ADMIN_SETTINGS.SUPPORTED_MAP_PROVIDERS[countryCode] || 'google_maps';

  await customer.update({
    country: countryCode,
    preferences: {
      ...customer.preferences,
      currency,
      map_provider: mapProvider,
    },
  });

  await mapService.configureMapProvider(userId, mapProvider);

  await auditService.logAction({
    action: 'SET_CUSTOMER_COUNTRY',
    userId,
    details: `Country set to ${countryCode} for user_id: ${userId}`,
  });

  const message = formatMessage('customer', 'profile', customer.preferences?.preferred_language || 'en', 'profile.country_updated', {
    country: countryCode,
  });

  await notificationService.sendNotification({
    userId,
    type: 'country_updated',
    message,
  });

  try {
    socketService.emit(io, 'customer:profile:country_updated', {
      userId,
      role: 'customer',
      message,
      details: `Country set to ${countryCode} for user_id: ${userId}`,
    }, `user:${userId}`);
    socketService.emit(io, 'customer:profile:country_updated', {
      userId,
      role: 'customer',
      message: `Customer country set to ${countryCode} for ${userId}`,
      details: `Country set to ${countryCode} for user_id: ${userId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in setCountry', {
      error: error.message,
      userId,
    });
  }

  logger.info('Customer country settings updated', { userId, countryCode });
  return customer;
});

/**
 * Overrides UI language for customer interfaces.
 * @param {string} userId - Customer user ID.
 * @param {string} languageCode - ISO 639-1 language code.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated customer object.
 */
const setLanguage = catchAsync(async (userId, languageCode, io) => {
  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  const supportedLanguages = USER_MANAGEMENT_CONSTANTS.ADMIN_SETTINGS.SUPPORTED_LANGUAGES;
  if (!supportedLanguages.includes(languageCode)) {
    throw new AppError('Unsupported language code', 400, 'INVALID_LANGUAGE_CODE');
  }

  await customer.update({
    preferences: {
      ...customer.preferences,
      preferred_language: languageCode,
    },
  });

  await auditService.logAction({
    action: 'SET_CUSTOMER_LANGUAGE',
    userId,
    details: `Language set to ${languageCode} for user_id: ${userId}`,
  });

  const message = formatMessage('customer', 'profile', languageCode, 'profile.language_updated');

  await notificationService.sendNotification({
    userId,
    type: 'language_updated',
    message,
  });

  try {
    socketService.emit(io, 'customer:profile:language_updated', {
      userId,
      role: 'customer',
      message,
      details: `Language set to ${languageCode} for user_id: ${userId}`,
    }, `user:${userId}`);
    socketService.emit(io, 'customer:profile:language_updated', {
      userId,
      role: 'customer',
      message: `Customer language set to ${languageCode} for ${userId}`,
      details: `Language set to ${languageCode} for user_id: ${userId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in setLanguage', {
      error: error.message,
      userId,
    });
  }

  logger.info('Customer language updated', { userId, languageCode });
  return customer;
});

/**
 * Saves dietary preferences or allergies.
 * @param {string} userId - Customer user ID.
 * @param {Array<string>} preferences - Dietary preferences.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated customer object.
 */
const setDietaryPreferences = catchAsync(async (userId, preferences, io) => {
  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  if (!Array.isArray(preferences)) {
    throw new AppError('Dietary preferences must be an array', 400, 'INVALID_PREFERENCES');
  }

  await customer.update({
    preferences: {
      ...customer.preferences,
      dietary: preferences,
    },
  });

  await auditService.logAction({
    action: 'SET_DIETARY_PREFERENCES',
    userId,
    details: `Dietary preferences updated for user_id: ${userId}`,
  });

  const message = formatMessage('customer', 'profile', customer.preferences?.preferred_language || 'en', 'profile.dietary_updated');

  await notificationService.sendNotification({
    userId,
    type: 'dietary_updated',
    message,
  });

  try {
    socketService.emit(io, 'customer:profile:dietary_updated', {
      userId,
      role: 'customer',
      message,
      details: `Dietary preferences updated for user_id: ${userId}`,
    }, `user:${userId}`);
    socketService.emit(io, 'customer:profile:dietary_updated', {
      userId,
      role: 'customer',
      message: `Customer dietary preferences updated for ${userId}`,
      details: `Dietary preferences updated for user_id: ${userId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in setDietaryPreferences', {
      error: error.message,
      userId,
    });
  }

  logger.info('Customer dietary preferences updated', { userId, preferences });
  return customer;
});

/**
 * Awards gamification points for profile setup.
 * @param {string} userId - Customer user ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated gamification points object.
 */
const awardProfilePoints = catchAsync(async (userId, io) => {
  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  const points = await pointService.awardPoints(userId, 'profile_completion', 100);

  await auditService.logAction({
    action: 'AWARD_PROFILE_POINTS',
    userId,
    details: `Awarded 100 points for profile completion to user_id: ${userId}`,
  });

  const message = formatMessage('customer', 'profile', customer.preferences?.preferred_language || 'en', 'profile.points_awarded', {
    points: 100,
  });

  await notificationService.sendNotification({
    userId,
    type: 'points_awarded',
    message,
  });

  try {
    socketService.emit(io, 'customer:profile:points_awarded', {
      userId,
      role: 'customer',
      message,
      details: `Awarded 100 points for profile completion to user_id: ${userId}`,
    }, `user:${userId}`);
    socketService.emit(io, 'customer:profile:points_awarded', {
      userId,
      role: 'customer',
      message: `Customer awarded 100 points for profile completion for ${userId}`,
      details: `Awarded 100 points for profile completion to user_id: ${userId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in awardProfilePoints', {
      error: error.message,
      userId,
    });
  }

  logger.info('Profile completion points awarded', { userId, points: 100 });
  return points;
});

/**
 * Configures customer wallet preferences and payment methods.
 * @param {string} userId - Customer user ID.
 * @param {string} walletId - Wallet ID.
 * @param {Object} walletData - Wallet configuration.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated customer object.
 */
const manageWalletSettings = catchAsync(async (userId, walletId, walletData, io) => {
  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  if (walletData.paymentMethod) {
    await walletService.addPaymentMethod(walletId, walletData.paymentMethod);
    const message = formatMessage('customer', 'profile', customer.preferences?.preferred_language || 'en', 'profile.payment_method_added', {
      methodType: walletData.paymentMethod.type,
    });
    await notificationService.sendNotification({
      userId,
      type: 'payment_method_added',
      message,
    });
    try {
      socketService.emit(io, 'customer:wallet:payment_method_added', {
        userId,
        role: 'customer',
        message,
        details: `Payment method added for user_id: ${userId}`,
        logType: 'PAYMENT_METHOD_ADDED',
      }, `user:${userId}`);
      socketService.emit(io, 'customer:wallet:payment_method_added', {
        userId,
        role: 'customer',
        message: `Payment method added for customer ${userId}`,
        details: `Payment method added for user_id: ${userId}`,
      }, 'role:admin');
    } catch (error) {
      logger.logErrorEvent('Socket emission failed in manageWalletSettings (paymentMethod)', {
        error: error.message,
        userId,
      });
    }
  }

  if (walletData.withdrawal) {
    await walletService.withdraw(walletId, {
      amount: walletData.withdrawal.amount,
      currency: walletData.withdrawal.currency,
      paymentMethodId: walletData.withdrawal.paymentMethodId,
      sessionToken: walletData.withdrawal.sessionToken,
      ipAddress: walletData.withdrawal.ipAddress,
    });
    const message = formatMessage('customer', 'profile', customer.preferences?.preferred_language || 'en', 'profile.withdrawal_processed', {
      amount: walletData.withdrawal.amount,
      currency: walletData.withdrawal.currency,
    });
    await notificationService.sendNotification({
      userId,
      type: 'withdrawal_processed',
      message,
    });
    try {
      socketService.emit(io, 'customer:wallet:withdrawal_processed', {
        userId,
        role: 'customer',
        message,
        details: `Withdrawal processed for user_id: ${userId}`,
        logType: 'WITHDRAWAL_PROCESSED',
      }, `user:${userId}`);
      socketService.emit(io, 'customer:wallet:withdrawal_processed', {
        userId,
        role: 'customer',
        message: `Withdrawal processed for customer ${userId}`,
        details: `Withdrawal processed for user_id: ${userId}`,
      }, 'role:admin');
    } catch (error) {
      logger.logErrorEvent('Socket emission failed in manageWalletSettings (withdrawal)', {
        error: error.message,
        userId,
      });
    }
  }

  await customer.update({
    preferences: {
      ...customer.preferences,
      wallet_setup: true,
      wallet_id: walletId,
    },
  });

  await auditService.logAction({
    action: 'MANAGE_CUSTOMER_WALLET',
    userId,
    details: `Wallet settings updated for user_id: ${userId}, walletId: ${walletId}`,
  });

  const message = formatMessage('customer', 'profile', customer.preferences?.preferred_language || 'en', 'profile.wallet_settings_updated');

  await notificationService.sendNotification({
    userId,
    type: 'wallet_settings_updated',
    message,
  });

  try {
    socketService.emit(io, 'customer:wallet:updated', {
      userId,
      role: 'customer',
      message,
      details: `Wallet settings updated for user_id: ${userId}, walletId: ${walletId}`,
      logType: 'WALLET_UPDATED',
    }, `user:${userId}`);
    socketService.emit(io, 'customer:wallet:updated', {
      userId,
      role: 'customer',
      message: `Wallet settings updated for customer ${userId}`,
      details: `Wallet settings updated for user_id: ${userId}, walletId: ${walletId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in manageWalletSettings', {
      error: error.message,
      userId,
    });
  }

  logger.info('Customer wallet settings updated', { userId, walletId });
  return customer;
});

module.exports = {
  createCustomer,
  updateProfile,
  setCountry,
  setLanguage,
  setDietaryPreferences,
  awardProfilePoints,
  manageWalletSettings,
};