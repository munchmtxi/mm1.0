'use strict';

/**
 * Staff Profile Service
 * Handles business logic for staff profile operations, including creation, updates,
 * compliance verification, and retrieval. Integrates with models, services, and utilities
 * for data persistence, notifications, auditing, and real-time updates.
 *
 * Last Updated: May 16, 2025
 */

const { User, Staff, Merchant, MerchantBranch, Wallet } = require('@models');
const { AppError, catchAsync } = require('@utils/errors');
const { validation } = require('@utils/validation');
const notificationService = require('@services/notificationService');
const socketService = require('@services/socketService');
const auditService = require('@services/auditService');
const walletService = require('@services/walletService');
const { formatMessage } = require('@utils/localization/localization');
const staffProfileEvents = require('@socket/events/staff/profile/staffProfileEvents');
const logger = require('@utils/logger');
const locationService = require('@services/locationService');
const staffSystemConstants = require('@constants/staffSystemConstants');
const staffRolesConstants = require('@constants/staffRolesConstants');
const sequelize = require('sequelize');

/**
 * Creates a new staff profile.
 * @param {string} userId - User ID.
 * @param {Object} details - Staff details (merchantId, position, branchId, certifications, geofenceId, bankDetails).
 * @param {Object} auditContext - Audit context (actorId, actorRole, ipAddress).
 * @returns {Promise<Object>} Created staff profile.
 */
