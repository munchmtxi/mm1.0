'use strict';

const { Ride, Payment, Role, Permission } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const rideConstants = require('@constants/common/rideConstants');

const { ERROR_CODES } = rideConstants;

const checkRideExists = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const ride = await Ride.findByPk(rideId);

  if (!ride) {
    logger.error('Ride not found in middleware', { rideId, adminId: req.user?.id });
    return next(new AppError('Ride not found', 404, ERROR_CODES.NOT_FOUND));
  }

  req.ride = ride;
  logger.info('Ride verified in middleware', { rideId, adminId: req.user?.id });
  next();
});

const checkPaymentExists = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;
  const payment = await Payment.findByPk(paymentId);

  if (!payment) {
    logger.error('Payment not found in middleware', { paymentId, adminId: req.user?.id });
    return next(new AppError('Payment not found', 404, ERROR_CODES.NOT_FOUND));
  }

  req.payment = payment;
  logger.info('Payment verified in middleware', { paymentId, adminId: req.user?.id });
  next();
});

const restrictToRideAdmin = (...requiredPermissions) => {
  return catchAsync(async (req, res, next) => {
    const user = req.user;
    if (!user) {
      logger.warn('No user found in request', { userId: user?.id });
      return next(new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED));
    }

    // Fallback: Allow legacy 'admin' role if no permissions are specified
    if (user.role === 'admin' && !requiredPermissions.length) {
      logger.info('Legacy admin role verified', { adminId: user.id });
      return next();
    }

    // Find role by name
    const role = await Role.findOne({
      where: { name: user.role },
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['action', 'resource'],
        },
      ],
    });

    if (!role) {
      logger.warn('Role not found', { userId: user.id, role: user.role });
      return next(new AppError('Role not found', 403, ERROR_CODES.FORBIDDEN));
    }

    const userPermissions = role.permissions.map(perm => ({
      action: perm.action,
      resource: perm.resource,
    }));

    // Check if user has all required permissions
    const hasPermissions = requiredPermissions.every(requiredPerm =>
      userPermissions.some(
        userPerm =>
          userPerm.action === requiredPerm.action &&
          userPerm.resource === requiredPerm.resource
      )
    );

    if (!hasPermissions) {
      logger.warn('Insufficient permissions', {
        userId: user.id,
        requiredPermissions,
        userPermissions,
      });
      return next(new AppError('Insufficient permissions', 403, ERROR_CODES.FORBIDDEN));
    }

    logger.info('Admin permissions verified for ride operation', {
      adminId: user.id,
      permissions: requiredPermissions,
    });
    next();
  });
};

module.exports = { checkRideExists, checkPaymentExists, restrictToRideAdmin };