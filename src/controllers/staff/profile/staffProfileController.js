'use strict';

/**
 * Staff Profile Controller
 * Handles HTTP requests for staff profile operations, including updating details,
 * verifying compliance, and retrieving profiles. Integrates with staffProfileService
 * for business logic. Assumes auditContext is injected by middleware.
 *
 * Last Updated: May 16, 2025
 */

const staffProfileService = require('@services/staff/profile/staffProfileService');
const logger = require('@utils/logger');
const { STAFF_SUCCESS_MESSAGES } = require('@constants/staff/staffSystemConstants');
const { sendResponse } = require('@utils/responseHandler');

/**
 * Updates staff profile details.
 */
const updateStaffDetails = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const details = req.body;
    const auditContext = {
      actorId: req.user.id,
      actorRole: req.user.role,
      ipAddress: req.ip,
    };
    const updatedStaff = await staffProfileService.updateStaffDetails(staffId, details, auditContext);
    logger.info('Staff profile updated successfully', { staffId });
    sendResponse(res, 200, {
      message: STAFF_SUCCESS_MESSAGES.STAFF_ONBOARDED,
      data: updatedStaff,
    });
  } catch (error) {
    logger.error('Error updating staff profile', { error: error.message, staffId: req.params.staffId });
    next(error);
  }
};

/**
 * Verifies staff compliance.
 */
const verifyCompliance = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const auditContext = {
      actorId: req.user.id,
      actorRole: req.user.role,
      ipAddress: req.ip,
    };
    const complianceStatus = await staffProfileService.verifyCompliance(staffId, auditContext);
    logger.info('Staff compliance verified successfully', { staffId });
    sendResponse(res, 200, {
      message: 'Compliance verified successfully',
      data: complianceStatus,
    });
  } catch (error) {
    logger.error('Error verifying compliance', { error: error.message, staffId: req.params.staffId });
    next(error);
  }
};

/**
 * Retrieves staff profile.
 */
const getStaffProfile = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const auditContext = {
      actorId: req.user.id,
      actorRole: req.user.role,
      ipAddress: req.ip,
    };
    const staffProfile = await staffProfileService.getStaffProfile(staffId, auditContext);
    logger.info('Staff profile retrieved successfully', { staffId });
    sendResponse(res, 200, {
      message: 'Profile retrieved successfully',
      data: staffProfile,
    });
  } catch (error) {
    logger.error('Error retrieving staff profile', { error: error.message, staffId: req.params.staffId });
    next(error);
  }
};

module.exports = {
  updateStaffDetails,
  verifyCompliance,
  getStaffProfile,
};