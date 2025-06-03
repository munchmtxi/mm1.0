'use strict';

const socketService = require('@services/common/socketService');
const inventoryEvents = require('@socket/events/customer/munch/inventoryEvents');
const logger = require('@utils/logger');

const handleMenuViewed = async (io, data) => {
  const { restaurantId, customerId } = data;
  await socketService.emit(io, inventoryEvents.MENU_VIEWED, { restaurantId, customerId }, `customer:${customerId}`);
  logger.info('Menu viewed event emitted', { restaurantId, customerId });
};

const handleAvailabilityChecked = async (io, data) => {
  const { itemId, customerId } = data;
  await socketService.emit(io, inventoryEvents.AVAILABILITY_CHECKED, { itemId, customerId }, `customer:${customerId}`);
  logger.info('Availability checked event emitted', { itemId, customerId });
};

module.exports = { handleMenuViewed, handleAvailabilityChecked };