const createStaffProfile = catchAsync(async (userId, details, auditContext) => {
  const { merchantId, position, branchId, certifications, geofenceId, bankDetails } = details;
  const { actorId, actorRole, ipAddress } = auditContext;

  // Validate inputs
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError(
      'User not found',
      404,
      staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
      null,
      { userId }
    );
  }
  const merchant = await Merchant.findByPk(merchantId);
  if (!merchant) {
    throw new AppError(
      'Merchant not found',
      404,
      staffSystemConstants.STAFF_ERROR_CODES.INVALID_BRANCH,
      null,
      { merchantId }
    );
  }
  if (!staffRolesConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(position)) {
    throw new AppError(
      'Invalid staff type',
      400,
      staffSystemConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE,
      { allowedTypes: staffRolesConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES },
      { position }
    );
  }
  if (branchId) {
    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch || branch.merchant_id !== merchantId) {
      throw new AppError(
        'Invalid or unauthorized branch',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INVALID_BRANCH,
        { merchantId, branchId },
        { branchId }
      );
    }
    // Validate branch staff limit
    const staffCount = await Staff.count({ where: { branch_id: branchId } });
    if (staffCount >= staffRolesConstants.STAFF_SETTINGS.MAX_STAFF_PER_BRANCH) {
      throw new AppError(
        'Branch staff limit reached',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INVALID_BRANCH,
        { maxStaff: staffRolesConstants.STAFF_SETTINGS.MAX_STAFF_PER_BRANCH, currentStaff: staffCount },
        { branchId }
      );
    }
  }
  if (geofenceId) {
    const geofence = await sequelize.models.Geofence.findByPk(geofenceId);
    if (!geofence) {
      throw new AppError(
        'Invalid geofence',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INVALID_GEOFENCE,
        null,
        { geofenceId }
      );
    }
    // Validate location with supported cities
    const city = merchant.address?.split(',')[0]?.trim() || 'Unknown';
    const supportedCities = staffRolesConstants.STAFF_SETTINGS.SUPPORTED_CITIES[user.country] || [];
    if (!supportedCities.includes(city)) {
      throw new AppError(
        'Unsupported city',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INVALID_GEOFENCE,
        { supportedCities, country: user.country },
        { city }
      );
    }
    await locationService.validateGeofence({
      coordinates: geofence.center,
      formattedAddress: `Geofence: ${geofence.name}`,
      placeId: `geofence_${geofenceId}`,
      countryCode: user.country,
      city,
      components: [],
      locationType: 'GEOMETRIC_CENTER',
    });
  }
  if (certifications) {
    // Validate certifications
    if (!certifications.every(cert => staffRolesConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS.includes(cert))) {
      throw new AppError(
        'Invalid certifications',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INVALID_CERTIFICATION,
        { allowedCertifications: staffRolesConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS },
        { certifications }
      );
    }
    // Check required certifications
    const requiredCerts = staffRolesConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[position] || [];
    if (!requiredCerts.every(cert => certifications.includes(cert))) {
      throw new AppError(
        'Missing required certifications',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.MISSING_CERTIFICATIONS,
        { requiredCertifications: requiredCerts },
        { certifications }
      );
    }
  }
  if (bankDetails) {
    if (!validation.validateBankDetails(bankDetails)) {
      throw new AppError(
        'Invalid bank details',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INVALID_BANK_DETAILS,
        { requiredFields: ['accountNumber', 'routingNumber', 'bankName'] },
        { bankDetails }
      );
    }
    const paymentMethod = bankDetails.method || staffSystemConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS.BANK_TRANSFER;
    if (!Object.values(staffSystemConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS).includes(paymentMethod)) {
      throw new AppError(
        'Invalid payment method',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.PAYMENT_FAILED,
        { allowedMethods: Object.values(staffSystemConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS) },
        { paymentMethod }
      );
    }
  }

  // Validate currency
  const currency = merchant.currency || staffSystemConstants.STAFF_SETTINGS.DEFAULT_CURRENCY;
  if (!staffSystemConstants.STAFF_SETTINGS.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError(
      'Invalid currency',
      400,
      staffSystemConstants.STAFF_ERROR_CODES.INVALID_CURRENCY,
      { supportedCurrencies: staffSystemConstants.STAFF_SETTINGS.SUPPORTED_CURRENCIES },
      { currency }
    );
  }

  // Create staff
  const staff = await Staff.create({
    user_id: userId,
    merchant_id: merchantId,
    position,
    branch_id: branchId,
    geofence_id: geofenceId,
    certifications: certifications || [],
    availability_status: staffRolesConstants.STAFF_STATUSES.PENDING_ONBOARDING,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Create wallet if bankDetails provided
  if (bankDetails) {
    await walletService.createWallet(userId, staffSystemConstants.STAFF_WALLET_CONSTANTS.WALLET_TYPE, currency);
    // Add payment method to wallet
    await walletService.addPaymentMethod(staff.id, {
      type: bankDetails.method || staffSystemConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS.BANK_TRANSFER,
      details: bankDetails,
    });
  }

  // Log audit action
  await auditService.logAction({
    userId: actorId,
    role: actorRole,
    action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_CREATE,
    details: {
      staffId: staff.id,
      userId,
      merchantId,
      position,
      branchId,
      certifications,
      geofenceId,
      bankDetails,
    },
    ipAddress,
    metadata: { context: 'staff_profile_creation' },
  });

  // Notify staff
  await notificationService.sendNotification({
    userId,
    role: 'staff',
    type: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_CREATED,
    message: formatMessage('staff', 'notification', user.preferred_language || staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE, 'profile_created', { staffId: staff.id }),
  });

  // Emit real-time event
  await socketService.emitToRoom(`staff:${userId}`, staffProfileEvents.PROFILE_CREATED, {
    userId,
    staffId: staff.id,
    staffProfile: staff,
  });

  logger.logApiEvent('Staff profile created successfully', { staffId: staff.id, userId });
  return staff;
});

/**
 * Updates staff profile details.
 * @param {string} staffId - Staff ID.
 * @param {Object} details - Update details (userUpdates, staffUpdates, bankDetails).
 * @param {Object} auditContext - Audit context (actorId, actorRole, ipAddress).
 * @returns {Promise<Object>} Updated staff profile.
 */
