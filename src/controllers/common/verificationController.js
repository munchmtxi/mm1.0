'use strict';

const catchAsync = require('@utils/catchAsync');
const { submitVerification, approveVerification } = require('@services/common/verificationService');
const { handleVerificationSubmitted, handleVerificationApproved } = require('@socket/handlers');
const { User, Role } = require('@models');
const authConstants = require('@constants/common/authConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

module.exports = {
  submitVerification: catchAsync(async (req, res, next) => {
    const { user_id, document_type, document_url, method } = req.body;
    logger.logApiEvent('Verification submission attempt', { userId: user_id });
    const verification = await submitVerification({ user_id, document_type, document_url, method });
    const user = await User.findByPk(user_id, { include: [{ model: Role, as: 'role' }] });
    handleVerificationSubmitted(req.io, { id: user.id, role: user.role.name }, method);
    res.status(201).json({
      status: 'success',
      message: 'Verification submitted successfully',
      data: { verificationId: verification.id },
    });
  }),

  approveVerification: catchAsync(async (req, res, next) => {
    const { verification_id } = req.body;
    logger.logApiEvent('Verification approval attempt', { verificationId: verification_id });
    const verification = await approveVerification(verification_id);
    const user = await User.findByPk(verification.user_id, { include: [{ model: Role, as: 'role' }] });
    handleVerificationApproved(req.io, { id: user.id, role: user.role.name }, verification.method);
    res.status(200).json({
      status: 'success',
      message: 'Verification approved successfully',
      data: { verificationId: verification.id },
    });
  }),
};