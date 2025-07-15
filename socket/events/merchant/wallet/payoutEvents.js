// payoutEvents.js
// Socket event names for merchant payout operations.

'use strict';

module.exports = {
  SETTINGS_CONFIGURED: 'merchant:payout:settingsConfigured',
  PAYOUT_PROCESSED: 'merchant:payout:processed',
  METHOD_VERIFIED: 'merchant:payout:methodVerified',
};