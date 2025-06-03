'use strict';

const { Verification, User, Role } = require('@models');
const authConstants = require('@constants/common/authConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({ region: process.env.AWS_REGION });

const submitVerification = async ({ user_id, document_type, document_url, method }) => {
  // Validate user exists and role is eligible
  const user = await User.findByPk(user_id, { include: [{ model: Role, as: 'role' }] });
  if (!user) {
    throw new AppError('User not found', 404, authConstants.ERROR_CODES.USER_NOT_FOUND);
  }
  const roleName = user.role.name;
  if (!authConstants.VERIFICATION_CONSTANTS.VERIFICATION_ELIGIBLE_ROLES.includes(roleName)) {
    throw new AppError('User role not eligible for verification', 403, authConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  // Validate document type against role
  const allowedDocumentTypes = authConstants.VERIFICATION_CONSTANTS.VERIFICATION_DOCUMENT_TYPES[roleName] || [];
  if (!allowedDocumentTypes.includes(document_type)) {
    throw new AppError('Invalid document type for role', 400, authConstants.ERROR_CODES.INVALID_INPUT);
  }

  // Verify document exists in S3
  try {
    await s3.headObject({
      Bucket: process.env.AWS_S3_VERIFICATION_BUCKET,
      Key: document_url.split(`${process.env.AWS_S3_VERIFICATION_BUCKET}/`)[1],
    }).promise();
  } catch (error) {
    logger.logErrorEvent('S3 document check failed', { error: error.message, document_url });
    throw new AppError('Document not found in storage', 400, authConstants.ERROR_CODES.INVALID_INPUT);
  }

  // Create verification record
  const verification = await Verification.create({
    user_id,
    method,
    status: authConstants.VERIFICATION_CONSTANTS.VERIFICATION_STATUSES.PENDING,
    document_type,
    document_url,
  });

  // Log audit event
  await AuditLog.create({
    user_id,
    log_type: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.VERIFICATION_ATTEMPT,
    details: { method, document_type, status: 'PENDING' },
  });
  logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.VERIFICATION_ATTEMPT, {
    userId: user_id,
    role: roleName,
    method,
  });

  return verification;
};

const approveVerification = async (verification_id) => {
  const verification = await Verification.findByPk(verification_id);
  if (!verification) {
    throw new AppError('Verification record not found', 404, authConstants.ERROR_CODES.INVALID_INPUT);
  }
  if (verification.status !== authConstants.VERIFICATION_CONSTANTS.VERIFICATION_STATUSES.PENDING) {
    throw new AppError('Verification is not in pending status', 400, authConstants.ERROR_CODES.INVALID_INPUT);
  }

  // Update verification status
  await verification.update({
    status: authConstants.VERIFICATION_CONSTANTS.VERIFICATION_STATUSES.APPROVED,
    updated_at: new Date(),
  });

  // Log audit event
  await AuditLog.create({
    user_id: verification.user_id,
    log_type: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.VERIFICATION_ATTEMPT,
    details: { method: verification.method, document_type: verification.document_type, status: 'APPROVED' },
  });
  logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.VERIFICATION_ATTEMPT, {
    userId: verification.user_id,
    method: verification.method,
    success: true,
  });

  return verification;
};

module.exports = { submitVerification, approveVerification };