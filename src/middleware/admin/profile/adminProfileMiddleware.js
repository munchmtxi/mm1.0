'use strict';

/**
 * Middleware for Admin Profile Operations
 * Provides additional checks and data enrichment for admin profile routes and Socket.IO events.
 * Integrates with authMiddleware for authentication and RBAC.
 */

const { admin } = require('@models');
const AppError = require('@utils/AppError');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');
const authConstants = require('@constants/common/authConstants');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

/**
 * Middleware to check if an admin exists by ID.
 */
const checkAdminExists = catchAsync(async (req, res, next) => {
  const adminId = req.params.adminId || req.body.adminId;
  logger.info('Checking admin existence', { requestId: req.id, adminId });

  const adminRecord = await admin.findByPk(adminId);
  if (!adminRecord) {
    logger.warn('Admin not found', { requestId: req.id, adminId });
    throw new AppError('Admin not found', 404, adminCoreConstants.ERROR_CODES.ADMIN_NOT_FOUND);
  }

  req.admin = adminRecord;
  next();
});

/**
 * Middleware to add ipAddress to request body.
 */
const addIpAddress = (req, res, next) => {
  logger.info('Adding IP address to request', { requestId: req.id, ip: req.ip });
  req.body.ipAddress = req.ip;
  next();
};

/**
 * Middleware to check if the authenticated user is the same as the target admin or has sufficient permissions.
 */
const restrictToSelfOrSuperAdmin = catchAsync(async (req, res, next) => {
  const adminId = req.params.adminId || req.body.adminId;
  logger.info('Checking self or super admin access', {
    requestId: req.id,
    userId: req.user.id,
    adminId,
    role: req.user.role,
  });

  if (req.user.id !== parseInt(adminId, 10) && req.user.role !== adminCoreConstants.ADMIN_ROLES.SUPER_ADMIN) {
    logger.warn('Access denied: not self or super admin', {
      requestId: req.id,
      userId: req.user.id,
      adminId,
      role: req.user.role,
    });
    throw new AppError('Forbidden', 403, authConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  next();
});

module.exports = {
  checkAdminExists,
  addIpAddress,
  restrictToSelfOrSuperAdmin,
};