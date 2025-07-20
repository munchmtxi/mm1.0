'use strict';

/**
 * socket/events/index.js
 *
 * Centralized export for role-specific Socket.IO events.
 * Product-specific events are defined in constants (munchConstants.js, etc.).
 *
 * Dependencies:
 * - events/admin/index.js
 * - events/customer/index.js
 * - events/driver/index.js
 * - events/merchant/index.js
 * - events/staff/index.js
 * - events/common/index.js
 *
 * Last Updated: July 19, 2025
 */

module.exports = {
  admin: require('./admin'),
  customer: require('./customer'),
  driver: require('./driver'),
  merchant: require('./merchant'),
  staff: require('./staff'),
  common: require('./common')
};