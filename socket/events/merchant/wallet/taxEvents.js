// taxEvents.js
// Socket event names for merchant tax operations.

'use strict';

module.exports = {
  TAX_CALCULATED: 'merchant:tax:calculated',
  REPORT_GENERATED: 'merchant:tax:reportGenerated',
  SETTINGS_UPDATED: 'merchant:tax:settingsUpdated',
  COMPLIANCE_CHECKED: 'merchant:tax:complianceChecked',
};