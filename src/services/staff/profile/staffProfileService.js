// staffProfileService.js
// Revolutionary staff profile management with dynamic role validation, compliance automation, and media handling.
// Last Updated: July 15, 2025

'use strict';

const { User, Staff, Merchant, MerchantBranch, Wallet, Media } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const logger = require('@utils/logger');
const { handleServiceError } = require('@utils/errorHandling');
const AppError = require('@utils/AppError');

// Role-specific constants
const stockClerkConstants = require('@constants/staff/stockClerkConstants');
const managerConstants = require('@constants/staff/managerConstants');
const frontOfHouseConstants = require('@constants/staff/frontOfHouseConstants');
const driverConstants = require('@constants/staff/driverConstants');
const chefConstants = require('@constants/staff/chefConstants');
const cashierConstants = require('@constants/staff/cashierConstants');
const carParkOperativeConstants = require('@constants/staff/carParkOperativeConstants');
const butcherConstants = require('@constants/staff/butcherConstants');
const baristaConstants = require('@constants/staff/baristaConstants');

const roleConstantsMap = {
  stock_clerk: stockClerkConstants,
  manager: managerConstants,
  front_of_house: frontOfHouseConstants,
  driver: driverConstants,
  chef: chefConstants,
  cashier: cashierConstants,
  car_park_operative: carParkOperativeConstants,
  butcher: butcherConstants,
  barista: baristaConstants,
};

