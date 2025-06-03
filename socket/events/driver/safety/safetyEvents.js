'use strict';
module.exports = {
  SAFETY_EVENTS: {
    INCIDENT_REPORTED: {
      event: 'safety:incident_reported',
      description: 'Emitted when a safety incident is reported.',
      payload: ['driverId', 'incidentId', 'incident_number'],
    },
    SOS_TRIGGERED: {
      event: 'safety:sos_triggered',
      description: 'Emitted when SOS is triggered.',
      payload: ['driverId', 'incidentId', 'incident_number'],
    },
    STATUS_UPDATED: {
      event: 'safety:status_updated',
      description: 'Emitted when safety status is retrieved.',
      payload: ['driverId', 'status'],
    },
    DISCREET_ALERT_SENT: {
      event: 'safety:discreet_alert_sent',
      description: 'Emitted when a discreet alert is sent.',
      payload: ['driverId', 'incidentId', 'incident_number'],
    },
  },