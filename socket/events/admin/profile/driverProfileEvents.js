'use strict';

/**
 * Driver Profile Socket Events
 * Defines socket event constants for driver profile operations, ensuring consistency
 * across admin and driver notifications.
 */

module.exports = {
  PROFILE_CREATED: 'driver:profile:created',
  PROFILE_UPDATED: 'driver:profile:updated',
  CERTIFICATION_UPLOADED: 'driver:certification:uploaded',
  PROFILE_VERIFIED: 'driver:profile:verified',
  COUNTRY_UPDATED: 'driver:profile:country_updated',
  WALLET_UPDATED: 'driver:wallet:updated',
  PAYMENT_METHOD_ADDED: 'driver:wallet:payment_method_added',
  WITHDRAWAL_PROCESSED: 'driver:wallet:withdrawal_processed',
};