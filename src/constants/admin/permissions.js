'use strict';

const PERMISSIONS = {
  VIEW_RIDE: { action: 'view', resource: 'ride' },
  MANAGE_RIDE: { action: 'manage', resource: 'ride' },
  ASSIGN_DRIVER: { action: 'assign', resource: 'driver' },
  TRACK_DRIVER: { action: 'track', resource: 'driver' },
  MANAGE_PAYMENTS: { action: 'manage', resource: 'payment' },
};

module.exports = PERMISSIONS;