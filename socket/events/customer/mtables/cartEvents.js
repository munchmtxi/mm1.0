'use strict';

const customerConstants = require('@constants/customer/customerConstants');

module.exports = {
  CART_ADDED: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // order_status_update
  CART_UPDATED: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[2], // order_updated
  CART_CLEARED: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // order_status_update
};