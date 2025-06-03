'use strict';

module.exports = {
  AVAILABILITY_EVENTS: {
    UPDATED: {
      event: 'availability:updated',
      description: 'Emitted when driver availability is set.',
      payload: ['driverId', 'date', 'start_time', 'end_time'],
    },
    TOGGLED: {
      event: 'availability:toggled',
      description: 'Emitted when driver availability is enabled/disabled.',
      payload: ['driverId', 'isAvailable'],
    },
  },
  SHIFT_EVENTS: {
    CREATED: {
      event: 'shift:created',
      description: 'Emitted when a shift is created.',
      payload: ['driverId', 'shiftId', 'start_time', 'end_time', 'shift_type'],
    },
    UPDATED: {
      event: 'shift:updated',
      description: 'Emitted when a shift is updated.',
      payload: ['driverId', 'shiftId', 'updates'],
    },
    HIGH_DEMAND: {
      event: 'shift:high_demand',
      description: 'Emitted when high-demand areas are detected.',
      payload: ['driverId', 'hotspots'],
    },
  },
};