'use strict';

const passport = require('passport');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const authConstants = require('@constants/common/authConstants');
const catchAsync = require('@utils/catchAsync');

const authenticate = (req, res, next) => {
  logger.info('Authenticate middleware called', {
    requestId: req.id,
    authorizationHeader: req.headers.authorization ? 'Present' : 'Missing',
  });

  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    logger.info('Passport authenticate callback', {
      requestId: req.id,
      error: err ? err.message : null,
      user: user ? { id: user.id, role: user.role } : null,
      info: info ? info.message : null,
    });

    if (err) {
      logger.error('Authentication error', { requestId: req.id, error: err.message, stack: err.stack });
      return next(new AppError('Authentication error', 500, authConstants.ERROR_CODES.AUTH_ERROR));
    }

    if (!user) {
      logger.warn('Authentication failed', { requestId: req.id, info: info ? info.message : 'No user found' });
      return next(new AppError('Unauthorized', 401, authConstants.ERROR_CODES.UNAUTHORIZED));
    }

    req.user = user;
    next();
  })(req, res, next);
};

const restrictTo = (...roles) => {
  return catchAsync(async (req, res, next) => {
    logger.info('restrictTo middleware called', {
      requestId: req.id,
      user: req.user ? { id: req.user.id, role: req.user.role } : null,
      allowedRoles: roles,
    });

    if (!req.user) {
      logger.warn('No user found in request', { requestId: req.id, userId: req.user?.id });
      throw new AppError('Unauthorized', 401, authConstants.ERROR_CODES.USER_NOT_FOUND);
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Role unauthorized', {
        requestId: req.id,
        userId: req.user.id,
        role: req.user.role,
        allowedRoles: roles,
      });
      throw new AppError('Forbidden', 403, authConstants.ERROR_CODES.PERMISSION_DENIED);
    }

    logger.info('restrictTo passed', { requestId: req.id, userId: req.user.id, role: req.user.role });
    next();
  });
};

const checkPermissions = (permission) => {
  return catchAsync(async (req, res, next) => {
    logger.info('checkPermissions middleware called', {
      requestId: req.id,
      user: req.user ? { id: req.user.id, role: req.user.role } : null,
      requiredPermission: permission,
    });

    if (!req.user) {
      logger.warn('No user found in request', { requestId: req.id });
      throw new AppError('Unauthorized', 401, authConstants.ERROR_CODES.USER_NOT_FOUND);
    }

    const rolePermissions = authConstants.RBAC_CONSTANTS.ROLE_PERMISSIONS[req.user.role];
    if (!rolePermissions || !Object.values(rolePermissions).flat().includes(permission)) {
      logger.warn('Permission denied', {
        requestId: req.id,
        userId: req.user.id,
        role: req.user.role,
        requiredPermission: permission,
      });
      throw new AppError('Forbidden', 403, authConstants.ERROR_CODES.PERMISSION_DENIED);
    }

    logger.info('checkPermissions passed', { requestId: req.id, userId: req.user.id, role: req.user.role });
    next();
  });
};

module.exports = { authenticate, restrictTo, checkPermissions };