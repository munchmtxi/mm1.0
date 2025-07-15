// walletEvents.js
// Socket event names for merchant wallet operations.

'use strict';

module.exports = {
  WALLET_CREATED: 'merchant:wallet:created',
  PAYMENT_RECEIVED: 'merchant:wallet:paymentReceived',
  PAYOUT_DISBURSED: 'merchant:wallet:payoutDisbursed',
};