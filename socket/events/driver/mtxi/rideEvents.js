'use strict';

/**
 * Socket Events for Driver MTX Services
 * Defines socket event names and descriptions for ride and shared ride operations.
 */

module.exports = {
  RIDE_EVENTS: {
    ACCEPTED: {
      event: 'ride:accepted',
      description: 'Emitted when a driver accepts a ride request.',
      payload: ['rideId', 'driverId', 'customerId'],
    },
    STATUS_UPDATED: {
      event: 'ride:status_updated',
      description: 'Emitted when a ride’s status is updated by the driver.',
      payload: ['rideId', 'status', 'driverId'],
    },
    MESSAGE: {
      event: 'ride:message',
      description: 'Emitted when a driver sends a message to a passenger.',
      payload: ['rideId', 'message', 'sender', 'driverId', 'customerId'],
    },
    CANCELLED: {
      event: 'ride:cancelled',
      description: 'Emitted when a ride is cancelled.',
      payload: ['rideId', 'customerId'],
    },
  },
  SHARED_RIDE_EVENTS: {
    PASSENGER_ADDED: {
      event: 'shared_ride:passenger_added',
      description: 'Emitted when a passenger is added to a shared ride.',
      payload: ['rideId', 'passengerId', 'driverId'],
    },
    PASSENGER_REMOVED: {
      event: 'shared_ride:passenger_removed',
      description: 'Emitted when a passenger is removed from a shared ride.',
      payload: ['rideId', 'passengerId', 'driverId'],
    },
    ROUTE_UPDATED: {
      event: 'shared_ride:route_updated',
      description: 'Emitted when the shared ride route is optimized.',
      payload: ['rideId', 'route'],
    },
  },
};