'use strict';

module.exports = {
  LOCATION_EVENTS: {
    UPDATED: {
      event: 'location:updated',
      description: 'Emitted when driver location is shared.',
      payload: ['driverId', 'coordinates'],
    },
  },
  ROUTE_EVENTS: {
    UPDATED: {
      event: 'route:updated',
      description: 'Emitted when a route is updated.',
      payload: ['driverId', 'routeId', 'newWaypoints'],
    },
  },
};