async function createStaffProfile(userId, details) {
  try {
    const { merchantId, staffTypes, branchId, certifications, geofenceId, bankDetails, workLocation } = details;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError(
        'User not found',
        404,
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        null,
        { userId }
      );
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant || !merchantConstants.MERCHANT_TYPES.includes(merchant.business_type)) {
      throw new AppError(
        'Invalid merchant or business type',
        400,
        staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH,
        null,
        { merchantId, business_type: merchant?.business_type }
      );
    }

    // Validate staff types
    if (!Array.isArray(staffTypes) || !staffTypes.every(type => staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(type))) {
      throw new AppError(
        'Invalid staff type(s)',
        400,
        staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE,
        null,
        { staffTypes }
      );
    }

    // Validate merchant type compatibility
    for (const type of staffTypes) {
      const roleConstants = roleConstantsMap[type];
      if (roleConstants && !roleConstants.SUPPORTED_MERCHANT_TYPES.includes(merchant.business_type)) {
        throw new AppError(
          `Staff type ${type} not supported for merchant type ${merchant.business_type}`,
          400,
          staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH,
          null,
          { staffType: type, merchantType: merchant.business_type }
        );
      }
    }

    if (branchId) {
      const branch = await MerchantBranch.findByPk(branchId);
      if (!branch || branch.merchant_id !== merchantId) {
        throw new AppError(
          'Invalid branch or merchant mismatch',
          400,
          staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH,
          null,
          { branchId, merchantId }
        );
      }
      const staffCount = await Staff.count({ where: { branch_id: branchId } });
      if (staffCount >= staffConstants.STAFF_SETTINGS.MAX_STAFF_PER_BRANCH) {
        throw new AppError(
          'Branch staff limit exceeded',
          400,
          staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH,
          null,
          { branchId, staffCount }
        );
      }
    }

    if (geofenceId) {
      const city = merchant.address?.split(',')[0]?.trim() || 'Unknown';
      const supportedCities = localizationConstants.SUPPORTED_CITIES[user.country] || [];
      if (!supportedCities.includes(city)) {
        throw new AppError(
          'Invalid geofence for merchant city',
          400,
          staffConstants.STAFF_ERROR_CODES.INVALID_GEOFENCE,
          null,
          { geofenceId, city, country: user.country }
        );
      }
    }

    if (certifications) {
      if (!certifications.every(cert => staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS.includes(cert))) {
        throw new AppError(
          'Invalid certification(s)',
          400,
          staffConstants.STAFF_ERROR_CODES.INVALID_CERTIFICATION,
          null,
          { certifications }
        );
      }
      for (const type of staffTypes) {
        const roleConstants = roleConstantsMap[type];
        const requiredCerts = roleConstants?.CERTIFICATIONS?.REQUIRED || staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[type] || [];
        if (!requiredCerts.every(cert => certifications.includes(cert))) {
          throw new AppError(
            `Missing required certifications for ${type}`,
            400,
            staffConstants.STAFF_ERROR_CODES.MISSING_CERTIFICATIONS,
            null,
            { staffType: type, requiredCerts }
          );
        }
      }
    }

    if (bankDetails) {
      if (!bankDetails.accountNumber || !bankDetails.routingNumber || !bankDetails.bankName) {
        throw new AppError(
          'Invalid bank details',
          400,
          staffConstants.STAFF_ERROR_CODES.INVALID_BANK_DETAILS,
          null,
          { bankDetails }
        );
      }
      const paymentMethod = bankDetails.method || staffConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS[0];
      if (!staffConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS.includes(paymentMethod)) {
        throw new AppError(
          'Invalid payment method',
          400,
          staffConstants.STAFF_ERROR_CODES.PAYMENT_FAILED,
          null,
          { paymentMethod }
        );
      }
    }

    const currency = merchant.currency || localizationConstants.DEFAULT_CURRENCY;
    if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
      throw new AppError(
        'Invalid currency',
        400,
        staffConstants.STAFF_ERROR_CODES.INVALID_CURRENCY,
        null,
        { currency }
      );
    }

    // Initialize performance metrics
    const performanceMetrics = {};
    staffTypes.forEach(type => {
      const roleConstants = roleConstantsMap[type];
      if (roleConstants?.ANALYTICS_CONSTANTS?.METRICS) {
        roleConstants.ANALYTICS_CONSTANTS.METRICS.forEach(metric => {
          performanceMetrics[metric] = 0; // Initialize metrics
        });
      }
    });

    const staff = await Staff.create({
      user_id: userId,
      merchant_id: merchantId,
      staff_types: staffTypes,
      branch_id: branchId,
      geofence_id: geofenceId,
      certifications: certifications || [],
      availability_status: staffConstants.STAFF_STATUSES[2], // pending_onboarding
      work_location: workLocation,
      performance_metrics: performanceMetrics,
      created_at: new Date(),
      updated_at: new Date(),
    });

    logger.logApiEvent('Staff profile created', { userId, merchantId, staffTypes, action: staffConstants.STAFF_AUDIT_ACTIONS[0] });
    return staff;
  } catch (error) {
    logger.logErrorEvent('Error creating staff profile', { error: error.message, userId, action: staffConstants.STAFF_AUDIT_ACTIONS[0] });
    throw handleServiceError('createStaffProfile', error, error.errorCode || staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
  }
}

