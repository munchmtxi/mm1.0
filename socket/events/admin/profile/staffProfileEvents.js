'use strict';

/**
 * Staff Profile Socket Events
 * Defines socket event constants for staff profile operations, ensuring consistency
 * across admin and staff notifications.
 */

module.exports = {
  PROFILE_CREATED: 'staff:profile:created',
  PROFILE_UPDATED: 'staff:profile:updated',
  COMPLIANCE_VERIFIED: 'staff:profile:compliance_verified',
  COUNTRY_UPDATED: 'staff:profile:country_updated',
  WALLET_UPDATED: 'staff:wallet:updated',
  PAYMENT_METHOD_ADDED: 'staff:wallet:payment_method_added',
  WITHDRAWAL_PROCESSED: 'staff:wallet:withdrawal_processed',
};