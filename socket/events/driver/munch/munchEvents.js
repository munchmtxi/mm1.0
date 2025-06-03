'use strict';

module.exports = {
  DELIVERY_EVENTS: {
    ACCEPTED: {
      event: 'delivery:accepted',
      description: 'Emitted when a driver accepts a delivery.',
      payload: ['deliveryId', 'driverId', 'customerId'],
    },
    STATUS_UPDATED: {
      event: 'delivery:status_updated',
      description: 'Emitted when a delivery’s status is updated.',
      payload: ['deliveryId', 'status', 'driverId'],
    },
    MESSAGE: {
      event: 'delivery:message',
      description: 'Emitted when a driver sends a message to a customer.',
      payload: ['deliveryId', 'message', 'sender', 'driverId', 'customerId'],
    },
  },
  BATCH_DELIVERY_EVENTS: {
    CREATED: {
      event: 'batch_delivery:created',
      description: 'Emitted when a batch delivery is created.',
      payload: ['batchId', 'deliveryIds', 'driverId'],
    },
    STATUS_UPDATED: {
      event: 'batch_delivery:status_updated',
      description: 'Emitted when a batch delivery’s status is updated.',
      payload: ['batchId', 'status', 'driverId'],
    },
    ROUTE_UPDATED: {
      event: 'batch_delivery:route_updated',
      description: 'Emitted when the batch delivery route is optimized.',
      payload: ['batchId', 'route'],
    },
  },
};