async function updateStaffDetails(staffId, details) {
  try {
    const { userUpdates, staffUpdates, bankDetails } = details;

    const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }, { model: Merchant, as: 'merchant' }] });
    if (!staff) {
      throw new AppError(
        'Staff not found',
        404,
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        null,
        { staffId }
      );
    }

    if (userUpdates) {
      const allowedUserFields = ['first_name', 'last_name', 'email', 'phone', 'preferred_language', 'country'];
      const invalidFields = Object.keys(userUpdates).filter(field => !allowedUserFields.includes(field));
      if (invalidFields.length > 0) {
        throw new AppError(
          'Invalid user fields provided',
          400,
          staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE,
          null,
          { invalidFields }
        );
      }

      if (userUpdates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userUpdates.email)) {
        throw new AppError(
          'Invalid email format',
          400,
          staffConstants.STAFF_ERROR_CODES.INVALID_EMAIL,
          null,
          { email: userUpdates.email }
        );
      }
      if (userUpdates.phone && !/^\+?[1-9]\d{1,14}$/.test(userUpdates.phone)) {
        throw new AppError(
          'Invalid phone format',
          400,
          staffConstants.STAFF_ERROR_CODES.INVALID_PHONE,
          null,
          { phone: userUpdates.phone }
        );
      }
      if (userUpdates.preferred_language && !localizationConstants.SUPPORTED_LANGUAGES.includes(userUpdates.preferred_language)) {
        throw new AppError(
          'Invalid preferred language',
          400,
          staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE,
          null,
          { preferred_language: userUpdates.preferred_language }
        );
      }
      if (userUpdates.country && !localizationConstants.SUPPORTED_COUNTRIES.includes(userUpdates.country)) {
        throw new AppError(
          'Invalid country',
          400,
          staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE,
          null,
          { country: userUpdates.country }
        );
      }
    }

    if (staffUpdates) {
      const allowedStaffFields = ['staff_types', 'branch_id', 'geofence_id', 'certifications', 'assigned_area', 'availability_status', 'work_location', 'performance_metrics'];
      const invalidFields = Object.keys(staffUpdates).filter(field => !allowedStaffFields.includes(field));
      if (invalidFields.length > 0) {
        throw new AppError(
          'Invalid staff fields provided',
          400,
          staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE,
          null,
          { invalidFields }
        );
      }

      if (staffUpdates.staff_types) {
        if (!Array.isArray(staffUpdates.staff_types) || !staffUpdates.staff_types.every(type => staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(type))) {
          throw new AppError(
            'Invalid staff type(s)',
            400,
            staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE,
            null,
            { staffTypes: staffUpdates.staff_types }
          );
        }
        for (const type of staffUpdates.staff_types) {
          const roleConstants = roleConstantsMap[type];
          if (roleConstants && !roleConstants.SUPPORTED_MERCHANT_TYPES.includes(staff.merchant.business_type)) {
            throw new AppError(
              `Staff type ${type} not supported for merchant type ${staff.merchant.business_type}`,
              400,
              staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH,
              null,
              { staffType: type, merchantType: staff.merchant.business_type }
            );
          }
        }
      }

      if (staffUpdates.branch_id) {
        const branch = await MerchantBranch.findByPk(staffUpdates.branch_id);
        if (!branch || branch.merchant_id !== staff.merchant_id) {
          throw new AppError(
            'Invalid branch or merchant mismatch',
            400,
            staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH,
            null,
            { branchId: staffUpdates.branch_id, merchantId: staff.merchant_id }
          );
        }
      }

      if (staffUpdates.geofence_id) {
        const city = staff.merchant.address?.split(',')[0]?.trim() || 'Unknown';
        const supportedCities = localizationConstants.SUPPORTED_CITIES[staff.user.country] || [];
        if (!supportedCities.includes(city)) {
          throw new AppError(
            'Invalid geofence for merchant city',
            400,
            staffConstants.STAFF_ERROR_CODES.INVALID_GEOFENCE,
            null,
            { geofenceId: staffUpdates.geofence_id, city, country: staff.user.country }
          );
        }
      }

      if (staffUpdates.certifications) {
        if (!staffUpdates.certifications.every(cert => staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS.includes(cert))) {
          throw new AppError(
            'Invalid certification(s)',
            400,
            staffConstants.STAFF_ERROR_CODES.INVALID_CERTIFICATION,
            null,
            { certifications: staffUpdates.certifications }
          );
        }
        const staffTypes = staffUpdates.staff_types || staff.staff_types;
        for (const type of staffTypes) {
          const roleConstants = roleConstantsMap[type];
          const requiredCerts = roleConstants?.CERTIFICATIONS?.REQUIRED || staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[type] || [];
          if (!requiredCerts.every(cert => staffUpdates.certifications.includes(cert))) {
            throw new AppError(
              `Missing required certifications for ${type}`,
              400,
              staffConstants.STAFF_ERROR_CODES.MISSING_CERTIFICATIONS,
              null,
              { staffType: type, requiredCerts }
            );
          }
        }
      }

      if (staffUpdates.availability_status && !staffConstants.STAFF_STATUSES.includes(staffUpdates.availability_status)) {
        throw new AppError(
          'Invalid availability status',
          400,
          staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE,
          null,
          { availability_status: staffUpdates.availability_status }
        );
      }

      if (staffUpdates.performance_metrics) {
        const staffTypes = staffUpdates.staff_types || staff.staff_types;
        for (const type of staffTypes) {
          const roleConstants = roleConstantsMap[type];
          const validMetrics = roleConstants?.ANALYTICS_CONSTANTS?.METRICS || [];
          const invalidMetrics = Object.keys(staffUpdates.performance_metrics).filter(metric => !validMetrics.includes(metric));
          if (invalidMetrics.length > 0) {
            throw new AppError(
              `Invalid performance metrics for ${type}`,
              400,
              staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE,
              null,
              { invalidMetrics }
            );
          }
        }
      }
    }

    if (bankDetails) {
      if (!bankDetails.accountNumber || !bankDetails.routingNumber || !bankDetails.bankName) {
        throw new AppError(
          'Invalid bank details',
          400,
          staffConstants.STAFF_ERROR_CODES.INVALID_BANK_DETAILS,
          null,
          { bankDetails }
        );
      }
      const paymentMethod = bankDetails.method || staffConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS[0];
      if (!staffConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS.includes(paymentMethod)) {
        throw new AppError(
          'Invalid payment method',
          400,
          staffConstants.STAFF_ERROR_CODES.PAYMENT_FAILED,
          null,
          { paymentMethod }
        );
      }
    }

    if (userUpdates) {
      await staff.user.update({
        ...userUpdates,
        updated_at: new Date(),
      });
    }

    if (staffUpdates) {
      await staff.update({
        ...staffUpdates,
        updated_at: new Date(),
      });
    }

    logger.logApiEvent('Staff profile updated', { staffId, action: staffConstants.STAFF_AUDIT_ACTIONS[1] });
    return { user: staff.user, staff };
  } catch (error) {
    logger.logErrorEvent('Error updating staff profile', { error: error.message, staffId, action: staffConstants.STAFF_AUDIT_ACTIONS[1] });
    throw handleServiceError('updateStaffDetails', error, error.errorCode || staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
  }
}

