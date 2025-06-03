'use strict';

module.exports = {
  WALLET_EVENTS: {
    BALANCE_UPDATED: {
      event: 'wallet:balance_updated',
      description: 'Emitted when wallet balance is updated.',
      payload: ['driverId', 'amount', 'type', 'newBalance'],
    },
    TRANSACTION_RECORDED: {
      event: 'wallet:transaction_recorded',
      description: 'Emitted when a transaction is recorded.',
      payload: ['driverId', 'transactionId', 'taskId', 'amount', 'type'],
    },
    TIP_RECEIVED: {
      event: 'wallet:tip_received',
      description: 'Emitted when a tip is received.',
      payload: ['driverId', 'taskId', 'amount', 'tipId'],
    },
  },
};