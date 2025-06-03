'use strict';

/**
 * Merchant Profile Service (Admin)
 * Manages merchant profile operations for admin use, including creation, business details,
 * localization, branch settings, media uploads, and wallet settings, aligned with the Merchant
 * and MerchantBranch models.
 */

const { Merchant, MerchantBranch, User, Address, Notification, Geofence } = require('@models');
const walletService = require('@services/common/walletService');
const imageService = require('@services/common/imageService');
const mapService = require('@services/common/mapService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const socketService = require('@services/common/socketService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization/localization');
const validation = require('@utils/validation');
const { USER_MANAGEMENT_CONSTANTS } = require('@constants/admin/adminCoreConstants');
const catchAsync = require('@utils/catchAsync');

/**
 * Creates a new merchant profile.
 * @param {Object} merchantData - Merchant data.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Created merchant object.
 */
const createMerchant = catchAsync(async (merchantData, io) => {
  const requiredFields = ['user_id', 'business_name', 'business_type', 'address', 'phone_number'];
  validation.validateRequiredFields(merchantData, requiredFields);

  await validation.validatePhoneNumber(merchantData.phone_number);

  const user = await User.findByPk(merchantData.user_id);
  if (!user || user.role !== USER_MANAGEMENT_CONSTANTS.USER_TYPES.MERCHANT) {
    throw new AppError('Invalid or non-merchant user', 400, 'INVALID_USER');
  }

  const { BUSINESS_TYPE_CODES } = require('@constants/merchant/businessTypes');
  if (!BUSINESS_TYPE_CODES.includes(merchantData.business_type)) {
    throw new AppError('Invalid business type', 400, 'INVALID_BUSINESS_TYPE');
  }

  const merchant = await Merchant.create({
    ...merchantData,
    currency: merchantData.currency || 'MWK',
    time_zone: merchantData.time_zone || 'Africa/Blantyre',
    created_at: new Date(),
    updated_at: new Date(),
  });

  await auditService.logAction({
    action: 'CREATE_MERCHANT',
    userId: merchant.user_id,
    details: `Merchant profile created for user_id: ${merchant.user_id}`,
  });

  const message = formatMessage('merchant', 'profile', merchantData.preferred_language || 'en', 'profile.created', {
    name: merchant.business_name,
  });

  await notificationService.sendNotification({
    userId: merchant.user_id,
    type: 'profile_created',
    message,
  });

  try {
    socketService.emit(io, 'merchant:profile:created', {
      userId: merchant.user_id,
      role: 'merchant',
      message,
      details: `Merchant profile created for user_id: ${merchant.user_id}`,
      logType: 'PROFILE_CREATED',
    }, `user:${merchant.user_id}`);
    socketService.emit(io, 'merchant:profile:created', {
      userId: merchant.user_id,
      role: 'merchant',
      message: `New merchant profile created for ${merchant.business_name}`,
      details: `Merchant profile created for user_id: ${merchant.user_id}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in createMerchant', {
      error: error.message,
      userId: merchant.user_id,
    });
  }

  logger.info('Merchant created successfully', { merchantId: merchant.id });
  return merchant;
});

/**
 * Updates merchant business information.
 * @param {string} merchantId - Merchant ID.
 * @param {Object} details - Updated business details.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated merchant object.
 */
const updateBusinessDetails = catchAsync(async (merchantId, details, io) => {
  const merchant = await Merchant.findByPk(merchantId);
  if (!merchant) {
    throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
  }

  if (details.phone_number) {
    await validation.validatePhoneNumber(details.phone_number);
  }

  const sanitizedData = await securityService.sanitizeInput(details);

  if (sanitizedData.business_type) {
    const { BUSINESS_TYPE_CODES } = require('@constants/merchant/businessTypes');
    if (!BUSINESS_TYPE_CODES.includes(sanitizedData.business_type)) {
      throw new AppError('Invalid business type', 400, 'INVALID_BUSINESS_TYPE');
    }
  }

  await merchant.update(sanitizedData);

  await auditService.logAction({
    action: 'UPDATE_MERCHANT_PROFILE',
    userId: merchant.user_id,
    details: `Merchant profile updated for merchant_id: ${merchantId}`,
  });

  const message = formatMessage('merchant', 'profile', merchant.preferred_language || 'en', 'profile.updated', {
    name: merchant.business_name,
  });

  await notificationService.sendNotification({
    userId: merchant.user_id,
    type: 'profile_updated',
    message,
  });

  try {
    socketService.emit(io, 'merchant:profile:updated', {
      userId: merchant.user_id,
      role: 'merchant',
      message,
      details: `Merchant profile updated for merchant_id: ${merchantId}`,
      logType: 'PROFILE_UPDATED',
    }, `user:${merchant.user_id}`);
    socketService.emit(io, 'merchant:profile:updated', {
      userId: merchant.user_id,
      role: 'merchant',
      message: `Merchant profile updated for ${merchantId}`,
      details: `Merchant profile updated for merchant_id: ${merchantId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in updateBusinessDetails', {
      error: error.message,
      userId: merchant.user_id,
    });
  }

  logger.info('Merchant business details updated', { merchantId });
  return merchant;
});

/**
 * Configures currency, time format, and map integrations.
 * @param {string} merchantId - Merchant ID.
 * @param {string} countryCode - ISO country code.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated merchant object.
 */
const setCountrySettings = catchAsync(async (merchantId, countryCode, io) => {
  const merchant = await Merchant.findByPk(merchantId);
  if (!merchant) {
    throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
  }

  const supportedCountries = Object.keys(USER_MANAGEMENT_CONSTANTS.ADMIN_SETTINGS.SUPPORTED_CITIES);
  if (!supportedCountries.includes(countryCode)) {
    throw new AppError('Unsupported country code', 400, 'INVALID_COUNTRY_CODE');
  }

  const currency = USER_MANAGEMENT_CONSTANTS.ADMIN_SETTINGS.SUPPORTED_CURRENCIES.find((c) => c === countryCode) || 'USD';
  const mapProvider = USER_MANAGEMENT_CONSTANTS.ADMIN_SETTINGS.SUPPORTED_MAP_PROVIDERS[countryCode] || 'google_maps';

  await merchant.update({
    currency,
    delivery_area: { country: countryCode },
  });

  await mapService.configureMapProvider(merchant.user_id, mapProvider);

  await auditService.logAction({
    action: 'SET_MERCHANT_COUNTRY',
    userId: merchant.user_id,
    details: `Country set to ${countryCode} for merchant_id: ${merchantId}`,
  });

  const message = formatMessage('merchant', 'profile', merchant.preferred_language || 'en', 'profile.country_updated', {
    country: countryCode,
  });

  await notificationService.sendNotification({
    userId: merchant.user_id,
    type: 'country_updated',
    message,
  });

  try {
    socketService.emit(io, 'merchant:profile:country_updated', {
      userId: merchant.user_id,
      role: 'merchant',
      message,
      details: `Country set to ${countryCode} for merchant_id: ${merchantId}`,
    }, `user:${merchant.user_id}`);
    socketService.emit(io, 'merchant:profile:country_updated', {
      userId: merchant.user_id,
      role: 'merchant',
      message: `Merchant country set to ${countryCode} for ${merchantId}`,
      details: `Country set to ${countryCode} for merchant_id: ${merchantId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in setCountrySettings', {
      error: error.message,
      userId: merchant.user_id,
    });
  }

  logger.info('Merchant country settings updated', { merchantId, countryCode });
  return merchant;
});

/**
 * Configures branch-specific settings.
 * @param {string} branchId - Branch ID.
 * @param {Object} settings - Branch settings.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated branch object.
 */
const manageBranchSettings = catchAsync(async (branchId, settings, io) => {
  const branch = await MerchantBranch.findByPk(branchId);
  if (!branch) {
    throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
  }

  if (settings.contact_phone) {
    await validation.validatePhoneNumber(settings.contact_phone);
  }

  const sanitizedData = await securityService.sanitizeInput(settings);
  await branch.update(sanitizedData);

  await auditService.logAction({
    action: 'MANAGE_BRANCH_SETTINGS',
    userId: (await Merchant.findByPk(branch.merchant_id)).user_id,
    details: `Branch settings updated for branch_id: ${branchId}`,
  });

  const message = formatMessage('merchant', 'branch', branch.preferred_language || 'en', 'branch.settings_updated');

  await notificationService.sendNotification({
    userId: (await Merchant.findByPk(branch.merchant_id)).user_id,
    type: 'branch_settings_updated',
    message,
  });

  try {
    socketService.emit(io, 'merchant:branch:settings_updated', {
      userId: (await Merchant.findByPk(branch.merchant_id)).user_id,
      role: 'merchant',
      message,
      details: `Branch settings updated for branch_id: ${branchId}`,
    }, `user:${(await Merchant.findByPk(branch.merchant_id)).user_id}`);
    socketService.emit(io, 'merchant:branch:settings_updated', {
      userId: (await Merchant.findByPk(branch.merchant_id)).user_id,
      role: 'merchant',
      message: `Branch settings updated for branch ${branchId}`,
      details: `Branch settings updated for branch_id: ${branchId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in manageBranchSettings', {
      error: error.message,
      userId: (await Merchant.findByPk(branch.merchant_id)).user_id,
    });
  }

  logger.info('Branch settings updated', { branchId });
  return branch;
});

/**
 * Manages menu photos and promotional media.
 * @param {string} merchantId - Merchant ID.
 * @param {Object} media - Media data.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated merchant object.
 */
const uploadMedia = catchAsync(async (merchantId, media, io) => {
  const merchant = await Merchant.findByPk(merchantId);
  if (!merchant) {
    throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
  }

  const mediaMetadata = await imageService.uploadMedia(merchantId, media);

  const updates = {};
  if (media.type === 'logo') {
    updates.logo_url = mediaMetadata.url;
  } else if (media.type === 'banner') {
    updates.banner_url = mediaMetadata.url;
  }
  if (Object.keys(updates).length > 0) {
    await merchant.update(updates);
  }

  await auditService.logAction({
    action: 'UPLOAD_MERCHANT_MEDIA',
    userId: merchant.user_id,
    details: `Media uploaded for merchant_id: ${merchantId}, type: ${media.type}`,
  });

  const message = formatMessage('merchant', 'profile', merchant.preferred_language || 'en', 'profile.media_uploaded', {
    mediaType: media.type,
  });

  await notificationService.sendNotification({
    userId: merchant.user_id,
    type: 'media_uploaded',
    message,
  });

  try {
    socketService.emit(io, 'merchant:profile:media_uploaded', {
      userId: merchant.user_id,
      role: 'merchant',
      message,
      details: `Media uploaded for merchant_id: ${merchantId}, type: ${media.type}`,
    }, `user:${merchant.user_id}`);
    socketService.emit(io, 'merchant:profile:media_uploaded', {
      userId: merchant.user_id,
      role: 'merchant',
      message: `Media (${media.type}) uploaded for merchant ${merchantId}`,
      details: `Media uploaded for merchant_id: ${merchantId}, type: ${media.type}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in uploadMedia', {
      error: error.message,
      userId: merchant.user_id,
    });
  }

  logger.info('Merchant media uploaded', { merchantId, mediaType: media.type });
  return merchant;
});

/**
 * Configures merchant wallet for payments and payouts.
 * @param {string} merchantId - Merchant ID.
 * @param {string} walletId - Wallet ID.
 * @param {Object} walletData - Wallet configuration.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated merchant object.
 */
const manageWalletSettings = catchAsync(async (merchantId, walletId, walletData, io) => {
  const merchant = await Merchant.findByPk(merchantId);
  if (!merchant) {
    throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
  }

  if (walletData.paymentMethod) {
    await walletService.addPaymentMethod(walletId, walletData.paymentMethod);
    const message = formatMessage('merchant', 'profile', merchant.preferred_language || 'en', 'profile.payment_method_added', {
      methodType: walletData.paymentMethod.type,
    });
    await notificationService.sendNotification({
      userId: merchant.user_id,
      type: 'payment_method_added',
      message,
    });
    try {
      socketService.emit(io, 'merchant:wallet:payment_method_added', {
        userId: merchant.user_id,
        role: 'merchant',
        message,
        details: `Payment method added for merchant_id: ${merchantId}`,
        logType: 'PAYMENT_METHOD_ADDED',
      }, `user:${merchant.user_id}`);
      socketService.emit(io, 'merchant:wallet:payment_method_added', {
        userId: merchant.user_id,
        role: 'merchant',
        message: `Payment method added for merchant ${merchantId}`,
        details: `Payment method added for merchant_id: ${merchantId}`,
      }, 'role:admin');
    } catch (error) {
      logger.logErrorEvent('Socket emission failed in manageWalletSettings (paymentMethod)', {
        error: error.message,
        userId: merchant.user_id,
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
    const message = formatMessage('merchant', 'profile', merchant.preferred_language || 'en', 'profile.withdrawal_processed', {
      amount: walletData.withdrawal.amount,
      currency: walletData.withdrawal.currency,
    });
    await notificationService.sendNotification({
      userId: merchant.user_id,
      type: 'withdrawal_processed',
      message,
    });
    try {
      socketService.emit(io, 'merchant:wallet:withdrawal_processed', {
        userId: merchant.user_id,
        role: 'merchant',
        message,
        details: `Withdrawal processed for merchant_id: ${merchantId}`,
        logType: 'WITHDRAWAL_PROCESSED',
      }, `user:${merchant.user_id}`);
      socketService.emit(io, 'merchant:wallet:withdrawal_processed', {
        userId: merchant.user_id,
        role: 'merchant',
        message: `Withdrawal processed for merchant ${merchantId}`,
        details: `Withdrawal processed for merchant_id: ${merchantId}`,
      }, 'role:admin');
    } catch (error) {
      logger.logErrorEvent('Socket emission failed in manageWalletSettings (withdrawal)', {
        error: error.message,
        userId: merchant.user_id,
      });
    }
  }

  await auditService.logAction({
    action: 'MANAGE_MERCHANT_WALLET',
    userId: merchant.user_id,
    details: `Wallet settings updated for merchant_id: ${merchantId}, walletId: ${walletId}`,
  });

  const message = formatMessage('merchant', 'profile', merchant.preferred_language || 'en', 'profile.wallet_settings_updated');

  await notificationService.sendNotification({
    userId: merchant.user_id,
    type: 'wallet_settings_updated',
    message,
  });

  try {
    socketService.emit(io, 'merchant:wallet:updated', {
      userId: merchant.user_id,
      role: 'merchant',
      message,
      details: `Wallet settings updated for merchant_id: ${merchantId}, walletId: ${walletId}`,
      logType: 'WALLET_UPDATED',
    }, `user:${merchant.user_id}`);
    socketService.emit(io, 'merchant:wallet:updated', {
      userId: merchant.user_id,
      role: 'merchant',
      message: `Wallet settings updated for merchant ${merchantId}`,
      details: `Wallet settings updated for merchant_id: ${merchantId}, walletId: ${walletId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in manageWalletSettings', {
      error: error.message,
      userId: merchant.user_id,
    });
  }

  logger.info('Merchant wallet settings updated', { merchantId, walletId });
  return merchant;
});

module.exports = {
  createMerchant,
  updateBusinessDetails,
  setCountrySettings,
  manageBranchSettings,
  uploadMedia,
  manageWalletSettings,
};