async function verifyCompliance(staffId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
    if (!staff) {
      throw new AppError(
        'Staff not found',
        404,
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        null,
        { staffId }
      );
    }

    const requiredUserFields = ['first_name', 'last_name', 'email', 'phone', 'country'];
    const missingUserFields = requiredUserFields.filter(field => !staff.user[field]);
    if (missingUserFields.length > 0) {
      return { isCompliant: false, missingFields: missingUserFields };
    }

    const missingCertifications = [];
    for (const type of staff.staff_types) {
      const roleConstants = roleConstantsMap[type];
      const requiredCerts = roleConstants?.CERTIFICATIONS?.REQUIRED || staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[type] || [];
      const missing = requiredCerts.filter(cert => !staff.certifications.includes(cert));
      missingCertifications.push(...missing);
    }

    if (missingCertifications.length > 0) {
      return { isCompliant: false, missingCertifications };
    }

    // Check certification expiry
    for (const cert of staff.certifications) {
      const expiryDays = Object.values(roleConstantsMap).find(c => c.CERTIFICATIONS?.REQUIRED.includes(cert))?.CERTIFICATIONS?.EXPIRY_DAYS || 365;
      const certDate = staff.updated_at; // Assuming certification date is tied to last update
      const expiryDate = new Date(certDate.getTime() + expiryDays * 24 * 60 * 60 * 1000);
      if (new Date() > expiryDate) {
        return { isCompliant: false, expiredCertifications: [cert] };
      }
    }

    logger.logApiEvent('Staff compliance verified', { staffId, action: staffConstants.STAFF_AUDIT_ACTIONS[2] });
    return { isCompliant: true };
  } catch (error) {
    logger.logErrorEvent('Error verifying staff compliance', { error: error.message, staffId, action: staffConstants.STAFF_AUDIT_ACTIONS[2] });
    throw handleServiceError('verifyCompliance', error, error.errorCode || staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
  }
}

