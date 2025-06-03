'use strict';

/**
 * reportingEvents.js
 * Socket events for munch financial reporting (staff role).
 * Events: reporting:payment_report_generated, reporting:wallet_summary, reporting:data_exported,
 * reporting:tax_reported, reporting:audit_trail.
 * Last Updated: May 26, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupReportingEvents(io, socket) {
  socket.on('reporting:payment_report_generated', (data) => {
    try {
      socketService.emit(io, 'payment_report_generated', {
        staffId: data.staffId,
        reportId: data.reportId,
      }, `munch:reporting:${data.staffId}`);
      logger.info('Payment report generated event emitted', data);
    } catch (error) {
      logger.error('Payment report generated event failed', { error: error.message, data });
    }
  });

  socket.on('reporting:wallet_summary', (data) => {
    try {
      socketService.emit(io, 'reporting:wallet_summary', {
        staffId: data.staffId,
        summary: data.summary,
      }, `munch:reporting:${data.staffId}`);
      logger.info('Wallet summary event emitted', data);
    } catch (error) {
      logger.error('Wallet summary event failed', { error: error.message, data });
    }
  });

  socket.on('reporting:data_exported', (data) => {
    try {
      socketService.emit(io, 'reporting:data_exported', {
        staffId: data.staffId,
      }, `munch:reporting:${data.staffId}`);
      logger.info('Data exported event emitted', data);
    } catch (error) {
      logger.error('Data exported event failed', { error: error.message, data });
    }
  });

  socket.on('reporting:tax_tracked', (data) => {
    try {
      socketService.emit(io, 'reporting:tax_tracked', {
        staffId: data.staffId,
        taxRecordId: data.taxRecordId,
      }, `munch:reporting:${data.staffId}`);
      logger.info('Tax tracked event emitted', data);
    } catch (error) {
      logger.error('Tax tracked event failed', { error: error.message, data });
    }
  });

  socket.on('reporting:audit_trail', (data) => {
    try {
      socketService.emit(io, 'reporting:audit_trail', {
        staffId: data.staffId,
        logs: data.logs,
      }, `munch:reporting:${data.staffId}`);
      logger.info('Audit trail event emitted', data);
    } catch (error) {
      logger.error('Audit trail event failed', { error: error.message, data });
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch reporting', { socketId: socket.id });
    setupReportingEvents(io, socket);
  });
}

module.exports = { initialize };