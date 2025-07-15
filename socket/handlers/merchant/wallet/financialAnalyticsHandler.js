// financialAnalyticsHandler.js
// Handles socket event emissions for merchant financial analytics operations.

'use strict';

const socketService = require('@services/common/socketService');
const financialAnalyticsEvents = require('@socket/events/merchant/wallet/financialAnalyticsEvents');

function setupFinancialAnalyticsHandlers(io) {
  return {
    emitTransactionsTracked: (data, room) => {
      socketService.emit(io, financialAnalyticsEvents.TRANSACTIONS_TRACKED, data, room);
    },
    emitReportGenerated: (data, room) => {
      socketService.emit(io, financialAnalyticsEvents.REPORT_GENERATED, data, room);
    },
    emitTrendsAnalyzed: (data, room) => {
      socketService.emit(io, financialAnalyticsEvents.TRENDS_ANALYZED, data, room);
    },
    emitGoalsRecommended: (data, room) => {
      socketService.emit(io, financialAnalyticsEvents.GOALS_RECOMMENDED, data, room);
    },
  };
}

module.exports = { setupFinancialAnalyticsHandlers };