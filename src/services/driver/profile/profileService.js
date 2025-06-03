'use strict';

/**
 * Driver Profile Service
 * Manages driver profile operations, including updates, certification uploads, profile retrieval,
 * and compliance verification for the Driver Role System. Integrates with driverConstants.js for
 * configuration and ensures compliance with security and localization requirements.
 *
 * Last Updated: May 16, 2025
 */

const { Driver, User } = require('@models');
const driverConstants = require('@constants/driverConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const imageService = require('@services/common/imageService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization/localization');
const validation = require('@utils/validation');
const auditService = require('@services/common/auditService');
const catchAsync = require('@utils/catchAsync');

/**
 * Updates driver personal or vehicle information.
 * @param {string} driverId - Driver ID.
 * @param {Object} details - Driver details (e.g., name, vehicleType).
 * @returns {Promise<Object>} Updated driver profile.
 */
const updateProfile = catchAsync(async (driverId, details) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError(
      'Driver not found',
      404,
      driverConstants.ERROR_CODES.DRIVER_NOT_FOUND
    );
  }

  const { name, email, phone, vehicleType } = details;

  // Validate inputs
  if (email && !validation.validateEmail(email)) {
    throw new AppError(
      'Invalid email format',
      400,
      driverConstants.ERROR_CODES.ERR_INVALID_EMAIL
    );
  }
  if (phone && !validation.validatePhone(phone)) {
    throw new AppError(
      'Invalid phone format',
      400,
      driverConstants.ERROR_CODES.ERR_INVALID_PHONE
    );
  }
  if (vehicleType && !Object.values(driverConstants.PROFILE_CONSTANTS.VEHICLE_TYPES).includes(vehicleType)) {
    throw new AppError(
      'Invalid vehicle type',
      400,
      driverConstants.ERROR_CODES.INVALID_VEHICLE_TYPE
    );
  }

  // Update driver profile
  const updatedFields = {
    name: name || driver.name,
    email: email || driver.email,
    phone: phone || driver.phone,
    vehicle_type: vehicleType || driver.vehicle_type,
    updated_at: new Date(),
  };

  await driver.update(updatedFields);

  // Log audit event
  await auditService.logAction({
    action: 'UPDATE_DRIVER_PROFILE',
    userId: driver.user_id,
    details: `Driver profile updated for driver_id: ${driverId}`,
  });

  // Notify user
  await notificationService.sendNotification({
    userId: driver.user_id,
    type: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
    message: formatMessage(
      'driver',
      'profile',
      driver.preferred_language,
      'profile.updated',
      { driverId }
    ),
  });

  // Emit real-time event
  await socketService.emitToRoom(`driver:${driver.user_id}`, 'profile:updated', {
    userId: driver.user_id,
    driverId,
    updatedFields,
  });

  logger.info('Driver profile updated successfully', { driverId });
  return driver;
});

/**
 * Submits certifications (e.g., driver’s license, insurance).
 * @param {string} driverId - Driver ID.
 * @param {Object} certData - Certification data (e.g., file, type).
 * @returns {Promise<string>} URL of the uploaded certification.
 */
