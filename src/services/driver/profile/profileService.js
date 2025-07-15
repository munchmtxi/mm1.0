'use strict';

const { Driver } = require('@models');
const driverConstants = require('@constants/driverConstants');
const { formatMessage } = require('@utils/localization');
const validation = require('@utils/validation');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function updateProfile(driverId, details, auditService, notificationService, socketService, pointService) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const { name, email, phone, vehicleType } = details;

  if (email && !validation.validateEmail(email)) {
    throw new AppError('Invalid email format', 400, driverConstants.ERROR_CODES.ERR_INVALID_EMAIL);
  }
  if (phone && !validation.validatePhone(phone)) {
    throw new AppError('Invalid phone format', 400, driverConstants.ERROR_CODES.ERR_INVALID_PHONE);
  }
  if (vehicleType && !Object.values(driverConstants.PROFILE_CONSTANTS.VEHICLE_TYPES).includes(vehicleType)) {
    throw new AppError('Invalid vehicle type', 400, driverConstants.ERROR_CODES.INVALID_VEHICLE_TYPE);
  }

  const updatedFields = {
    name: name || driver.name,
    email: email || driver.email,
    phone: phone || driver.phone,
    vehicle_type: vehicleType || driver.vehicle_type,
    updated_at: new Date(),
  };

  await driver.update(updatedFields);

  await auditService.logAction({
    action: 'UPDATE_DRIVER_PROFILE',
    userId: driver.user_id,
    details: `Driver profile updated for driver_id: ${driverId}`,
  });

  await notificationService.sendNotification({
    userId: driver.user_id,
    type: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
    message: formatMessage('driver', 'profile', driver.preferred_language, 'profile.updated', { driverId }),
  });

  await pointService.awardPoints({
    userId: driver.user_id,
    role: 'driver',
    action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'profile_update').action,
    languageCode: driver.preferred_language,
  });

  socketService.emitToRoom(`driver:${driver.user_id}`, 'profile:updated', {
    userId: driver.user_id,
    driverId,
    updatedFields,
  });

  logger.info('Driver profile updated successfully', { driverId });
  return driver;
}

async function uploadCertification(driverId, certData, auditService, notificationService, socketService, imageService, pointService) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const { file, type } = certData;

  if (!['driver_license', 'insurance'].includes(type)) {
    throw new AppError('Invalid certification type', 400, driverConstants.ERROR_CODES.INVALID_CERTIFICATION_TYPE);
  }

  if (!file || !file.originalname) {
    throw new AppError('Invalid file data', 400, driverConstants.ERROR_CODES.INVALID_FILE_DATA);
  }

  const imageType = type === 'driver_license' ? 'driver_license' : 'driver_insurance';
  const imageUrl = await imageService.uploadImage(driver.user_id, file, imageType);

  const updateField = type === 'driver_license' ? { license_picture_url: imageUrl } : { insurance_picture_url: imageUrl };
  await driver.update({
    ...updateField,
    updated_at: new Date(),
  });

  await auditService.logAction({
    action: 'UPLOAD_DRIVER_CERTIFICATION',
    userId: driver.user_id,
    details: `${type} uploaded for driver_id: ${driverId}, image_url: ${imageUrl}`,
  });

  await notificationService.sendNotification({
    userId: driver.user_id,
    type: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
    message: formatMessage('driver', 'profile', driver.preferred_language, 'profile.certification_updated', { type }),
  });

  await pointService.awardPoints({
    userId: driver.user_id,
    role: 'driver',
    action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'certification_upload').action,
    languageCode: driver.preferred_language,
  });

  socketService.emitToRoom(`driver:${driver.user_id}`, 'profile:certification_updated', {
    userId: driver.user_id,
    driverId,
    type,
    imageUrl,
  });

  logger.info('Driver certification uploaded successfully', { driverId, type, imageUrl });
  return imageUrl;
}

async function getProfile(driverId, auditService, pointService) {
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
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  await auditService.logAction({
    action: 'GET_DRIVER_PROFILE',
    userId: driver.user_id,
    details: `Profile retrieved for driver_id: ${driverId}`,
  });

  await pointService.awardPoints({
    userId: driver.user_id,
    role: 'driver',
    action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'profile_access').action,
    languageCode: driver.preferred_language,
  });

  logger.info('Driver profile retrieved successfully', { driverId });
  return driver;
}

async function verifyProfile(driverId, auditService, notificationService, socketService, pointService) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const requiredFields = ['name', 'email', 'phone', 'vehicle_type', 'license_number', 'license_picture_url'];
  const missingFields = requiredFields.filter(field => !driver[field]);
  if (missingFields.length > 0) {
    throw new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400, driverConstants.ERROR_CODES.INCOMPLETE_PROFILE);
  }

  const complianceStatus = {
    isCompliant: true,
    details: 'All required fields and certifications provided.',
  };

  if (complianceStatus.isCompliant) {
    await driver.update({
      status: driverConstants.DRIVER_STATUSES.ACTIVE,
      updated_at: new Date(),
    });
  }

  await auditService.logAction({
    action: 'VERIFY_DRIVER_PROFILE',
    userId: driver.user_id,
    details: `Profile verified for driver_id: ${driverId}, compliant: ${complianceStatus.isCompliant}`,
  });

  await notificationService.sendNotification({
    userId: driver.user_id,
    type: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_VERIFIED,
    message: formatMessage('driver', 'profile', driver.preferred_language, 'profile.verified'),
  });

  await pointService.awardPoints({
    userId: driver.user_id,
    role: 'driver',
    action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'profile_verification').action,
    languageCode: driver.preferred_language,
  });

  socketService.emitToRoom(`driver:${driver.user_id}`, 'profile:verified', {
    userId: driver.user_id,
    driverId,
    complianceStatus,
  });

  logger.info('Driver profile verified successfully', { driverId, isCompliant: complianceStatus.isCompliant });
  return complianceStatus;
}

module.exports = {
  updateProfile,
  uploadCertification,
  getProfile,
  verifyProfile,
};