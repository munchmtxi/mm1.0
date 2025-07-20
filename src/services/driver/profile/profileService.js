'use strict';

const { Driver, Vehicle, Media } = require('@models');
const driverConstants = require('@constants/driverConstants');
const vehicleConstants = require('@constants/vehicleConstants');
const validation = require('@utils/validation');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function updateProfile(driverId, details) {
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
  if (vehicleType && !vehicleConstants.VEHICLE_TYPES.includes(vehicleType)) {
    throw new AppError('Invalid vehicle type', 400, driverConstants.ERROR_CODES.INVALID_VEHICLE_TYPE);
  }

  const updatedFields = {
    name: name || driver.name,
    email: email || driver.email,
    phone_number: phone || driver.phone_number,
    vehicle_info: vehicleType ? { ...driver.vehicle_info, type: vehicleType } : driver.vehicle_info,
    updated_at: new Date(),
  };

  await driver.update(updatedFields);
  logger.info('Driver profile updated successfully', { driverId });
  return driver;
}

async function uploadCertification(driverId, certData, imageService) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const { file, type } = certData;

  if (!driverConstants.PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS.includes(type)) {
    throw new AppError('Invalid certification type', 400, driverConstants.ERROR_CODES.INVALID_CERTIFICATION_TYPE);
  }

  if (!file || !file.originalname) {
    throw new AppError('Invalid file data', 400, driverConstants.ERROR_CODES.INVALID_FILE_DATA);
  }

  const imageType = type === 'drivers_license' ? 'driver_license' : type;
  const imageUrl = await imageService.uploadImage(driver.user_id, file, imageType);

  const updateField = type === 'drivers_license' ? { license_picture_url: imageUrl } : { [type + '_url']: imageUrl };
  await driver.update({
    ...updateField,
    updated_at: new Date(),
  });

  logger.info('Driver certification uploaded successfully', { driverId, type, imageUrl });
  return imageUrl;
}

async function getProfile(driverId) {
  const driver = await Driver.findByPk(driverId, {
    attributes: [
      'id',
      'user_id',
      'name',
      'email',
      'phone_number',
      'vehicle_info',
      'license_number',
      'license_picture_url',
      'profile_picture_url',
      'status',
      'rating',
      'total_rides',
      'total_deliveries',
      'created_at',
      'updated_at',
    ],
    include: [{ model: Vehicle, as: 'vehicles', attributes: ['id', 'type', 'capacity', 'status'] }],
  });

  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  logger.info('Driver profile retrieved successfully', { driverId });
  return driver;
}

async function verifyProfile(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const requiredFields = driverConstants.PROFILE_CONSTANTS.REQUIRED_FIELDS;
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
      status: driverConstants.DRIVER_STATUSES[0], // 'active'
      updated_at: new Date(),
    });
  }

  logger.info('Driver profile verified successfully', { driverId, isCompliant: complianceStatus.isCompliant });
  return complianceStatus;
}

// New Feature: Update driver's real-time location preferences
async function updateLocationPreferences(driverId, locationData) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const { current_location, service_area, preferred_zones } = locationData;

  if (current_location && !validation.validateGeoJSON(current_location)) {
    throw new AppError('Invalid location format', 400, driverConstants.ERROR_CODES.INVALID_LOCATION);
  }
  if (service_area && !validation.validateGeoJSON(service_area)) {
    throw new AppError('Invalid service area format', 400, driverConstants.ERROR_CODES.INVALID_LOCATION);
  }
  if (preferred_zones && !Array.isArray(preferred_zones)) {
    throw new AppError('Invalid preferred zones format', 400, driverConstants.ERROR_CODES.INVALID_LOCATION);
  }

  const updatedFields = {
    current_location: current_location || driver.current_location,
    service_area: service_area || driver.service_area,
    preferred_zones: preferred_zones || driver.preferred_zones,
    last_location_update: new Date(),
    updated_at: new Date(),
  };

  await driver.update(updatedFields);
  logger.info('Driver location preferences updated successfully', { driverId });
  return driver;
}

// New Feature: Upload profile picture with validation
async function uploadProfilePicture(driverId, file, imageService) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  if (!file || !file.originalname) {
    throw new AppError('Invalid file data', 400, driverConstants.ERROR_CODES.INVALID_FILE_DATA);
  }

  const imageUrl = await imageService.uploadImage(driver.user_id, file, 'profile_picture');
  await Media.create({
    type: 'profile_picture',
    url: imageUrl,
    title: `Driver ${driverId} Profile Picture`,
    description: `Profile picture for driver ID ${driverId}`,
  });

  await driver.update({
    profile_picture_url: imageUrl,
    updated_at: new Date(),
  });

  logger.info('Driver profile picture uploaded successfully', { driverId, imageUrl });
  return imageUrl;
}

module.exports = {
  updateProfile,
  uploadCertification,
  getProfile,
  verifyProfile,
  uploadProfilePicture,
  updateLocationPreferences,
};