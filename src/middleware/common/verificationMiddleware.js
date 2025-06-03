'use strict';

const { Verification, User, Role } = require('@models');
const authConstants = require('@constants/common/authConstants');
const AppError = require('@utils/AppError');

const checkVerificationEligibility = async (req, res, next) => {
  const { user_id } = req.body;
  const user = await User.findByPk(user_id, { include: [{ model: Role, as: 'role' }] });
  if (!user) {
    throw new AppError('User not found', 404, authConstants.ERROR_CODES.USER_NOT_FOUND);
  }
  const roleName = user.role.name;
  if (!authConstants.VERIFICATION_CONSTANTS.VERIFICATION_ELIGIBLE_ROLES.includes(roleName)) {
    throw new AppError('User role not eligible for verification', 403, authConstants.ERROR_CODES.PERMISSION_DENIED);
  }
  // Check if user already has a pending verification for the same document type
  const existingVerification = await Verification.findOne({
    where: {
      user_id,
      document_type: req.body.document_type,
      status: authConstants.VERIFICATION_CONSTANTS.VERIFICATION_STATUSES.PENDING,
    },
  });
  if (existingVerification) {
    throw new AppError('A pending verification already exists for this document type', 400, authConstants.ERROR_CODES.INVALID_INPUT);
  }
  next();
};

const checkVerificationExists = async (req, res, next) => {
  const { verification_id } = req.body;
  const verification = await Verification.findByPk(verification_id);
  if (!verification) {
    throw new AppError('Verification record not found', 404, authConstants.ERROR_CODES.INVALID_INPUT);
  }
  if (verification.status !== authConstants.VERIFICATION_CONSTANTS.VERIFICATION_STATUSES.PENDING) {
    throw new AppError('Verification is not in pending status', 400, authConstants.ERROR_CODES.INVALID_INPUT);
  }
  req.verification = verification; // Attach verification to request for controller
  next();
};

module.exports = { checkVerificationEligibility, checkVerificationExists };