// src/middleware/customer/disputes/disputeMiddleware.js
'use strict';

/**
 * Dispute middleware for validating dispute-related requests.
 */

const { restrictTo, checkPermissions } = require('@middleware/common/auth/authMiddleware');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const disputeConstants = require('@constants/common/disputeConstants');

const validateDisputeAccess = catchAsync(async (req, res, next) => {
  const { serviceId } = req.body;
  const customerId = req.user.id;

  logger.info('Validating dispute access', { serviceId, customerId });

  const { Booking, Order, Ride, ParkingBooking, InDiningOrder } = require('@models');
  let service;

  service = await Booking.findByPk(serviceId);
  if (service) {
    if (service.customer_id !== customerId) {
      throw new AppError('Unauthorized dispute', 403, disputeConstants.ERROR_CODES.UNAUTHORIZED_DISPUTE);
    }
  } else {
    service = await Order.findByPk(serviceId);
    if (service) {
      if (service.customer_id !== customerId) {
        throw new AppError('Unauthorized dispute', 403, disputeConstants.ERROR_CODES.UNAUTHORIZED_DISPUTE);
      }
    } else {
      service = await Ride.findByPk(serviceId);
      if (service) {
        if (service.customerId !== customerId) {
          throw new AppError('Unauthorized dispute', 403, disputeConstants.ERROR_CODES.UNAUTHORIZED_DISPUTE);
        }
      } else {
        service = await ParkingBooking.findByPk(serviceId);
        if (service) {
          if (service.customer_id !== customerId) {
            throw new AppError('Unauthorized dispute', 403, disputeConstants.ERROR_CODES.UNAUTHORIZED_DISPUTE);
          }
        } else {
          service = await InDiningOrder.findByPk(serviceId);
          if (service) {
            if (service.customer_id !== customerId) {
              throw new AppError('Unauthorized dispute', 403, disputeConstants.ERROR_CODES.UNAUTHORIZED_DISPUTE);
            }
          } else {
            throw new AppError('Service not found', 404, disputeConstants.ERROR_CODES.INVALID_SERVICE);
          }
        }
      }
    }
  }

  next();
});

const validateDisputeStatusAccess = catchAsync(async (req, res, next) => {
  const { disputeId } = req.params;
  const customerId = req.user.id;

  logger.info('Validating dispute status access', { disputeId, customerId });

  const { Dispute } = require('@models');
  const dispute = await Dispute.findByPk(disputeId);
  if (!dispute) {
    throw new AppError('Dispute not found', 404, disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND);
  }
  if (dispute.customer_id !== customerId) {
    throw new AppError('Unauthorized dispute', 403, disputeConstants.ERROR_CODES.UNAUTHORIZED_DISPUTE);
  }

  next();
});

const validateResolveAccess = catchAsync(async (req, res, next) => {
  const { disputeId } = req.body;

  logger.info('Validating dispute resolution access', { disputeId });

  const { Dispute } = require('@models');
  const dispute = await Dispute.findByPk(disputeId);
  if (!dispute) {
    throw new AppError('Dispute not found', 404, disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND);
  }
  if (
    dispute.status === disputeConstants.DISPUTE_STATUSES.RESOLVED ||
    dispute.status === disputeConstants.DISPUTE_STATUSES.CLOSED
  ) {
    throw new AppError('Dispute already resolved', 409, disputeConstants.ERROR_CODES.DISPUTE_ALREADY_RESOLVED);
  }

  next();
});

module.exports = {
  restrictTo,
  checkPermissions,
  validateDisputeAccess,
  validateDisputeStatusAccess,
  validateResolveAccess,
};