const updateStaffDetails = catchAsync(async (staffId, details, auditContext) => {
  const { userUpdates, staffUpdates, bankDetails } = details;
  const { actorId, actorRole, ipAddress } = auditContext;

  // Validate inputs
  const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
  if (!staff) {
    throw new AppError(
      'Staff not found',
      404,
      staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
      null,
      { staffId }
    );
  }

  // Validate user updates
  if (userUpdates) {
    const allowedUserFields = ['first_name', 'last_name', 'email', 'phone', 'preferred_language', 'country'];
    const invalidFields = Object.keys(userUpdates).filter(field => !allowedUserFields.includes(field));
    if (invalidFields.length > 0) {
      throw new AppError(
        'Invalid user update fields',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE,
        { allowedFields: allowedUserFields, invalidFields },
        { userUpdates }
      );
    }
    if (userUpdates.email && !validation.isEmail(userUpdates.email)) {
      throw new AppError(
        'Invalid email format',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INVALID_EMAIL,
        { email: userUpdates.email },
        { userUpdates }
      );
    }
    if (userUpdates.phone && !validation.isPhoneNumber(userUpdates.phone)) {
      throw new AppError(
        'Invalid phone number format',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INVALID_PHONE,
        { phone: userUpdates.phone },
        { userUpdates }
      );
    }
    if (userUpdates.preferred_language && !staffSystemConstants.STAFF_SETTINGS.SUPPORTED_LANGUAGES.includes(userUpdates.preferred_language)) {
      throw new AppError(
        'Invalid language',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE,
        { supportedLanguages: staffSystemConstants.STAFF_SETTINGS.SUPPORTED_LANGUAGES },
        { preferred_language: userUpdates.preferred_language }
      );
    }
    if (userUpdates.country && !Object.keys(staffRolesConstants.STAFF_SETTINGS.SUPPORTED_CITIES).includes(userUpdates.country)) {
      throw new AppError(
        'Invalid country',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE,
        { supportedCountries: Object.keys(staffRolesConstants.STAFF_SETTINGS.SUPPORTED_CITIES) },
        { country: userUpdates.country }
      );
    }
  }

  // Validate staff updates
  if (staffUpdates) {
    const allowedStaffFields = ['position', 'branch_id', 'geofence_id', 'certifications', 'assigned_area', 'availability_status'];
    const invalidFields = Object.keys(staffUpdates).filter(field => !allowedStaffFields.includes(field));
    if (invalidFields.length > 0) {
      throw new AppError(
        'Invalid staff update fields',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE,
        { allowedFields: allowedStaffFields, invalidFields },
        { staffUpdates }
      );
    }
    if (staffUpdates.position && !staffRolesConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(staffUpdates.position)) {
      throw new AppError(
        'Invalid staff type',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE,
        { allowedTypes: staffRolesConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES },
        { position: staffUpdates.position }
      );
    }
    if (staffUpdates.branch_id) {
      const branch = await MerchantBranch.findByPk(staffUpdates.branch_id);
      if (!branch || branch.merchant_id !== staff.merchant_id) {
        throw new AppError(
          'Invalid or unauthorized branch',
          400,
          staffSystemConstants.STAFF_ERROR_CODES.INVALID_BRANCH,
          { merchantId: staff.merchant_id, branchId: staffUpdates.branch_id },
          { branchId: staffUpdates.branch_id }
        );
      }
    }
    if (staffUpdates.geofence_id) {
      const geofence = await sequelize.models.Geofence.findByPk(staffUpdates.geofence_id);
      if (!geofence) {
        throw new AppError(
          'Invalid geofence',
          400,
          staffSystemConstants.STAFF_ERROR_CODES.INVALID_GEOFENCE,
          null,
          { geofenceId: staffUpdates.geofence_id }
        );
      }
      const city = staff.user.address?.split(',')[0]?.trim() || 'Unknown';
      const supportedCities = staffRolesConstants.STAFF_SETTINGS.SUPPORTED_CITIES[staff.user.country] || [];
      if (!supportedCities.includes(city)) {
        throw new AppError(
          'Unsupported city',
          400,
          staffSystemConstants.STAFF_ERROR_CODES.INVALID_GEOFENCE,
          { supportedCities, country: staff.user.country },
          { city }
        );
      }
      await locationService.validateGeofence({
        coordinates: geofence.center,
        formattedAddress: `Geofence: ${geofence.name}`,
        placeId: `geofence_${staffUpdates.geofence_id}`,
        countryCode: staff.user.country,
        city,
        components: [],
        locationType: 'GEOMETRIC_CENTER',
      });
    }
    if (staffUpdates.certifications) {
      if (!staffUpdates.certifications.every(cert => staffRolesConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS.includes(cert))) {
        throw new AppError(
          'Invalid certifications',
          400,
          staffSystemConstants.STAFF_ERROR_CODES.INVALID_CERTIFICATION,
          { allowedCertifications: staffRolesConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS },
          { certifications: staffUpdates.certifications }
        );
      }
      const requiredCerts = staffRolesConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[staffUpdates.position || staff.position] || [];
      if (!requiredCerts.every(cert => staffUpdates.certifications.includes(cert))) {
        throw new AppError(
          'Missing required certifications',
          400,
          staffSystemConstants.STAFF_ERROR_CODES.MISSING_CERTIFICATIONS,
          { requiredCertifications: requiredCerts },
          { certifications: staffUpdates.certifications }
        );
      }
    }
    if (staffUpdates.availability_status && !Object.values(staffRolesConstants.STAFF_STATUSES).includes(staffUpdates.availability_status)) {
      throw new AppError(
        'Invalid availability status',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE,
        { allowedStatuses: Object.values(staffRolesConstants.STAFF_STATUSES) },
        { availability_status: staffUpdates.availability_status }
      );
    }
  }

  // Validate bank details
  if (bankDetails) {
    if (!validation.validateBankDetails(bankDetails)) {
      throw new AppError(
        'Invalid bank details',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.INVALID_BANK_DETAILS,
        { requiredFields: ['accountNumber', 'routingNumber', 'bankName'] },
        { bankDetails }
      );
    }
    const paymentMethod = bankDetails.method || staffSystemConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS.BANK_TRANSFER;
    if (!Object.values(staffSystemConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS).includes(paymentMethod)) {
      throw new AppError(
        'Invalid payment method',
        400,
        staffSystemConstants.STAFF_ERROR_CODES.PAYMENT_FAILED,
        { allowedMethods: Object.values(staffSystemConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS) },
        { paymentMethod }
      );
    }
  }

  // Update user
  if (userUpdates) {
    await staff.user.update({
      ...userUpdates,
      updated_at: new Date(),
    });
  }

  // Update staff
  if (staffUpdates) {
    await staff.update({
      ...staffUpdates,
      updated_at: new Date(),
    });
  }

  // Update or create wallet
  if (bankDetails) {
    let wallet = await Wallet.findOne({ where: { staff_id: staffId } });
    if (!wallet) {
      wallet = await walletService.createWallet(staff.user_id, staffSystemConstants.STAFF_WALLET_CONSTANTS.WALLET_TYPE, staff.currency || staffSystemConstants.STAFF_SETTINGS.DEFAULT_CURRENCY);
    }
    await walletService.addPaymentMethod(wallet.id, {
      type: bankDetails.method || staffSystemConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS.BANK_TRANSFER,
      details: bankDetails,
    });
  }

  // Log audit action
  await auditService.logAction({
    userId: actorId,
    role: actorRole,
    action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
    details: {
      staffId,
      userId: staff.user_id,
      userUpdates,
      staffUpdates,
      bankDetails,
    },
    ipAddress,
    metadata: { context: 'staff_profile_update' },
  });

  // Notify staff
  await notificationService.sendNotification({
    userId: staff.user_id,
    role: 'staff',
    type: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
    message: formatMessage('staff', 'notification', staff.user.preferred_language || staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE, 'profile_updated', { staffId }),
  });

  // Emit real-time event
  await socketService.emitToRoom(`staff:${staff.user_id}`, staffProfileEvents.PROFILE_UPDATED, {
    userId: staff.user_id,
    staffId,
    updatedFields: { ...userUpdates, ...staffUpdates, bankDetails },
  });

  logger.logApiEvent('Staff profile updated successfully', { staffId, userId: staff.user_id });
  return { user: staff.user, staff, bankDetails };
});

