// src/communicationEvents.js
'use strict';

/**
 * Driver Communication Event Constants
 * Event constants for driver communication actions in Munch merchant service.
 * Last Updated: May 22, 2025
 */

const { EventEmitter } = require('events');

module.exports = {
  EVENT_TYPES: {
    DRIVER_MESSAGE_SENT: 'communication:driverMessageSent',
    DELIVERY_UPDATE_BROADCAST: 'communication:deliveryUpdateBroadcast',
    DRIVER_CHANNELS_UPDATED: 'communication:driverChannelsUpdated',
    DRIVER_COMMUNICATION_TRACKED: 'communication:driverCommunicationTracked',
  },

  NOTIFICATION_TYPES: {
    DRIVER_MESSAGE_SENT: 'driver_message_sent',
    DELIVERY_UPDATE_BROADCAST: 'delivery_update_broadcast',
    DRIVER_CHANNELS_UPDATED: 'driver_channels_updated',
    DRIVER_COMMUNICATION_TRACKED: 'driver_communication_tracked',
  },

  AUDIT_TYPES: {
    DRIVER_MESSAGE_SENT: 'driver_message_sent',
    DELIVERY_UPDATE_BROADCAST: 'delivery_update_broadcast',
    DRIVER_CHANNELS_UPDATED: 'driver_channels_updated',
    DRIVER_COMMUNICATION_TRACKED: 'driver_communication_tracked',
  },

  SETTINGS: {
    DEFAULT_LANGUAGE: 'en',
    VALID_DELIVERY_METHODS: ['push', 'sms', 'email', 'in_app'],
  },

  ERROR_CODES: {
    DRIVER_NOT_FOUND: 'DRIVER_NOT_FOUND',
    ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
    MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
    TASK_NOT_FOUND: 'TASK_NOT_FOUND',
    EVENT_PROCESSING_FAILED: 'EVENT_PROCESSING_FAILED',
  },

  DriverCommunicationEventEmitter: class DriverCommunicationEventEmitter extends EventEmitter {
    constructor() {
      super();
    }
  }
};