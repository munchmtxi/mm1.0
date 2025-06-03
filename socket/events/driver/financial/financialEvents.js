'use strict';
module.exports = {
  FINANCIAL_EVENTS: {
    PAYOUT_REQUESTED: {
      event: 'payout:requested',
      description: 'Emitted when a payout is requested.',
      payload: ['payoutId', 'amount', 'method'],
    },
    PAYOUT_SCHEDULED: {
      event: 'payout:scheduled',
      description: 'Emitted when a recurring payout is scheduled.',
      payload: ['driverId', 'frequency', 'amount', 'method'],
    },
    TAX_CALCULATED: {
      event: 'tax:calculated',
      description: 'Emitted when tax is calculated.',
      payload: ['driverId', 'period', 'taxAmount', 'taxableAmount'],
    },
    TAX_REPORT_GENERATED: {
      event: 'tax:reportGenerated',
      description: 'Emitted when a tax report is generated.',
      payload: ['driverId', 'period'],
    },
    TAX_SETTINGS_UPDATED: {
      event: 'tax:settingsUpdated',
      description: 'Emitted when tax settings are updated.',
      payload: ['driverId', 'filingFrequency'],
    },
    FINANCIAL_GOALS_RECOMMENDED: {
      event: 'financial:goals_recommended',
      description: 'Emitted when financial goals are recommended.',
      payload: ['driverId', 'monthlyEarningsGoal', 'currency', 'recommendation'],
    },
  },
};