'use strict';

const socketService = require('@services/common/socketService');
const financialReportingEvents = require('@socket/events/staff/wallet/financialReporting.events');
const logger = require('@utils/logger');

function setupFinancialReportingHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(financialReportingEvents.PAYMENT_REPORT_GENERATED, (data) => {
      logger.info('Payment report generated event received', { data });
      socketService.emit(`munch:reporting:${data.staffId}`, financialReportingEvents.PAYMENT_REPORT_GENERATED, data);
    });

    socket.on(financialReportingEvents.WALLET_SUMMARY, (data) => {
      logger.info('Wallet summary event received', { data });
      socketService.emit(`munch:reporting:${data.staffId}`, financialReportingEvents.WALLET_SUMMARY, data);
    });

    socket.on(financialReportingEvents.DATA_EXPORTED, (data) => {
      logger.info('Data exported event received', { data });
      socketService.emit(`munch:reporting:${data.staffId}`, financialReportingEvents.DATA_EXPORTED, data);
    });

    socket.on(financialReportingEvents.TAX_TRACKED, (data) => {
      logger.info('Tax tracked event received', { data });
      socketService.emit(`munch:reporting:${data.staffId}`, financialReportingEvents.TAX_TRACKED, data);
    });

    socket.on(financialReportingEvents.AUDIT_TRAIL, (data) => {
      logger.info('Audit trail event received', { data });
      socketService.emit(`munch:reporting:${data.staffId}`, financialReportingEvents.AUDIT_TRAIL, data);
    });
  });
}

module.exports = { setupFinancialReportingHandlers };