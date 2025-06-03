'use strict';

/**
 * Admin Profile Controller
 * Handles HTTP requests for admin profile operations, interacting with adminProfileService
 * and returning JSON responses.
 */

const adminProfileService = require('@services/admin/profile/adminProfileService');
const localization = require('@utils/localization/localization');
const errorHandling = require('@utils/errorHandling');
const catchAsync = require('@utils/catchAsync');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');
const adminEngagementConstants = require('@constants/admin/adminEngagementConstants');

/**
 * Creates a new admin account.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const createAdmin = catchAsync(async (req, res, next) => {
  const adminData = { ...req.body, ipAddress: req.ip };
  const adminRecord = await adminProfileService.createAdminAccount(adminData);

  res.status(201).json({
    status: 'success',
    data: { admin: adminRecord },
    message: localization.formatMessage(
      'admin', 'profile',
      adminData.languageCode || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'admin_created_message',
    ),
  });
});

/**
 * Updates an admin's profile.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const updateAdmin = catchAsync(async (req, res, next) => {
  const adminId = parseInt(req.params.adminId, 10);
  const updateData = { ...req.body, ipAddress: req.ip };
  const adminRecord = await adminProfileService.updateAdminProfile(adminId, updateData);

  res.status(200).json({
    status: 'success',
    data: { admin: adminRecord },
    message: localization.formatMessage(
      'admin', 'profile',
      adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'profile_updated_message',
    ),
  });
});

/**
 * Sets permissions for an admin.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const setPermissions = catchAsync(async (req, res, next) => {
  const adminId = parseInt(req.params.adminId, 10);
  const { permissionIds } = req.body;
  const adminRecord = await adminProfileService.setAdminPermissions(adminId, permissionIds, req.ip);

  res.status(200).json({
    status: 'success',
    data: { admin: adminRecord },
    message: localization.formatMessage(
      'admin', 'profile',
      adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'permissions_updated_message',
    ),
  });
});

/**
 * Verifies an admin's identity using MFA token.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const verifyIdentity = catchAsync(async (req, res, next) => {
  const adminId = parseInt(req.params.adminId, 10);
  const { mfaToken } = req.body;
  const isVerified = await adminProfileService.verifyAdminIdentity(adminId, mfaToken, req.ip);

  res.status(200).json({
    status: 'success',
    data: { verified: isVerified },
    message: localization.formatMessage(
      'admin', 'profile',
      adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'mfa_verified_message',
    ),
  });
});

/**
 * Suspends an admin account.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const suspendAdmin = catchAsync(async (req, res, next) => {
  const adminId = parseInt(req.params.adminId, 10);
  const { reason } = req.body;
  const adminRecord = await adminProfileService.suspendAdminAccount(adminId, reason, req.ip);

  res.status(200).json({
    status: 'success',
    data: { admin: adminRecord },
    message: localization.formatMessage(
      'admin', 'profile',
      adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'account_suspended_message',
      { reason },
    ),
  });
});

/**
 * Deletes an admin account.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const deleteAdmin = catchAsync(async (req, res, next) => {
  const adminId = parseInt(req.params.adminId, 10);
  await adminProfileService.deleteAdminAccount(adminId, req.ip);

  res.status(204).json({
    status: 'success',
    data: null,
    message: localization.formatMessage(
      'admin', 'profile',
      adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'account_deleted_message',
    ),
  });
});

/**
 * Generates activity reports for an admin.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const generateReports = catchAsync(async (req, res, next) => {
  const adminId = parseInt(req.params.adminId, 10);
  const { startDate, endDate } = req.body;
  const report = await adminProfileService.generateAdminReports(adminId, { startDate, endDate }, req.ip);

  res.status(200).json({
    status: 'success',
    data: { report },
    message: localization.formatMessage(
      'admin', 'profile',
      adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'report_generated_message',
    ),
  });
});

/**
 * Awards gamification points to an admin.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const awardPoints = catchAsync(async (req, res, next) => {
  const adminId = parseInt(req.params.adminId, 10);
  const { action, points, languageCode } = req.body;
  const pointsRecord = await adminProfileService.awardAdminPoints(adminId, action, points, languageCode);

  res.status(200).json({
    status: 'success',
    data: { points: pointsRecord },
    message: localization.formatMessage(
      'admin', 'profile',
      languageCode || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'points_awarded_message',
      { points },
    ),
  });
});

/**
 * Configures localization settings for an admin.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const configureLocalization = catchAsync(async (req, res, next) => {
  const adminId = parseInt(req.params.adminId, 10);
  const localizationData = req.body;
  const adminRecord = await adminProfileService.configureLocalization(adminId, localizationData, req.ip);

  res.status(200).json({
    status: 'success',
    data: { admin: adminRecord },
    message: localization.formatMessage(
      'admin', 'profile',
      adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'localization_updated_message',
    ),
  });
});

/**
 * Manages accessibility settings for an admin.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const manageAccessibility = catchAsync(async (req, res, next) => {
  const adminId = parseInt(req.params.adminId, 10);
  const accessibilityData = req.body;
  const accessibilityRecord = await adminProfileService.manageAccessibility(adminId, accessibilityData, req.ip);

  res.status(200).json({
    status: 'success',
    data: { accessibility: accessibilityRecord },
    message: localization.formatMessage(
      'admin', 'profile',
      adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'accessibility_updated_message',
    ),
  });
});

module.exports = {
  createAdmin,
  updateAdmin,
  setPermissions,
  verifyIdentity,
  suspendAdmin,
  deleteAdmin,
  generateReports,
  awardPoints,
  configureLocalization,
  manageAccessibility,
};