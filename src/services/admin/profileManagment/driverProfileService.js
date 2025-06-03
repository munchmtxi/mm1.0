'use strict';

/**
 * Driver Profile Service (Admin)
 * Manages driver profile operations for admin use, including creation, updates, certifications,
 * verification, localization, and wallet settings, aligned with the Driver and Vehicle models.
 */

const { Driver, User, Vehicle, Notification } = require('@models');
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
 * Creates a new driver profile.
 * @param {Object} driverData - Driver data.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Created driver object.
 */
const createDriver = catchAsync(async (driverData, io) => {
  const requiredFields = ['user_id', 'name', 'phone_number', 'vehicle_info', 'license_number'];
  validation.validateRequiredFields(driverData, requiredFields);

  await validation.validatePhoneNumber(driverData.phone_number);

  const user = await User.findByPk(driverData.user_id);
  if (!user || user.role !== USER_MANAGEMENT_CONSTANTS.USER_TYPES.DRIVER) {
    throw new AppError('Invalid or non-driver user', 400, 'INVALID_USER');
  }

  if (driverData.vehicle_info) {
    validation.validateVehicleInfo(driverData.vehicle_info);
  }

  const driver = await Driver.create({
    ...driverData,
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  });

  if (driverData.vehicle_info) {
    await Vehicle.create({
      driver_id: driver.id,
      type: driverData.vehicle_info.type,
      capacity: driverData.vehicle_info.capacity || 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  await auditService.logAction({
    action: 'CREATE_DRIVER',
    userId: driver.user_id,
    details: `Driver profile created for user_id: ${driver.user_id}`,
  });

  const message = formatMessage('driver', 'profile', driverData.preferred_language || 'en', 'profile.created', {
    name: driver.name,
  });

  await notificationService.sendNotification({
    userId: driver.user_id,
    type: 'profile_created',
    message,
  });

  try {
    socketService.emit(io, 'driver:profile:created', {
      userId: driver.user_id,
      role: 'driver',
      message,
      details: `Driver profile created for user_id: ${driver.user_id}`,
      logType: 'PROFILE_CREATED',
    }, `user:${driver.user_id}`);
    socketService.emit(io, 'driver:profile:created', {
      userId: driver.user_id,
      role: 'driver',
      message: `New driver profile created for ${driver.name}`,
      details: `Driver profile created for user_id: ${driver.user_id}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in createDriver', {
      error: error.message,
      userId: driver.user_id,
    });
  }

  logger.info('Driver created successfully', { driverId: driver.id });
  return driver;
});

/**
 * Updates driver personal or vehicle information.
 * @param {string} driverId - Driver ID.
 * @param {Object} details - Updated details.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated driver object.
 */
const updateProfile = catchAsync(async (driverId, details, io) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');
  }

  if (details.phone_number) {
    await validation.validatePhoneNumber(details.phone_number);
  }

  if (details.vehicle_info) {
    validation.validateVehicleInfo(details.vehicle_info);
  }

  const sanitizedData = await securityService.sanitizeInput(details);
  await driver.update(sanitizedData);

  if (details.vehicle_info) {
    const vehicle = await Vehicle.findOne({ where: { driver_id: driverId } });
    if (vehicle) {
      await vehicle.update({
        type: details.vehicle_info.type,
        capacity: details.vehicle_info.capacity || vehicle.capacity,
        updated_at: new Date(),
      });
    } else {
      await Vehicle.create({
        driver_id: driverId,
        type: details.vehicle_info.type,
        capacity: details.vehicle_info.capacity || 1,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }

  await auditService.logAction({
    action: 'UPDATE_DRIVER_PROFILE',
    userId: driver.user_id,
    details: `Driver profile updated for driver_id: ${driverId}`,
  });

  const message = formatMessage('driver', 'profile', driver.preferred_language || 'en', 'profile.updated', {
    name: driver.name,
  });

  await notificationService.sendNotification({
    userId: driver.user_id,
    type: 'profile_updated',
    message,
  });

  try {
    socketService.emit(io, 'driver:profile:updated', {
      userId: driver.user_id,
      role: 'driver',
      message,
      details: `Driver profile updated for driver_id: ${driverId}`,
      logType: 'PROFILE_UPDATED',
    }, `user:${driver.user_id}`);
    socketService.emit(io, 'driver:profile:updated', {
      userId: driver.user_id,
      role: 'driver',
      message: `Driver profile updated for ${driverId}`,
      details: `Driver profile updated for driver_id: ${driverId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in updateProfile', {
      error: error.message,
      userId: driver.user_id,
    });
  }

  logger.info('Driver profile updated', { driverId });
  return driver;
});

/**
 * Submits certifications (e.g., driver’s license, insurance).
 * @param {string} driverId - Driver ID.
 * @param {Object} certData - Certification data.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated driver object.
 */
const uploadCertification = catchAsync(async (driverId, certData, io) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');
  }

  const validCertTypes = USER_MANAGEMENT_CONSTANTS.DOCUMENT_TYPES;
  if (!Object.values(validCertTypes).includes(certData.type)) {
    throw new AppError('Invalid certification type', 400, 'INVALID_CERT_TYPE');
  }

  await verificationService.storeCertification(driverId, certData);

  const updates = {};
  if (certData.type === USER_MANAGEMENT_CONSTANTS.DOCUMENT_TYPES.DRIVERS_LICENSE && certData.fileUrl) {
    updates.license_picture_url = certData.fileUrl;
  }
  if (Object.keys(updates).length > 0) {
    await driver.update(updates);
  }

  await auditService.logAction({
    action: 'UPLOAD_DRIVER_CERTIFICATION',
    userId: driver.user_id,
    details: `Certification uploaded for driver_id: ${driverId}, type: ${certData.type}`,
  });

  const message = formatMessage('driver', 'profile', driver.preferred_language || 'en', 'profile.certification_uploaded', {
    certType: certData.type,
  });

  await notificationService.sendNotification({
    userId: driver.user_id,
    type: 'certification_uploaded',
    message,
  });

  try {
    socketService.emit(io, 'driver:certification:uploaded', {
      userId: driver.user_id,
      role: 'driver',
      message,
      details: `Certification uploaded for driver_id: ${driverId}, type: ${certData.type}`,
    }, `user:${driver.user_id}`);
    socketService.emit(io, 'driver:certification:uploaded', {
      userId: driver.user_id,
      role: 'driver',
      message: `Certification (${certData.type}) uploaded for driver ${driverId}`,
      details: `Certification uploaded for driver_id: ${driverId}, type: ${certData.type}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in uploadCertification', {
      error: error.message,
      userId: driver.user_id,
    });
  }

  logger.info('Driver certification uploaded', { driverId, certType: certData.type });
  return driver;
});

/**
 * Validates driver profile data for compliance.
 * @param {string} driverId - Driver ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Verification result.
 */
const verifyProfile = catchAsync(async (driverId, io) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');
  }

  const verificationResult = await verificationService.verifyDriverCompliance(driverId);

  if (verificationResult.status === 'verified') {
    await driver.update({ status: 'active' });
  } else {
    await driver.update({ status: 'pending_verification' });
  }

  await auditService.logAction({
    action: 'VERIFY_DRIVER_PROFILE',
    userId: driver.user_id,
    details: `Driver profile verification for driver_id: ${driverId}, status: ${verificationResult.status}`,
  });

  const message = formatMessage('driver', 'profile', driver.preferred_language || 'en', 'profile.verified', {
    status: verificationResult.status,
  });

  await notificationService.sendNotification({
    userId: driver.user_id,
    type: 'profile_verified',
    message,
  });

  try {
    socketService.emit(io, 'driver:profile:verified', {
      userId: driver.user_id,
      role: 'driver',
      message,
      details: `Driver profile verification for driver_id: ${driverId}, status: ${verificationResult.status}`,
    }, `user:${driver.user_id}`);
    socketService.emit(io, 'driver:profile:verified', {
      userId: driver.user_id,
      role: 'driver',
      message: `Driver profile verification status: ${verificationResult.status} for ${driverId}`,
      details: `Driver profile verification for driver_id: ${driverId}, status: ${verificationResult.status}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in verifyProfile', {
      error: error.message,
      userId: driver.user_id,
    });
  }

  logger.info('Driver profile verified', { driverId, status: verificationResult.status });
  return verificationResult;
});

/**
 * Configures driver-specific localization settings.
 * @param {string} driverId - Driver ID.
 * @param {string} countryCode - ISO country code.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated driver object.
 */
const setCountry = catchAsync(async (driverId, countryCode, io) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');
  }

  const supportedCountries = Object.keys(USER_MANAGEMENT_CONSTANTS.ADMIN_SETTINGS.SUPPORTED_CITIES);
  if (!supportedCountries.includes(countryCode)) {
    throw new AppError('Unsupported country code', 400, 'INVALID_COUNTRY_CODE');
  }

  const mapProvider = USER_MANAGEMENT_CONSTANTS.ADMIN_SETTINGS.SUPPORTED_MAP_PROVIDERS[countryCode] || 'google_maps';

  await driver.update({
    service_area: { country: countryCode },
    preferred_zones: driver.preferred_zones || { country: countryCode },
  });

  await mapService.configureMapProvider(driver.user_id, mapProvider);

  await auditService.logAction({
    action: 'SET_DRIVER_COUNTRY',
    userId: driver.user_id,
    details: `Country set to ${countryCode} for driver_id: ${driverId}`,
  });

  const message = formatMessage('driver', 'profile', driver.preferred_language || 'en', 'profile.country_updated', {
    country: countryCode,
  });

  await notificationService.sendNotification({
    userId: driver.user_id,
    type: 'country_updated',
    message,
  });

  try {
    socketService.emit(io, 'driver:profile:country_updated', {
      userId: driver.user_id,
      role: 'driver',
      message,
      details: `Country set to ${countryCode} for driver_id: ${driverId}`,
    }, `user:${driver.user_id}`);
    socketService.emit(io, 'driver:profile:country_updated', {
      userId: driver.user_id,
      role: 'driver',
      message: `Driver country set to ${countryCode} for ${driverId}`,
      details: `Country set to ${countryCode} for driver_id: ${driverId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in setCountry', {
      error: error.message,
      userId: driver.user_id,
    });
  }

  logger.info('Driver country settings updated', { driverId, countryCode });
  return driver;
});

/**
 * Configures driver wallet for earnings and payouts.
 * @param {string} driverId - Driver ID.
 * @param {string} walletId - Wallet ID.
 * @param {Object} walletData - Wallet configuration.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated driver object.
 */
const manageWalletSettings = catchAsync(async (driverId, walletId, walletData, io) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');
  }

  if (walletData.paymentMethod) {
    await walletService.addPaymentMethod(walletId, walletData.paymentMethod);
    const message = formatMessage('driver', 'profile', driver.preferred_language || 'en', 'profile.payment_method_added', {
      methodType: walletData.paymentMethod.type,
    });
    await notificationService.sendNotification({
      userId: driver.user_id,
      type: 'payment_method_added',
      message,
    });
    try {
      socketService.emit(io, 'driver:wallet:payment_method_added', {
        userId: driver.user_id,
        role: 'driver',
        message,
        details: `Payment method added for driver_id: ${driverId}`,
        logType: 'PAYMENT_METHOD_ADDED',
      }, `user:${driver.user_id}`);
      socketService.emit(io, 'driver:wallet:payment_method_added', {
        userId: driver.user_id,
        role: 'driver',
        message: `Payment method added for driver ${driverId}`,
        details: `Payment method added for driver_id: ${driverId}`,
      }, 'role:admin');
    } catch (error) {
      logger.logErrorEvent('Socket emission failed in manageWalletSettings (paymentMethod)', {
        error: error.message,
        userId: driver.user_id,
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
    const message = formatMessage('driver', 'profile', driver.preferred_language || 'en', 'profile.withdrawal_processed', {
      amount: walletData.withdrawal.amount,
      currency: walletData.withdrawal.currency,
    });
    await notificationService.sendNotification({
      userId: driver.user_id,
      type: 'withdrawal_processed',
      message,
    });
    try {
      socketService.emit(io, 'driver:wallet:withdrawal_processed', {
        userId: driver.user_id,
        role: 'driver',
        message,
        details: `Withdrawal processed for driver_id: ${driverId}`,
        logType: 'WITHDRAWAL_PROCESSED',
      }, `user:${driver.user_id}`);
      socketService.emit(io, 'driver:wallet:withdrawal_processed', {
        userId: driver.user_id,
        role: 'driver',
        message: `Withdrawal processed for driver ${driverId}`,
        details: `Withdrawal processed for driver_id: ${driverId}`,
      }, 'role:admin');
    } catch (error) {
      logger.logErrorEvent('Socket emission failed in manageWalletSettings (withdrawal)', {
        error: error.message,
        userId: driver.user_id,
      });
    }
  }

  await auditService.logAction({
    action: 'MANAGE_DRIVER_WALLET',
    userId: driver.user_id,
    details: `Wallet settings updated for driver_id: ${driverId}, walletId: ${walletId}`,
  });

  const message = formatMessage('driver', 'profile', driver.preferred_language || 'en', 'profile.wallet_settings_updated');

  await notificationService.sendNotification({
    userId: driver.user_id,
    type: 'wallet_settings_updated',
    message,
  });

  try {
    socketService.emit(io, 'driver:wallet:updated', {
      userId: driver.user_id,
      role: 'driver',
      message,
      details: `Wallet settings updated for driver_id: ${driverId}, walletId: ${walletId}`,
      logType: 'WALLET_UPDATED',
    }, `user:${driver.user_id}`);
    socketService.emit(io, 'driver:wallet:updated', {
      userId: driver.user_id,
      role: 'driver',
      message: `Wallet settings updated for driver ${driverId}`,
      details: `Wallet settings updated for driver_id: ${driverId}, walletId: ${walletId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in manageWalletSettings', {
      error: error.message,
      userId: driver.user_id,
    });
  }

  logger.info('Driver wallet settings updated', { driverId, walletId });
  return driver;
});

module.exports = {
  createDriver,
  updateProfile,
  uploadCertification,
  verifyProfile,
  setCountry,
  manageWalletSettings,
};