const uploadCertification = catchAsync(async (driverId, certData) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError(
      'Driver not found',
      404,
      driverConstants.ERROR_CODES.DRIVER_NOT_FOUND
    );
  }

  const { file, type } = certData;

  // Validate certification type
  if (!['driver_license', 'insurance'].includes(type)) {
    throw new AppError(
      'Invalid certification type',
      400,
      driverConstants.ERROR_CODES.INVALID_CERTIFICATION_TYPE
    );
  }

  // Validate file
  if (!file || !file.originalname) {
    throw new AppError(
      'Invalid file data',
      400,
      driverConstants.ERROR_CODES.INVALID_FILE_DATA
    );
  }

  const imageType = type === 'driver_license' ? 'driver_license' : 'driver_insurance';
  const imageUrl = await imageService.uploadImage(driver.user_id, file, imageType);

  // Update driver with certification URL
  const updateField = type === 'driver_license' ? { license_picture_url: imageUrl } : { insurance_picture_url: imageUrl };
  await driver.update({
    ...updateField,
    updated_at: new Date(),
  });

  // Log audit event
  await auditService.logAction({
    action: 'UPLOAD_DRIVER_CERTIFICATION',
    userId: driver.user_id,
    details: `${type} uploaded for driver_id: ${driverId}, image_url: ${imageUrl}`,
  });

  // Notify user
  await notificationService.sendNotification({
    userId: driver.user_id,
    type: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
    message: formatMessage(
      'driver',
      'profile',
      driver.preferred_language,
      'profile.certification_updated',
      { type }
    ),
  });

  // Emit real-time event
  await socketService.emitToRoom(`driver:${driver.user_id}`, 'profile:certification_updated', {
    userId: driver.user_id,
    driverId,
    type,
    imageUrl,
  });

  logger.info('Driver certification uploaded successfully', { driverId, type, imageUrl });
  return imageUrl;
});

/**
 * Retrieves the driver’s profile details.
 * @param {string} driverId - Driver ID.
 * @returns {Promise<Object>} Driver profile.
 */
const getProfile = catchAsync(async (driverId) => {
  const driver = await Driver.findByPk(driverId, {
    attributes: [
      'id',
      'user_id',
      'name',
      'email',
      'phone',
      'preferred_language',
      'vehicle_type',
      'license_number',
      'license_picture_url',
      'insurance_picture_url',
      'status',
      'created_at',
      'updated_at',
    ],
  });

  if (!driver) {
    throw new AppError(
      'Driver not found',
      404,
      driverConstants.ERROR_CODES.DRIVER_NOT_FOUND
    );
  }

  // Log audit event
  await auditService.logAction({
    action: 'GET_DRIVER_PROFILE',
    userId: driver.user_id,
    details: `Profile retrieved for driver_id: ${driverId}`,
  });

  logger.info('Driver profile retrieved successfully', { driverId });
  return driver;
});

/**
 * Validates driver profile data for compliance.
 * @param {string} driverId - Driver ID.
 * @returns {Promise<Object>} Compliance status.
 */
const verifyProfile = catchAsync(async (driverId) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError(
      'Driver not found',
      404,
      driverConstants.ERROR_CODES.DRIVER_NOT_FOUND
    );
  }

  // Check required fields
  const requiredFields = ['name', 'email', 'phone', 'vehicle_type', 'license_number', 'license_picture_url'];
  const missingFields = requiredFields.filter(field => !driver[field]);
  if (missingFields.length > 0) {
    throw new AppError(
      `Missing required fields: ${missingFields.join(', ')}`,
      400,
      driverConstants.ERROR_CODES.INCOMPLETE_PROFILE
    );
  }

  // Placeholder for compliance checks (e.g., KYC, license verification)
  const complianceStatus = {
    isCompliant: true,
    details: 'All required fields and certifications provided.',
  };

  // Update driver status if compliant
  if (complianceStatus.isCompliant) {
    await driver.update({
      status: driverConstants.DRIVER_STATUSES.ACTIVE,
      updated_at: new Date(),
    });
  }

  // Log audit event
  await auditService.logAction({
    action: 'VERIFY_DRIVER_PROFILE',
    userId: driver.user_id,
    details: `Profile verified for driver_id: ${driverId}, compliant: ${complianceStatus.isCompliant}`,
  });

  // Notify user
  await notificationService.sendNotification({
    userId: driver.user_id,
    type: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_VERIFIED,
    message: formatMessage(
      'driver',
      'profile',
      driver.preferred_language,
      'profile.verified'
    ),
  });

  // Emit real-time event
  await socketService.emitToRoom(`driver:${driver.user_id}`, 'profile:verified', {
    userId: driver.user_id,
    driverId,
    complianceStatus,
  });

  logger.info('Driver profile verified successfully', { driverId, isCompliant: complianceStatus.isCompliant });
  return complianceStatus;
});

module.exports = {
  updateProfile,
  uploadCertification,
  getProfile,
  verifyProfile,
};