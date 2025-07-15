// taxHandler.js
// Handles socket event emissions for merchant tax operations.

'use strict';

const socketService = require('@

services/common/socketService');
const taxEvents = require('@socket/events/merchant/wallet/taxEvents');

function setupTaxHandlers(io) {
  return {
    emitTaxCalculated: (data, room) => {
      socketService.emit(io, taxEvents.TAX_CALCULATED, data, room);
    },
    emitReportGenerated: (data, room) => {
      socketService.emit(io, taxEvents.REPORT_GENERATED, data, room);
    },
    emitSettingsUpdated: (data, room) => {
      socketService.emit(io, taxEvents.SETTINGS_UPDATED, data, room);
    },
    emitComplianceChecked: (data, room) => {
      socketService.emit(io, taxEvents.COMPLIANCE_CHECKED, data, room);
    },
  };
}

module.exports = { setupTaxHandlers };