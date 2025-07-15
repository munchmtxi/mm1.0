// staffProfileService.js
// Handles business logic for staff profile operations, including creation, updates, compliance verification, and retrieval.
// Last Updated: May 16, 2025

'use strict';

const { User, Staff, Merchant, MerchantBranch, Wallet } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

async function createStaffProfile(userId, details) {
  try {
    const { merchantId, position, branchId, certifications, geofenceId, bankDetails } = details;

    const user = await User.findByPk(userId);
    if (!user) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);

    if (!staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(position)) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    if (branchId) {
      const branch = await MerchantBranch.findByPk(branchId);
      if (!branch || branch.merchant_id !== merchantId) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
      }
      const staffCount = await Staff.count({ where: { branch_id: branchId } });
      if (staffCount >= staffConstants.STAFF_SETTINGS.MAX_STAFF_PER_BRANCH) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
      }
    }

    if (geofenceId) {
      const city = merchant.address?.split(',')[0]?.trim() || 'Unknown';
      const supportedCities = staffConstants.STAFF_SETTINGS.SUPPORTED_CITIES[user.country] || [];
      if (!supportedCities.includes(city)) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_GEOFENCE);
      }
    }

    if (certifications) {
      if (!certifications.every(cert => staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS.includes(cert))) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_CERTIFICATION);
      }
      const requiredCerts = staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[position] || [];
      if (!requiredCerts.every(cert => certifications.includes(cert))) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.MISSING_CERTIFICATIONS);
      }
    }

    if (bankDetails) {
      if (!bankDetails.accountNumber || !bankDetails.routingNumber || !bankDetails.bankName) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_BANK_DETAILS);
      }
      const paymentMethod = bankDetails.method || staffConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS.BANK_TRANSFER;
      if (!Object.values(staffConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS).includes(paymentMethod)) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.PAYMENT_FAILED);
      }
    }

    const currency = merchant.currency || staffConstants.STAFF_SETTINGS.DEFAULT_CURRENCY;
    if (!staffConstants.STAFF_SETTINGS.SUPPORTED_CURRENCIES.includes(currency)) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_CURRENCY);
    }

    const staff = await Staff.create({
      user_id: userId,
      merchant_id: merchantId,
      position,
      branch_id: branchId,
      geofence_id: geofenceId,
      certifications: certifications || [],
      availability_status: staffConstants.STAFF_STATUSES.PENDING_ONBOARDING,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return staff;
  } catch (error) {
    logger.error('Error creating staff profile', { error: error.message, userId });
    throw error;
  }
}

async function updateStaffDetails(staffId, details) {
  try {
    const { userUpdates, staffUpdates, bankDetails } = details;

    const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    if (userUpdates) {
      const allowedUserFields = ['first_name', 'last_name', 'email', 'phone', 'preferred_language', 'country'];
      const invalidFields = Object.keys(userUpdates).filter(field => !allowedUserFields.includes(field));
      if (invalidFields.length > 0) throw new Error(staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE);

      if (userUpdates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userUpdates.email)) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_EMAIL);
      }
      if (userUpdates.phone && !/^\+?[1-9]\d{1,14}$/.test(userUpdates.phone)) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_PHONE);
      }
      if (userUpdates.preferred_language && !staffConstants.STAFF_SETTINGS.SUPPORTED_LANGUAGES.includes(userUpdates.preferred_language)) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE);
      }
      if (userUpdates.country && !Object.keys(staffConstants.STAFF_SETTINGS.SUPPORTED_CITIES).includes(userUpdates.country)) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE);
      }
    }

    if (staffUpdates) {
      const allowedStaffFields = ['position', 'branch_id', 'geofence_id', 'certifications', 'assigned_area', 'availability_status'];
      const invalidFields = Object.keys(staffUpdates).filter(field => !allowedStaffFields.includes(field));
      if (invalidFields.length > 0) throw new Error(staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE);

      if (staffUpdates.position && !staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(staffUpdates.position)) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
      }
      if (staffUpdates.branch_id) {
        const branch = await MerchantBranch.findByPk(staffUpdates.branch_id);
        if (!branch || branch.merchant_id !== staff.merchant_id) {
          throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
        }
      }
      if (staffUpdates.geofence_id) {
        const city = staff.user.address?.split(',')[0]?.trim() || 'Unknown';
        const supportedCities = staffConstants.STAFF_SETTINGS.SUPPORTED_CITIES[staff.user.country] || [];
        if (!supportedCities.includes(city)) {
          throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_GEOFENCE);
        }
      }
      if (staffUpdates.certifications) {
        if (!staffUpdates.certifications.every(cert => staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS.includes(cert))) {
          throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_CERTIFICATION);
        }
        const requiredCerts = staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[staffUpdates.position || staff.position] || [];
        if (!requiredCerts.every(cert => staffUpdates.certifications.includes(cert))) {
          throw new Error(staffConstants.STAFF_ERROR_CODES.MISSING_CERTIFICATIONS);
        }
      }
      if (staffUpdates.availability_status && !Object.values(staffConstants.STAFF_STATUSES).includes(staffUpdates.availability_status)) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.INCOMPLETE_PROFILE);
      }
    }

    if (bankDetails) {
      if (!bankDetails.accountNumber || !bankDetails.routingNumber || !bankDetails.bankName) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_BANK_DETAILS);
      }
      const paymentMethod = bankDetails.method || staffConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS.BANK_TRANSFER;
      if (!Object.values(staffConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS).includes(paymentMethod)) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.PAYMENT_FAILED);
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

    return { user: staff.user, staff };
  } catch (error) {
    logger.error('Error updating staff profile', { error: error.message, staffId });
    throw error;
  }
}

async function verifyCompliance(staffId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const requiredUserFields = ['first_name', 'last_name', 'email', 'phone', 'country'];
    const missingUserFields = requiredUserFields.filter(field => !staff.user[field]);
    if (missingUserFields.length > 0) {
      return { isCompliant: false, missingFields: missingUserFields };
    }

    const requiredCerts = staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[staff.position] || [];
    const missingCertifications = requiredCerts.filter(cert => !staff.certifications.includes(cert));
    if (missingCertifications.length > 0) {
      return { isCompliant: false, missingCertifications };
    }

    return { isCompliant: true };
  } catch (error) {
    logger.error('Error verifying staff compliance', { error: error.message, staffId });
    throw error;
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
      ],
    });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    return staff;
  } catch (error) {
    logger.error('Error retrieving staff profile', { error: error.message, staffId });
    throw error;
  }
}

module.exports = {
  createStaffProfile,
  updateStaffDetails,
  verifyCompliance,
  getStaffProfile,
};