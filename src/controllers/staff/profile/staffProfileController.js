// staffProfileController.js
// Handles staff profile-related requests, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const staffProfileService = require('@services/staff/profile/staffProfileService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const walletService = require('@services/common/walletService');
const staffConstants = require('@constants/staff/staffConstants');
const { User } = require('@models');

async function createStaffProfile(req, res, next) {
  try {
    const { userId, details } = req.body;
    const io = req.app.get('io');

    const staff = await staffProfileService.createStaffProfile(userId, details);

    if (details.bankDetails) {
      let wallet = await walletService.createWallet(userId, staffConstants.STAFF_WALLET_CONSTANTS.WALLET_TYPE, staff.currency || staffConstants.STAFF_SETTINGS.DEFAULT_CURRENCY);
      await walletService.addPaymentMethod(wallet.id, {
        type: details.bankDetails.method || staffConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS.BANK_TRANSFER,
        details: details.bankDetails,
      });
    }

    await auditService.logAction({
      userId: userId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_CREATE,
      details: { staffId: staff.id, userId, ...details },
      ipAddress: req.ip,
    });

    await notificationService.sendNotification({
      userId,
      notificationType: staffConstants.NOTIFICATION_TYPES.PROFILE_CREATED,
      messageKey: 'profile.profile_created',
      messageParams: { staffId: staff.id },
      role: 'staff',
      module: 'profile',
      languageCode: (await User.findByPk(userId)).preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:profile:created`, {
      userId,
      staffId: staff.id,
      staffProfile: staff,
    }, `staff:${userId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('profile.profile_created', { staffId: staff.id }, (await User.findByPk(userId)).preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE),
      data: staff,
    });
  } catch (error) {
    next(error);
  }
}

async function updateStaffDetails(req, res, next) {
  try {
    const { staffId, details } = req.body;
    const io = req.app.get('io');

    const { user, staff } = await staffProfileService.updateStaffDetails(staffId, details);

    if (details.bankDetails) {
      let wallet = await Wallet.findOne({ where: { staff_id: staffId } });
      if (!wallet) {
        wallet = await walletService.createWallet(staff.user_id, staffConstants.STAFF_WALLET_CONSTANTS.WALLET_TYPE, staff.currency || staffConstants.STAFF_SETTINGS.DEFAULT_CURRENCY);
      }
      await walletService.addPaymentMethod(wallet.id, {
        type: details.bankDetails.method || staffConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS.BANK_TRANSFER,
        details: details.bankDetails,
      });
    }

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, userId: staff.user_id, ...details },
      ipAddress: req.ip,
    });

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.NOTIFICATION_TYPES.PROFILE_UPDATED,
      messageKey: 'profile.profile_updated',
      messageParams: { staffId },
      role: 'staff',
      module: 'profile',
      languageCode: user.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:profile:updated`, {
      userId: staff.user_id,
      staffId,
      updatedFields: details,
    }, `staff:${staff.user_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('profile.profile_updated', { staffId }, user.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE),
      data: { user, staff },
    });
  } catch (error) {
    next(error);
  }
}

async function verifyCompliance(req, res, next) {
  try {
    const { staffId } = req.body;
    const io = req.app.get('io');

    const complianceStatus = await staffProfileService.verifyCompliance(staffId);

    const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_COMPLIANCE_VERIFY,
      details: { staffId, userId: staff.user_id, ...complianceStatus },
      ipAddress: req.ip,
    });

    let messageKey = complianceStatus.isCompliant ? 'profile.profile_verified' : 'profile.profile_compliance_failed';
    let messageParams = complianceStatus.isCompliant ? {} : { reason: complianceStatus.missingFields?.join(', ') || complianceStatus.missingCertifications?.join(', ') };

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.NOTIFICATION_TYPES.ANNOUNCEMENT,
      messageKey,
      messageParams,
      role: 'staff',
      module: 'profile',
      languageCode: staff.user.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, complianceStatus.isCompliant ? `staff:profile:compliance_verified` : `staff:profile:compliance_failed`, {
      userId: staff.user_id,
      staffId,
      complianceStatus,
    }, `staff:${staff.user_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage(messageKey, messageParams, staff.user.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE),
      data: complianceStatus,
    });
  } catch (error) {
    next(error);
  }
}

async function getStaffProfile(req, res, next) {
  try {
    const { staffId } = req.body;
    const io = req.app.get('io');

    const staff = await staffProfileService.getStaffProfile(staffId);

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
      details: { staffId, userId: staff.user_id },
      ipAddress: req.ip,
    });

    socketService.emit(io, `staff:profile:retrieved`, {
      userId: staff.user_id,
      staffId,
      staffProfile: staff,
    }, `staff:${staff.user_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('profile.profile_retrieved', { staffId }, staff.user.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE),
      data: staff,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createStaffProfile,
  updateStaffDetails,
  verifyCompliance,
  getStaffProfile,
};