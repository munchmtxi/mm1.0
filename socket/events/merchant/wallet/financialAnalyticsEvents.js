// financialAnalyticsEvents.js
// Socket event names for merchant financial analytics operations.

'use strict';

module.exports = {
  TRANSACTIONS_TRACKED: 'merchant:analytics:transactionsTracked',
  REPORT_GENERATED: 'merchant:analytics:reportGenerated',
  TRENDS_ANALYZED: 'merchant:analytics:trendsAnalyzed',
  GOALS_RECOMMENDED: 'merchant:analytics:goalsRecommended',
};