/**
 * Verifies staff compliance with certifications and profile completeness.
 * @param {string} staffId - Staff ID.
 * @param {Object} auditContext - Audit context (actorId, actorRole, ipAddress).
 * @returns {Promise<Object>} Compliance status and details.
 */
const verifyCompliance = catchAsync(async (staffId, auditContext) => {
  const { actorId, actorRole, ipAddress } = auditContext;

  const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
  if (!staff) {
    throw new AppError(
      'Staff not found',
      404,
      staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
      null,
      { staffId }
    );
  }

  // Check profile completeness
  const requiredUserFields = ['first_name', 'last_name', 'email', 'phone', 'country'];
  const missingUserFields = requiredUserFields.filter(field => !staff.user[field]);
  if (missingUserFields.length > 0) {
    const reason = `Missing user fields: ${missingUserFields.join(', ')}`;
    await notificationService.sendNotification({
      userId: staff.user_id,
      role: 'staff',
      type: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message: formatMessage('staff', 'notification', staff.user.preferred_language || staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE, 'profile_compliance_failed', { reason }),
    });
    await socketService.emitToRoom(`staff:${staff.user_id}`, staffProfileEvents.COMPLIANCE_FAILED, {
      userId: staff.user_id,
      staffId,
      reason,
    });

    // Log audit action
    await auditService.logAction({
      userId: actorId,
      role: actorRole,
      action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_COMPLIANCE_VERIFY,
      details: {
        staffId,
        userId: staff.user_id,
        isCompliant: false,
        reason,
      },
      ipAddress,
      metadata: { context: 'staff_compliance_verification' },
    });

    logger.logWarnEvent('Staff compliance verification failed due to missing user fields', { staffId, missingUserFields });
    return { isCompliant: false, missingFields: missingUserFields };
  }

  // Check certifications
  const requiredCerts = staffRolesConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[staff.position] || [];
  const missingCertifications = requiredCerts.filter(cert => !staff.certifications.includes(cert));
  if (missingCertifications.length > 0) {
    const reason = `Missing certifications: ${missingCertifications.join(', ')}`;
    await notificationService.sendNotification({
      userId: staff.user_id,
      role: 'staff',
      type: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message: formatMessage('staff', 'notification', staff.user.preferred_language || staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE, 'profile_compliance_failed', { reason }),
    });
    await socketService.emitToRoom(`staff:${staff.user_id}`, staffProfileEvents.COMPLIANCE_FAILED, {
      userId: staff.user_id,
      staffId,
      reason,
    });

    // Log audit action
    await auditService.logAction({
      userId: actorId,
      role: actorRole,
      action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_COMPLIANCE_VERIFY,
      details: {
        staffId,
        userId: staff.user_id,
        isCompliant: false,
        reason,
      },
      ipAddress,
      metadata: { context: 'staff_compliance_verification' },
    });

    logger.logWarnEvent('Staff compliance verification failed due to missing certifications', { staffId, missingCertifications });
    return { isCompliant: false, missingCertifications };
  }

  // Notify compliance success
  await notificationService.sendNotification({
    userId: staff.user_id,
    role: 'staff',
    type: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
    message: formatMessage('staff', 'notification', staff.user.preferred_language || staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE, 'profile_verified'),
  });

  // Log audit action
  await auditService.logAction({
    userId: actorId,
    role: actorRole,
    action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_COMPLIANCE_VERIFY,
    details: {
      staffId,
      userId: staff.user_id,
      isCompliant: true,
    },
    ipAddress,
    metadata: { context: 'staff_compliance_verification' },
  });

  // Emit real-time event
  await socketService.emitToRoom(`staff:${staff.user_id}`, staffProfileEvents.COMPLIANCE_VERIFIED, {
    userId: staff.user_id,
    staffId,
    complianceStatus: { isCompliant: true },
  });

  logger.logApiEvent('Staff compliance verified successfully', { staffId, userId: staff.user_id });
  return { isCompliant: true };
});