async function getStaffProfile(staffId) {
  try {
    const staff = await Staff.findByPk(staffId, {
      include: [
        { model: User, as: 'user' },
        { model: Merchant, as: 'merchant' },
        { model: MerchantBranch, as: 'branch' },
        { model: Wallet, as: 'wallet' },
        { model: Media, as: 'media', where: { type: 'profile_picture' }, required: false },
      ],
    });
    if (!staff) {
      throw new AppError(
        'Staff not found',
        404,
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        null,
        { staffId }
      );
    }

    logger.logApiEvent('Staff profile retrieved', { staffId, action: staffConstants.STAFF_AUDIT_ACTIONS[3] });
    return staff;
  } catch (error) {
    logger.logErrorEvent('Error retrieving staff profile', { error: error.message, staffId, action: staffConstants.STAFF_AUDIT_ACTIONS[3] });
    throw handleServiceError('getStaffProfile', error, error.errorCode || staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
  }
}

async function addOrUpdateStaffPicture(staffId, pictureDetails) {
  try {
    const { url, title, description } = pictureDetails;

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }, { model: MerchantBranch, as: 'branch' }] });
    if (!staff) {
      throw new AppError(
        'Staff not found',
        404,
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        null,
        { staffId }
      );
    }

    if (!url || !merchantConstants.SOCIAL_MEDIA_CONSTANTS.ALLOWED_MEDIA_TYPES.some(type => url.endsWith(type))) {
      throw new AppError(
        'Invalid picture URL or format',
        400,
        staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE,
        null,
        { url, allowedTypes: merchantConstants.SOCIAL_MEDIA_CONSTANTS.ALLOWED_MEDIA_TYPES }
      );
    }

    // Validate file size (assuming metadata includes size)
    if (pictureDetails.size && pictureDetails.size > merchantConstants.SOCIAL_MEDIA_CONSTANTS.MAX_MEDIA_SIZE_MB * 1024 * 1024) {
      throw new AppError(
        'Picture size exceeds limit',
        400,
        staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE,
        null,
        { size: pictureDetails.size, maxSize: merchantConstants.SOCIAL_MEDIA_CONSTANTS.MAX_MEDIA_SIZE_MB }
      );
    }

    // Check for existing profile picture
    const existingPicture = await Media.findOne({
      where: { staff_id: staffId, type: 'profile_picture' },
    });

    const mediaData = {
      staff_id: staffId,
      merchant_id: staff.merchant_id,
      branch_id: staff.branch_id || null,
      type: 'profile_picture',
      url,
      title: title || 'Staff Profile Picture',
      description: description || `Profile picture for staff ${staffId}`,
      created_at: new Date(),
      updated_at: new Date(),
    };

    let media;
    if (existingPicture) {
      media = await existingPicture.update(mediaData);
      logger.logApiEvent('Staff profile picture updated', { staffId, mediaId: media.id });
    } else {
      media = await Media.create(mediaData);
      logger.logApiEvent('Staff profile picture added', { staffId, mediaId: media.id });
    }

    return media;
  } catch (error) {
    logger.logErrorEvent('Error adding/updating staff picture', { error: error.message, staffId });
    throw handleServiceError('addOrUpdateStaffPicture', error, error.errorCode || staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE);
  }
}

module.exports = {
  createStaffProfile,
  updateStaffDetails,
  verifyCompliance,
  getStaffProfile,
  addOrUpdateStaffPicture,
};