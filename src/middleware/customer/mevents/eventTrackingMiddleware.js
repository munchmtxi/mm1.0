'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/auth/authMiddleware');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const meventsTrackingConstants = require('@constants/meventsTrackingConstants');
const { Event, ParkingBooking, MenuInventory, Table } = require('@models');

const validateEventAccess = catchAsync(async (req, res, next) => {
  const { eventId, interactionType, metadata } = req.body;

  if (eventId) {
    logger.info('Validating event access', { eventId });

    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new AppError('Event not found', 404, meventsTrackingConstants.ERROR_CODES.INVALID_EVENT);
    }
  }

  // Validate metadata for specific interaction types
  if (interactionType === meventsTrackingConstants.INTERACTION_TYPES.PARKING_BOOKING_ADDED && metadata?.parkingBookingId) {
    const parkingBooking = await ParkingBooking.findByPk(metadata.parkingBookingId);
    if (!parkingBooking) {
      throw new AppError('Parking booking not found', 404, meventsTrackingConstants.ERROR_CODES.INVALID_SERVICE);
    }
  }

  if (interactionType === meventsTrackingConstants.INTERACTION_TYPES.MENU_ITEM_SELECTED && metadata?.menuItemId) {
    const menuItem = await MenuInventory.findByPk(metadata.menuItemId);
    if (!menuItem) {
      throw new AppError('Menu item not found', 404, meventsTrackingConstants.ERROR_CODES.INVALID_MENU_ITEM);
    }
  }

  if (interactionType === meventsTrackingConstants.INTERACTION_TYPES.TABLE_SELECTED && metadata?.tableId) {
    const table = await Table.findByPk(metadata.tableId);
    if (!table) {
      throw new AppError('Table not found', 404, meventsTrackingConstants.ERROR_CODES.INVALID_TABLE);
    }
  }

  if (interactionType === meventsTrackingConstants.INTERACTION_TYPES.EVENT_UPDATED && metadata?.eventId) {
    const event = await Event.findByPk(metadata.eventId);
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