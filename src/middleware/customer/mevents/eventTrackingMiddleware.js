'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/auth/authMiddleware');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const meventsTrackingConstants = require('@constants/meventsTrackingConstants');
const { Event } = require('@models');

const validateEventAccess = catchAsync(async (req, res, next) => {
  const { eventId } = req.body;

  if (eventId) {
    logger.info('Validating event access', { eventId });

    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new AppError('Event not found', 404, meventsTrackingConstants.ERROR_CODES.INVALID_EVENT);
    }
  }

  next();
});

const validateCustomerAccess = catchAsync(async (req, res, next) => {
  const customerId = parseInt(req.params.customerId, 10);
  const userId = req.user.id;

  logger.info('Validating customer access', { customerId, userId });

  if (customerId && customerId !== userId) {
    throw new AppError('Unauthorized access', 403, meventsTrackingConstants.ERROR_CODES.UNAUTHORIZED);
  }

  next();
});

module.exports = {
  authenticate,
  restrictTo,
  checkPermissions,
  validateEventAccess,
  validateCustomerAccess,
};