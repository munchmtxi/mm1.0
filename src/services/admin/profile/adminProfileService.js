'use strict';

/**
 * Admin Profile Service
 * Manages admin profile operations, including account creation, updates, permissions,
 * security, notifications, gamification, localization, and accessibility.
 */

const { Op } = require('sequelize');
const {
  admin,
  User,
  adminPermissions,
  adminAccessibility,
  mfaTokens,
  Permission,
  PasswordHistory,
  Session,
  AuditLog,
} = require('@models');
const securityService = require('@services/common/securityService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/gamification/pointService');
const backupRecoveryService = require('@services/common/backupRecoveryService');
const localization = require('@utils/localization/localization');
const validation = require('@utils/validation');
const errorHandling = require('@utils/errorHandling');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');
const adminEngagementConstants = require('@constants/admin/adminEngagementConstants');
const adminSystemConstants = require('@constants/admin/adminSystemConstants');

//─────────────────────────────────────────────────────────────────────────────
// Helper: Always log with User's ID (not admin.id)
const logAdminAction = async ({ userId, action, details, ipAddress }) => {
  await auditService.logAdminAction({
    adminId: userId,
    action,
    details,
    ipAddress,
  });
};
//─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new admin account with the specified details, assigns a role, and sends a notification.
 */
async function createAdminAccount(adminData) {
  try {
    // Validate input data (requires first and last name)
    await validation.validateAdminData(adminData, true);
    if (!/^\S+\s+\S+/.test(adminData.name.trim())) {
      throw new Error('Name must include first and last names, separated by a space.');
    }

    // Split into first_name / last_name
    const [firstName, ...lastNameParts] = adminData.name.trim().split(' ');
    const lastName = lastNameParts.join(' ');

    // Create User – password hashing via model hooks
    const user = await User.create({
      first_name: firstName,
      last_name: lastName,
      email: adminData.email,
      password: adminData.password,
      role_id: adminData.roleId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create Admin record linked to user.id
    const adminRecord = await admin.create({
      user_id: user.id,
      role_id: adminData.roleId,
      currency_code: adminData.currencyCode || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_CURRENCY,
      language_code: adminData.languageCode || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      status: adminCoreConstants.ADMIN_STATUSES.ACTIVE,
      notification_preferences: { email: true, push: true, sms: false },
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Audit log with correct user.id
    await logAdminAction({
      userId: user.id,
      action: adminEngagementConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.USER_ONBOARDING.action,
      details: { email: adminData.email, roleId: adminData.roleId },
      ipAddress: adminData.ipAddress,
    });

    // Send welcome notification
    const welcomeMessage = localization.formatMessage(
      'admin',
      'profile',
      adminData.languageCode || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'welcome_message',
      { name: adminData.name }
    );
    await notificationService.sendNotification({
      userId: user.id,
      type: adminEngagementConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.USER_UPDATE,
      message: welcomeMessage,
      priority: adminEngagementConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
      languageCode: adminData.languageCode || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
    });

    // Award points for onboarding
    await pointService.awardPoints({
      userId: user.id,
      role: 'admin',
      action: adminEngagementConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.USER_ONBOARDING.action,
      points: adminEngagementConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.USER_ONBOARDING.points,
      languageCode: adminData.languageCode || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
    });

    // Emit real-time event
    await socketService.emitToRoom(`admin:${adminRecord.id}`, 'admin:profile:created', {
      adminId: adminRecord.id,
      email: adminData.email,
    });

    return adminRecord;
  } catch (error) {
    throw errorHandling.handleServiceError('createAdminAccount', error, adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);
  }
}

/**
 * Updates an admin's profile with new details (e.g., name, email, currencyCode).
 */
async function updateAdminProfile(adminId, updateData) {
  try {
    // Validate input data
    await validation.validateAdminData(updateData, false);

    // Find admin record
    const adminRecord = await admin.findByPk(adminId, { include: [{ model: User, as: 'user' }] });
    if (!adminRecord) throw new Error(adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);

    // Prepare User updates
    const userUpdates = {};
    if (updateData.name) {
      if (!/^\S+\s+\S+/.test(updateData.name.trim())) {
        throw new Error('Name must include first and last names.');
      }
      const [fn, ...lnParts] = updateData.name.trim().split( ' ');
      userUpdates.first_name = fn;
      userUpdates.last_name = lnParts.join(' ');
    }
    if (updateData.email) userUpdates.email = updateData.email;

    // Apply User updates (hooks will hash password)
    if (Object.keys(userUpdates).length) {
      await User.update(userUpdates, { where: { id: adminRecord.user_id } });
    }

    // Handle password reset separately to log history
    if (updateData.password) {
      await User.update({ password: updateData.password }, { where: { id: adminRecord.user_id } });
      const histHash = await securityService.encryptPassword(updateData.password);
      await PasswordHistory.create({
        user_id: adminRecord.user_id,
        user_type: adminCoreConstants.USER_MANAGEMENT_CONSTANTS.USER_TYPES.ADMIN,
        password_hash: histHash,
        created_at: new Date(),
      });
    }

    // Update admin-specific fields
    const adminUpdates = {};
    if (updateData.currencyCode) adminUpdates.currency_code = updateData.currencyCode;
    if (updateData.languageCode) adminUpdates.language_code = updateData.languageCode;
    if (updateData.notificationPreferences) adminUpdates.notification_preferences = updateData.notificationPreferences;
    if (Object.keys(adminUpdates).length) {
      await adminRecord.update(adminUpdates);
    }

    // Audit the profile update
    await logAdminAction({
      userId: adminRecord.user_id,
      action: adminEngagementConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.PROFILE_UPDATE.action,
      details: updateData,
      ipAddress: updateData.ipAddress,
    });

    // Send update notification
    const updateMessage = localization.formatMessage(
      'admin',
      'profile',
      adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'profile_updated_message'
    );
    await notificationService.sendNotification({
      userId: adminRecord.user_id,
      type: adminEngagementConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.USER_UPDATE,
      message: updateMessage,
      priority: adminEngagementConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
      languageCode: adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
    });

    // Emit real-time event
    await socketService.emitToRoom(`admin:${adminId}`, 'admin:profile:updated', {
      adminId,
      changes: updateData,
    });

    return adminRecord;
  } catch (error) {
    throw errorHandling.handleServiceError('updateAdminProfile', error, adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);
  }
}

/**
 * Sets permissions for an admin by updating the adminPermissions table.
 */
async function setAdminPermissions(adminId, permissionIds, ipAddress) {
  try {
    // Validate admin
    const adminRecord = await admin.findByPk(adminId);
    if (!adminRecord) throw new Error(adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);

    // Validate permissions
    const permissions = await Permission.findAll({ where: { id: permissionIds } });
    if (permissions.length !== permissionIds.length) throw new Error(adminCoreConstants.ERROR_CODES.PERMISSION_DENIED);

    // Clear existing permissions
    await adminPermissions.destroy({ where: { admin_id: adminId } });

    // Assign new permissions
    const permissionRecords = permissionIds.map((id) => ({
      admin_id: adminId,
      permission_id: id,
      assigned_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    }));
    await adminPermissions.bulkCreate(permissionRecords);

    // Audit event
    await logAdminAction({
      userId: adminRecord.user_id,
      action: adminEngagementConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.SET_PERMISSIONS.action,
      details: { permissionIds },
      ipAddress,
    });

    // Notification
    const permMsg = localization.formatMessage(
      'admin',
      'profile',
      adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'permissions_updated_message'
    );
    await notificationService.sendNotification({
      userId: adminRecord.user_id,
      type: adminEngagementConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.USER_UPDATE,
      message: permMsg,
      priority: adminEngagementConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
      languageCode: adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
    });

    // Emit event
    await socketService.emitToRoom(`admin:${adminId}`, 'admin:profile:permissions_updated', {
      adminId,
      permissionIds,
    });

    return adminRecord;
  } catch (error) {
    throw errorHandling.handleServiceError('setAdminPermissions', error, adminCoreConstants.ERROR_CODES.PERMISSION_DENIED);
  }
}

/**
 * Verifies an admin's identity using MFA token.
 */
async function verifyAdminIdentity(adminId, mfaToken, ipAddress) {
  try {
    const adminRecord = await admin.findByPk(adminId);
    if (!adminRecord) throw new Error(adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);

    const tokenRecord = await mfaTokens.findOne({
      where: {
        user_id: adminRecord.user_id,
        token: mfaToken,
        expires_at: { [Op.gt]: new Date() },
      },
    });
    if (!tokenRecord) {
      await logAdminAction({
        userId: adminRecord.user_id,
        action: adminSystemConstants.SECURITY_CONSTANTS.SECURITY_INCIDENT_TYPES.FAILED_MFA,
        details: { mfaToken },
        ipAddress,
      });
      throw new Error(adminSystemConstants.ERROR_CODES.SECURITY_INCIDENT);
    }

    // Consume token
    await tokenRecord.destroy();

    // Audit success
    await logAdminAction({
      userId: adminRecord.user_id,
      action: adminSystemConstants.SECURITY_CONSTANTS.SECURITY_INCIDENT_TYPES.SUCCESS_MFA,
      details: { mfaToken },
      ipAddress,
    });

    // Notification
    const mfaMsg = localization.formatMessage(
      'admin',
      'profile',
      adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'mfa_verified_message'
    );
    await notificationService.sendNotification({
      userId: adminRecord.user_id,
      type: adminEngagementConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SECURITY_UPDATE,
      message: mfaMsg,
      priority: adminEngagementConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
      languageCode: adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
    });

    return true;
  } catch (error) {
    throw errorHandling.handleServiceError('verifyAdminIdentity', error, adminSystemConstants.ERROR_CODES.SECURITY_INCIDENT);
  }
}

/**
 * Suspends an admin account, invalidating sessions and notifying the admin.
 */
async function suspendAdminAccount(adminId, reason, ipAddress) {
  try {
    const adminRecord = await admin.findByPk(adminId, { include: [{ model: User, as: 'user' }] });
    if (!adminRecord) throw new Error(adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);

    await adminRecord.update({ status: adminCoreConstants.ADMIN_STATUSES.SUSPENDED });
    await Session.destroy({ where: { user_id: adminRecord.user_id } });

    await logAdminAction({
      userId: adminRecord.user_id,
      action: adminEngagementConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.SUSPEND_ACCOUNT.action,
      details: { reason },
      ipAddress,
    });

    const suspendMsg = localization.formatMessage(
      'admin',
      'profile',
      adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'account_suspended_message',
      { reason }
    );
    await notificationService.sendNotification({
      userId: adminRecord.user_id,
      type: adminEngagementConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.USER_UPDATE,
      message: suspendMsg,
      priority: adminEngagementConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.HIGH,
      languageCode: adminRecord.language_code,
    });
    await socketService.emitToRoom(`admin:${adminId}`, 'admin:profile:suspended', { adminId, reason });

    return adminRecord;
  } catch (error) {
    throw errorHandling.handleServiceError('suspendAdminAccount', error, adminCoreConstants.ERROR_CODES.USER_SUSPENSION_FAILED);
  }
}

/**
 * Deletes an admin account, archiving data and invalidating sessions.
 */
async function deleteAdminAccount(adminId, ipAddress) {
  try {
    const adminRecord = await admin.findByPk(adminId, { include: [{ model: User, as: 'user' }] });
    if (!adminRecord) throw new Error(adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);

    await backupRecoveryService.backupAdminData(adminId, { user: adminRecord.user, admin: adminRecord });
    await Session.destroy({ where: { user_id: adminRecord.user_id } });
    await adminRecord.destroy();
    await adminRecord.user.destroy();

    await logAdminAction({
      userId: adminRecord.user_id,
      action: adminEngagementConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.DELETE_ACCOUNT.action,
      details: {},
      ipAddress,
    });

    const deleteMsg = localization.formatMessage(
      'admin',
      'profile',
      adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'account_deleted_message'
    );
    await notificationService.sendNotification({
      userId: adminRecord.user_id,
      type: adminEngagementConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.USER_UPDATE,
      message: deleteMsg,
      priority: adminEngagementConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.HIGH,
      languageCode: adminRecord.language_code,
    });
    await socketService.emitToRoom(`admin:${adminId}`, 'admin:profile:deleted', { adminId });

    return true;
  } catch (error) {
    throw errorHandling.handleServiceError('deleteAdminAccount', error, adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);
  }
}

/**
 * Generates activity reports for an admin over a specified period.
 */
async function generateAdminReports(adminId, period, ipAddress) {
  try {
    const adminRecord = await admin.findByPk(adminId);
    if (!adminRecord) throw new Error(adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);

    const auditLogs = await AuditLog.findAll({
      where: { user_id: adminRecord.user_id, created_at: { [Op.between]: [period.startDate, period.endDate] } },
    });
    const report = {
      adminId,
      period,
      actions: auditLogs.map((log) => ({
        action: log.log_type,
        details: log.details,
        timestamp: log.created_at,
        ipAddress: log.ip_address,
      })),
    };

    await logAdminAction({
      userId: adminRecord.user_id,
      action: adminEngagementConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.ANALYTICS_REVIEW.action,
      details: { period },
      ipAddress,
    });
    await pointService.awardPoints({
      userId: adminRecord.user_id,
      role: 'admin',
      action: adminEngagementConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.ANALYTICS_REVIEW.action,
      points: adminEngagementConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.ANALYTICS_REVIEW.points,
      languageCode: adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
    });

    const reportMsg = localization.formatMessage(
      'admin',
      'profile',
      adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'report_generated_message'
    );
    await notificationService.sendNotification({
      userId: adminRecord.user_id,
      type: adminEngagementConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.REPORT_GENERATED,
      message: reportMsg,
      priority: adminEngagementConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
      languageCode: adminRecord.language_code,
    });

    return report;
  } catch (error) {
    throw errorHandling.handleServiceError('generateAdminReports', error, adminSystemConstants.ERROR_CODES.ANALYTICS_GENERATION_FAILED);
  }
}

/**
 * Awards gamification points to an admin for specific actions.
 */
async function awardAdminPoints(adminId, action, points, languageCode) {
  try {
    const adminRecord = await admin.findByPk(adminId);
    if (!adminRecord) throw new Error(adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);

    return pointService.awardPoints({
      userId: adminRecord.user_id,
      role: 'admin',
      action,
      points,
      languageCode: languageCode || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
    });
  } catch (error) {
    throw errorHandling.handleServiceError('awardAdminPoints', error, adminEngagementConstants.ERROR_CODES.SUPPORT_TICKET_FAILED);
  }
}

/**
 * Configures localization settings for an admin (e.g., language, currency).
 */
async function configureLocalization(adminId, localizationData, ipAddress) {
  try {
    const adminRecord = await admin.findByPk(adminId);
    if (!adminRecord) throw new Error(adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);

    const updates = {};
    if (localizationData.languageCode) updates.language_code = localizationData.languageCode;
    if (localizationData.currencyCode) updates.currency_code = localizationData.currencyCode;

    if (Object.keys(updates).length) await adminRecord.update(updates);

 открытия
    await logAdminAction({
      userId: adminRecord.user_id,
      action: adminEngagementConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.CONFIGURE_LOCALIZATION.action,
      details: localizationData,
      ipAddress,
    });

    const locMsg = localization.formatMessage(
      'admin',
      'profile',
      adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'localization_updated_message'
    );
    await notificationService.sendNotification({
      userId: adminRecord.user_id,
      type: adminEngagementConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.USER_UPDATE,
      message: locMsg,
      priority: adminEngagementConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
      languageCode: adminRecord.language_code,
    });
    await socketService.emitToRoom(`admin:${adminId}`, 'admin:profile:localization_updated', {
      adminId,
      localizationData,
    });

    return adminRecord;
  } catch (error) {
    throw errorHandling.handleServiceError('configureLocalization', error, adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);
  }
}

/**
 * Manages accessibility settings for an admin (e.g., screen reader, font size).
 */
async function manageAccessibility(adminId, accessibilityData, ipAddress) {
  try {
    const adminRecord = await admin.findByPk(adminId);
    if (!adminRecord) throw new Error(adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);

    // Build settings JSON
    const settings = {
      screen_reader: accessibilityData.screenReader ?? false,
      font_size: accessibilityData.fontSize ?? 'medium',
      high_contrast: accessibilityData.highContrast ?? false,
    };

    // Upsert the JSON blob
    let accessibilityRecord = await adminAccessibility.findOne({ where: { admin_id: adminId } });
    if (!accessibilityRecord) {
      accessibilityRecord = await adminAccessibility.create({
        admin_id: adminId,
        settings,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } else {
      await accessibilityRecord.update({ settings, updated_at: new Date() });
    }

    // Audit accessibility change
    await logAdminAction({
      userId: adminRecord.user_id,
      action: adminSystemConstants.ACCESSIBILITY_CONSTANTS.ACTIONS.UPDATE,
      details: settings,
      ipAddress,
    });

    // Send notification
    const accMsg = localization.formatMessage(
      'admin',
      'profile',
      adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
      'accessibility_updated_message'
    );
    await notificationService.sendNotification({
      userId: adminRecord.user_id,
      type: adminEngagementConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.USER_UPDATE,
      message: accMsg,
      priority: adminEngagementConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
      languageCode: adminRecord.language_code,
    });
    await socketService.emitToRoom(`admin:${adminId}`, 'admin:profile:accessibility_updated', {
      adminId,
      accessibilityData,
    });

    return accessibilityRecord;
  } catch (error) {
    throw errorHandling.handleServiceError('manageAccessibility', error, adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);
  }
}

module.exports = {
  createAdminAccount,
  updateAdminProfile,
  setAdminPermissions,
  verifyAdminIdentity,
  suspendAdminAccount,
  deleteAdminAccount,
  generateAdminReports,
  awardAdminPoints,
  configureLocalization,
  manageAccessibility,
};