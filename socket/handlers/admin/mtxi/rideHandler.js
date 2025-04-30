'use strict';

const adminRideService = require('@services/admin/mtxi/adminRideService');
const rideEvents = require('@socket/events/admin/mtxi/rideEvents');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const rideConstants = require('@constants/admin/rideConstants');
const PERMISSIONS = require('@constants/admin/permissions');
const { Role, Permission } = require('@models');

const checkPermissions = async (user, requiredPermissions) => {
  if (!user) {
    throw new AppError('Unauthorized access', 401, 'UNAUTHORIZED');
  }

  if (user.role === 'admin' && !requiredPermissions.length) {
    return;
  }

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
    throw new AppError('Role not found', 403, 'FORBIDDEN');
  }

  const userPermissions = role.permissions.map(perm => ({
    action: perm.action,
    resource: perm.resource,
  }));

  const hasPermissions = requiredPermissions.every(requiredPerm =>
    userPermissions.some(
      userPerm =>
        userPerm.action === requiredPerm.action &&
        userPerm.resource === requiredPerm.resource
    )
  );

  if (!hasPermissions) {
    throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
  }
};

const handleRideAlert = catchAsync(async (rideId, alertData, adminId, socket) => {
  try {
    if (!socket.user) throw new AppError('Unauthorized access', 401, 'UNAUTHORIZED');
    await checkPermissions(socket.user, [PERMISSIONS.MANAGE_RIDE]);
    const { message, severity } = alertData;
    if (!message || !Object.values(rideConstants.ALERT_SEVERITIES).includes(severity)) {
      throw new AppError('Invalid alert data', 400, 'INVALID_INPUT');
    }
    const alert = await adminRideService.handleRideAlert(rideId, alertData);
    rideEvents.emitRideAlert(rideId, alert);
    logger.info('Ride alert handled by admin', { rideId, adminId, severity });
    return alert;
  } catch (error) {
    logger.error('Failed to handle ride alert', { error: error.message, rideId, adminId });
    throw error instanceof AppError ? error : new AppError('Failed to handle ride alert', 500, 'INTERNAL_SERVER_ERROR');
  }
});

const handleRideStatusUpdate = catchAsync(async (rideId, status, adminId, socket) => {
  try {
    if (!socket.user) throw new AppError('Unauthorized access', 401, 'UNAUTHORIZED');
    await checkPermissions(socket.user, [PERMISSIONS.MANAGE_RIDE]);
    if (!Object.values(rideConstants.RIDE_STATUSES).includes(status)) {
      throw new AppError('Invalid ride status', 400, 'INVALID_STATUS');
    }
    const ride = await adminRideService.updateRideStatus(rideId, status);
    rideEvents.emitRideStatusUpdate(rideId, status);
    logger.info('Ride status updated by admin', { rideId, status, adminId });
    return ride;
  } catch (error) {
    logger.error('Failed to update ride status', { error: error.message, rideId, adminId });
    throw error instanceof AppError ? error : new AppError('Failed to update ride status', 500, 'INTERNAL_SERVER_ERROR');
  }
});

const handleRideDispute = catchAsync(async (rideId, resolution, adminId, socket) => {
  try {
    if (!socket.user) throw new AppError('Unauthorized access', 401, 'UNAUTHORIZED');
    await checkPermissions(socket.user, [PERMISSIONS.MANAGE_RIDE]);
    const { action, reason } = resolution;
    if (!Object.values(rideConstants.DISPUTE_ACTIONS).includes(action)) {
      throw new AppError('Invalid dispute action', 400, 'INVALID_ACTION');
    }
    const dispute = await adminRideService.handleRideDispute(rideId, resolution);
    rideEvents.emitRideDispute(rideId, dispute);
    logger.info('Ride dispute handled by admin', { rideId, adminId, action });
    return dispute;
  } catch (error) {
    logger.error('Failed to handle ride dispute', { error: error.message, rideId, adminId });
    throw error instanceof AppError ? error : new AppError('Failed to handle ride dispute', 500, 'INTERNAL_SERVER_ERROR');
  }
});

const handleAssignDriver = catchAsync(async (rideId, driverId, adminId, socket) => {
  try {
    if (!socket.user) throw new AppError('Unauthorized access', 401, 'UNAUTHORIZED');
    await checkPermissions(socket.user, [PERMISSIONS.ASSIGN_DRIVER]);
    const ride = await adminRideService.assignDriverToRide(rideId, driverId);
    rideEvents.emitDriverAssigned(rideId, driverId, ride.customerId);
    logger.info('Driver assigned by admin', { rideId, driverId, adminId });
    return ride;
  } catch (error) {
    logger.error('Failed to assign driver', { error: error.message, rideId, adminId });
    throw error instanceof AppError ? error : new AppError('Failed to assign driver', 500, 'INTERNAL_SERVER_ERROR');
  }
});

const handleTrackDriverLocation = catchAsync(async (rideId, adminId, socket) => {
  try {
    if (!socket.user) throw new AppError('Unauthorized access', 401, 'UNAUTHORIZED');
    await checkPermissions(socket.user, [PERMISSIONS.TRACK_DRIVER]);
    const location = await adminRideService.trackDriverLocation(rideId);
    rideEvents.emitDriverLocation(location.driverId, location.location, location.status, rideId);
    logger.info('Driver location tracked by admin', { rideId, adminId });
    return location;
  } catch (error) {
    logger.error('Failed to track driver location', { error: error.message, rideId, adminId });
    throw error instanceof AppError ? error : new AppError('Failed to track driver location', 500, 'INTERNAL_SERVER_ERROR');
  }
});

const handleLiveTripMetrics = catchAsync(async (adminId, socket) => {
  try {
    if (!socket.user) throw new AppError('Unauthorized access', 401, 'UNAUTHORIZED');
    await checkPermissions(socket.user, [PERMISSIONS.VIEW_RIDE]);
    const metrics = await adminRideService.getLiveTripMetrics();
    rideEvents.emitLiveTripMetrics(metrics);
    logger.info('Live trip metrics retrieved by admin', { adminId });
    return metrics;
  } catch (error) {
    logger.error('Failed to retrieve live trip metrics', { error: error.message, adminId });
    throw error instanceof AppError ? error : new AppError('Failed to retrieve live trip metrics', 500, 'INTERNAL_SERVER_ERROR');
  }
});

const handlePaymentDispute = catchAsync(async (paymentId, disputeData, adminId, socket) => {
  try {
    if (!socket.user) throw new AppError('Unauthorized access', 401, 'UNAUTHORIZED');
    await checkPermissions(socket.user, [PERMISSIONS.MANAGE_PAYMENTS]);
    const { action, reason } = disputeData;
    if (!Object.values(rideConstants.DISPUTE_ACTIONS).includes(action)) {
      throw new AppError('Invalid dispute action', 400, 'INVALID_ACTION');
    }
    const dispute = await adminRideService.disputePayment(paymentId, disputeData);
    rideEvents.emitPaymentDisputed(paymentId, dispute);
    logger.info('Payment dispute handled by admin', { paymentId, adminId, action });
    return dispute;
  } catch (error) {
    logger.error('Failed to handle payment dispute', { error: error.message, paymentId, adminId });
    throw error instanceof AppError ? error : new AppError('Failed to handle payment dispute', 500, 'INTERNAL_SERVER_ERROR');
  }
});

module.exports = {
  handleRideAlert,
  handleRideStatusUpdate,
  handleRideDispute,
  handleAssignDriver,
  handleTrackDriverLocation,
  handleLiveTripMetrics,
  handlePaymentDispute,
};