'use strict';

/**
 * Staff Profile Service (Admin)
 * Manages staff profile operations for admin use, including creation, updates, compliance
 * verification, profile retrieval, localization, and wallet settings, aligned with the Staff model.
 */

const { Staff, User, Merchant, MerchantBranch, Notification, Geofence } = require('@models');
const walletService = require('@services/common/walletService');
const verificationService = require('@services/common/verificationService');
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
 * Creates a new staff profile.
 * @param {Object} staffData - Staff data.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Created staff object.
 */
const createStaff = catchAsync(async (staffData, io) => {
  const requiredFields = ['user_id', 'merchant_id', 'position'];
  validation.validateRequiredFields(staffData, requiredFields);

  const user = await User.findByPk(staffData.user_id);
  if (!user || user.role !== USER_MANAGEMENT_CONSTANTS.USER_TYPES.STAFF) {
    throw new AppError('Invalid or non-staff user', 400, 'INVALID_USER');
  }

  const merchant = await Merchant.findByPk(staffData.merchant_id);
  if (!merchant) {
    throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
  }

  if (staffData.branch_id) {
    const branch = await MerchantBranch.findByPk(staffData.branch_id);
    if (!branch || branch.merchant_id !== staffData.merchant_id) {
      throw new AppError('Invalid or non-associated branch', 400, 'INVALID_BRANCH');
    }
  }

  const staff = await Staff.create({
    ...staffData,
    availability_status: 'offline',
    created_at: new Date(),
    updated_at: new Date(),
  });

  await auditService.logAction({
    action: 'CREATE_STAFF',
    userId: staff.user_id,
    details: `Staff profile created for user_id: ${staff.user_id}, merchant_id: ${staff.merchant_id}`,
  });

  const message = formatMessage('staff', 'profile', staffData.preferred_language || 'en', 'profile.created', {
    name: user.full_name || 'Staff',
  });

  await notificationService.sendNotification({
    userId: staff.user_id,
    type: 'profile_created',
    message,
  });

  try {
    socketService.emit(io, 'staff:profile:created', {
      userId: staff.user_id,
      role: 'staff',
      message,
      details: `Staff profile created for user_id: ${staff.user_id}, merchant_id: ${staff.merchant_id}`,
      logType: 'PROFILE_CREATED',
    }, `user:${staff.user_id}`);
    socketService.emit(io, 'staff:profile:created', {
      userId: staff.user_id,
      role: 'staff',
      message: `New staff profile created for ${user.full_name || 'Staff'}`,
      details: `Staff profile created for user_id: ${staff.user_id}, merchant_id: ${staff.merchant_id}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in createStaff', {
      error: error.message,
      userId: staff.user_id,
    });
  }

  logger.info('Staff created successfully', { staffId: staff.id });
  return staff;
});

/**
 * Modifies staff contact, role, or certification details.
 * @param {string} staffId - Staff ID.
 * @param {Object} details - Updated staff details.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated staff object.
 */
const updateStaffDetails = catchAsync(async (staffId, details, io) => {
  const staff = await Staff.findByPk(staffId);
  if (!staff) {
    throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');
  }

  if (details.branch_id) {
    const branch = await MerchantBranch.findByPk(details.branch_id);
    if (!branch || branch.merchant_id !== staff.merchant_id) {
      throw new AppError('Invalid or non-associated branch', 400, 'INVALID_BRANCH');
    }
  }

  const sanitizedData = await securityService.sanitizeInput(details);
  await staff.update(sanitizedData);

  await auditService.logAction({
    action: 'UPDATE_STAFF_PROFILE',
    userId: staff.user_id,
    details: `Staff profile updated for staff_id: ${staffId}`,
  });

  const message = formatMessage('staff', 'profile', staff.preferred_language || 'en', 'profile.updated', {
    name: (await User.findByPk(staff.user_id))?.full_name || 'Staff',
  });

  await notificationService.sendNotification({
    userId: staff.user_id,
    type: 'profile_updated',
    message,
  });

  try {
    socketService.emit(io, 'staff:profile:updated', {
      userId: staff.user_id,
      role: 'staff',
      message,
      details: `Staff profile updated for staff_id: ${staffId}`,
      logType: 'PROFILE_UPDATED',
    }, `user:${staff.user_id}`);
    socketService.emit(io, 'staff:profile:updated', {
      userId: staff.user_id,
      role: 'staff',
      message: `Staff profile updated for ${staffId}`,
      details: `Staff profile updated for staff_id: ${staffId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in updateStaffDetails', {
      error: error.message,
      userId: staff.user_id,
    });
  }

  logger.info('Staff details updated', { staffId });
  return staff;
});

/**
 * Ensures staff meet regulatory requirements.
 * @param {string} staffId - Staff ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Verification result.
 */
const verifyCompliance = catchAsync(async (staffId, io) => {
  const staff = await Staff.findByPk(staffId);
  if (!staff) {
    throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');
  }

  const verificationResult = await verificationService.verifyStaffCompliance(staffId);

  if (verificationResult.status === 'verified') {
    await staff.update({
      performance_metrics: {
        ...staff.performance_metrics,
        compliance_status: 'verified',
        last_verified: new Date(),
      },
    });
  }

  await auditService.logAction({
    action: 'VERIFY_STAFF_COMPLIANCE',
    userId: staff.user_id,
    details: `Staff compliance verified for staff_id: ${staffId}, status: ${verificationResult.status}`,
  });

  const message = formatMessage('staff', 'profile', staff.preferred_language || 'en', 'profile.compliance_verified', {
    status: verificationResult.status,
  });

  await notificationService.sendNotification({
    userId: staff.user_id,
    type: 'compliance_verified',
    message,
  });

  try {
    socketService.emit(io, 'staff:profile:compliance_verified', {
      userId: staff.user_id,
      role: 'staff',
      message,
      details: `Staff compliance verified for staff_id: ${staffId}, status: ${verificationResult.status}`,
    }, `user:${staff.user_id}`);
    socketService.emit(io, 'staff:profile:compliance_verified', {
      userId: staff.user_id,
      role: 'staff',
      message: `Staff compliance status: ${verificationResult.status} for ${staffId}`,
      details: `Staff compliance verified for staff_id: ${staffId}, status: ${verificationResult.status}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in verifyCompliance', {
      error: error.message,
      userId: staff.user_id,
    });
  }

  logger.info('Staff compliance verified', { staffId, status: verificationResult.status });
  return verificationResult;
});

/**
 * Retrieves staff profile for merchant or admin review.
 * @param {string} staffId - Staff ID.
 * @returns {Promise<Object>} Staff profile object.
 */
const getStaffProfile = catchAsync(async (staffId) => {
  const staff = await Staff.findByPk(staffId, {
    include: [
      { model: User, as: 'user' },
      { model: Merchant, as: 'merchant' },
      { model: MerchantBranch, as: 'branch' },
    ],
  });
  if (!staff) {
    throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');
  }

  await auditService.logAction({
    action: 'GET_STAFF_PROFILE',
    userId: staff.user_id,
    details: `Staff profile retrieved for staff_id: ${staffId}`,
  });

  logger.info('Staff profile retrieved', { staffId });
  return staff;
});

/**
 * Configures localized settings for staff interfaces.
 * @param {string} staffId - Staff ID.
 * @param {string} countryCode - ISO country code.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated staff object.
 */
const setCountrySettings = catchAsync(async (staffId, countryCode, io) => {
  const staff = await Staff.findByPk(staffId);
  if (!staff) {
    throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');
  }

  const supportedCountries = Object.keys(USER_MANAGEMENT_CONSTANTS.ADMIN_SETTINGS.SUPPORTED_CITIES);
  if (!supportedCountries.includes(countryCode)) {
    throw new AppError('Unsupported country code', 400, 'INVALID_COUNTRY_CODE');
  }

  const mapProvider = USER_MANAGEMENT_CONSTANTS.ADMIN_SETTINGS.SUPPORTED_MAP_PROVIDERS[countryCode] || 'google_maps';

  await staff.update({
    assigned_area: { country: countryCode },
    work_location: staff.work_location || { country: countryCode },
  });

  await mapService.configureMapProvider(staff.user_id, mapProvider);

  await auditService.logAction({
    action: 'SET_STAFF_COUNTRY',
    userId: staff.user_id,
    details: `Country set to ${countryCode} for staff_id: ${staffId}`,
  });

  const message = formatMessage('staff', 'profile', staff.preferred_language || 'en', 'profile.country_updated', {
    country: countryCode,
  });

  await notificationService.sendNotification({
    userId: staff.user_id,
    type: 'country_updated',
    message,
  });

  try {
    socketService.emit(io, 'staff:profile:country_updated', {
      userId: staff.user_id,
      role: 'staff',
      message,
      details: `Country set to ${countryCode} for staff_id: ${staffId}`,
    }, `user:${staff.user_id}`);
    socketService.emit(io, 'staff:profile:country_updated', {
      userId: staff.user_id,
      role: 'staff',
      message: `Staff country set to ${countryCode} for ${staffId}`,
      details: `Country set to ${countryCode} for staff_id: ${staffId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in setCountrySettings', {
      error: error.message,
      userId: staff.user_id,
    });
  }

  logger.info('Staff country settings updated', { staffId, countryCode });
  return staff;
});

/**
 * Configures staff wallet for salaries, bonuses, and rewards.
 * @param {string} staffId - Staff ID.
 * @param {string} walletId - Wallet ID.
 * @param {Object} walletData - Wallet configuration.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated staff object.
 */
const manageWalletSettings = catchAsync(async (staffId, walletId, walletData, io) => {
  const staff = await Staff.findByPk(staffId);
  if (!staff) {
    throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');
  }

  if (walletData.paymentMethod) {
    await walletService.addPaymentMethod(walletId, walletData.paymentMethod);
    const message = formatMessage('staff', 'profile', staff.preferred_language || 'en', 'profile.payment_method_added', {
      methodType: walletData.paymentMethod.type,
    });
    await notificationService.sendNotification({
      userId: staff.user_id,
      type: 'payment_method_added',
      message,
    });
    try {
      socketService.emit(io, 'staff:wallet:payment_method_added', {
        userId: staff.user_id,
        role: 'staff',
        message,
        details: `Payment method added for staff_id: ${staffId}`,
        logType: 'PAYMENT_METHOD_ADDED',
      }, `user:${staff.user_id}`);
      socketService.emit(io, 'staff:wallet:payment_method_added', {
        userId: staff.user_id,
        role: 'staff',
        message: `Payment method added for staff ${staffId}`,
        details: `Payment method added for staff_id: ${staffId}`,
      }, 'role:admin');
    } catch (error) {
      logger.logErrorEvent('Socket emission failed in manageWalletSettings (paymentMethod)', {
        error: error.message,
        userId: staff.user_id,
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
    const message = formatMessage('staff', 'profile', staff.preferred_language || 'en', 'profile.withdrawal_processed', {
      amount: walletData.withdrawal.amount,
      currency: walletData.withdrawal.currency,
    });
    await notificationService.sendNotification({
      userId: staff.user_id,
      type: 'withdrawal_processed',
      message,
    });
    try {
      socketService.emit(io, 'staff:wallet:withdrawal_processed', {
        userId: staff.user_id,
        role: 'staff',
        message,
        details: `Withdrawal processed for staff_id: ${staffId}`,
        logType: 'WITHDRAWAL_PROCESSED',
      }, `user:${staff.user_id}`);
      socketService.emit(io, 'staff:wallet:withdrawal_processed', {
        userId: staff.user_id,
        role: 'staff',
        message: `Withdrawal processed for staff ${staffId}`,
        details: `Withdrawal processed for staff_id: ${staffId}`,
      }, 'role:admin');
    } catch (error) {
      logger.logErrorEvent('Socket emission failed in manageWalletSettings (withdrawal)', {
        error: error.message,
        userId: staff.user_id,
      });
    }
  }

  await staff.update({
    wallet_id: walletId,
    updated_at: new Date(),
  });

  await auditService.logAction({
    action: 'MANAGE_STAFF_WALLET',
    userId: staff.user_id,
    details: `Wallet settings updated for staff_id: ${staffId}, walletId: ${walletId}`,
  });

  const message = formatMessage('staff', 'profile', staff.preferred_language || 'en', 'profile.wallet_settings_updated');

  await notificationService.sendNotification({
    userId: staff.user_id,
    type: 'wallet_settings_updated',
    message,
  });

  try {
    socketService.emit(io, 'staff:wallet:updated', {
      userId: staff.user_id,
      role: 'staff',
      message,
      details: `Wallet settings updated for staff_id: ${staffId}, walletId: ${walletId}`,
      logType: 'WALLET_UPDATED',
    }, `user:${staff.user_id}`);
    socketService.emit(io, 'staff:wallet:updated', {
      userId: staff.user_id,
      role: 'staff',
      message: `Wallet settings updated for staff ${staffId}`,
      details: `Wallet settings updated for staff_id: ${staffId}, walletId: ${walletId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in manageWalletSettings', {
      error: error.message,
      userId: staff.user_id,
    });
  }

  logger.info('Staff wallet settings updated', { staffId, walletId });
  return staff;
});

module.exports = {
  createStaff,
  updateStaffDetails,
  verifyCompliance,
  getStaffProfile,
  setCountrySettings,
  manageWalletSettings,
};