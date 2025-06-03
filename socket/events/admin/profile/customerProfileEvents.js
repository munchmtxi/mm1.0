'use strict';

/**
 * Customer Profile Socket Events
 * Defines socket event constants for customer profile operations, ensuring consistency
 * across admin and customer notifications.
 */

module.exports = {
  PROFILE_CREATED: 'customer:profile:created',
  PROFILE_UPDATED: 'customer:profile:updated',
  COUNTRY_UPDATED: 'customer:profile:country_updated',
  LANGUAGE_UPDATED: 'customer:profile:language_updated',
  DIETARY_UPDATED: 'customer:profile:dietary_updated',
  POINTS_AWARDED: 'customer:profile:points_awarded',
  WALLET_UPDATED: 'customer:wallet:updated',
  PAYMENT_METHOD_ADDED: 'customer:wallet:payment_method_added',
  WITHDRAWAL_PROCESSED: 'customer:wallet:withdrawal_processed',
};