/**
 * Retrieves staff profile details.
 * @param {string} staffId - Staff ID.
 * @param {Object} auditContext - Audit context (actorId, actorRole, ipAddress).
 * @returns {Promise<Object>} Staff profile with associated data.
 */
const getStaffProfile = catchAsync(async (staffId, auditContext) => {
  const { actorId, actorRole, ipAddress } = auditContext;

  const staff = await Staff.findByPk(staffId, {
    include: [
      { model: User, as: 'user' },
      { model: Merchant, as: 'merchant' },
      { model: MerchantBranch, as: 'branch' },
      { model: Wallet, as: 'wallet' },
    ],
  });
  if (!staff) {
    throw new AppError(
      'Staff not found',
      404,
      staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
      null,
      { staffId }
    );
  }

  // Log audit action
  await auditService.logAction({
    userId: actorId,
    role: actorRole,
    action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
    details: {
      staffId,
      userId: staff.user_id,
    },
    ipAddress,
    metadata: { context: 'staff_profile_retrieval' },
  });

  // Emit real-time event
  await socketService.emitToRoom(`staff:${staff.user_id}`, staffProfileEvents.PROFILE_RETRIEVED, {
    userId: staff.user_id,
    staffId,
    staffProfile: staff,
  });

  logger.logApiEvent('Staff profile retrieved successfully', { staffId, userId: staff.user_id });
  return staff;
});

module.exports = {
  createStaffProfile,
  updateStaffDetails,
  verifyCompliance,
  getStaffProfile,
};