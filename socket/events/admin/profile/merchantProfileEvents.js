'use strict';

/**
 * Merchant Profile Socket Events
 * Defines socket event constants for merchant profile operations, ensuring consistency
 * across admin and merchant notifications.
 */

module.exports = {
  PROFILE_CREATED: 'merchant:profile:created',
  PROFILE_UPDATED: 'merchant:profile:updated',
  COUNTRY_UPDATED: 'merchant:profile:country_updated',
  BRANCH_SETTINGS_UPDATED: 'merchant:branch:settings_updated',
  MEDIA_UPLOADED: 'merchant:profile:media_uploaded',
  WALLET_UPDATED: 'merchant:wallet:updated',
  PAYMENT_METHOD_ADDED: 'merchant:wallet:payment_method_added',
  WITHDRAWAL_PROCESSED: 'merchant:wallet:withdrawal_processed',
};