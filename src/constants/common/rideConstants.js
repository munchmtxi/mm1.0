'use strict';

const RIDE_TYPES = {
  STANDARD: 'standard',
  PREMIUM: 'premium',
  FREE: 'free',
  XL: 'xl',
  ECO: 'eco',
  MOTORBIKE: 'motorbike',
  SCHEDULED: 'scheduled',
};

const RIDE_STATUSES = {
  REQUESTED: 'requested',
  SCHEDULED: 'scheduled',
  ASSIGNED: 'assigned',
  ARRIVED: 'arrived',
  STARTED: 'started',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PAYMENT_CONFIRMED: 'payment_confirmed',
};

const STATUS_TRANSITIONS = {
  requested: ['scheduled', 'assigned', 'cancelled'],
  scheduled: ['assigned', 'cancelled'],
  assigned: ['arrived', 'cancelled'],
  arrived: ['started', 'cancelled'],
  started: ['completed', 'cancelled'],
  completed: ['payment_confirmed'],
  payment_confirmed: [],
  cancelled: [],
};

const STATUS_MAPPINGS = {
  requested: RIDE_STATUSES.REQUESTED,
  scheduled: RIDE_STATUSES.SCHEDULED,
  assigned: RIDE_STATUSES.ASSIGNED,
  arrived: RIDE_STATUSES.ARRIVED,
  started: RIDE_STATUSES.STARTED,
  completed: RIDE_STATUSES.COMPLETED,
  cancelled: RIDE_STATUSES.CANCELLED,
  payment_confirmed: RIDE_STATUSES.PAYMENT_CONFIRMED,
};

const PAYMENT_TYPES = {
  PAYMENT: 'payment',
  TIP: 'tip',
  FARE: 'fare',
};

const PARTICIPANT_STATUSES = {
  INVITED: 'invited',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

const SUPPORTED_COUNTRIES = ['MWI', 'TZA', 'MOZ', 'KEN', 'ZMB', 'GHA', 'SLE', 'CAN', 'ARE'];

const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_STATUS: 'INVALID_STATUS',
  NO_DRIVER: 'NO_DRIVER',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SOCKET_NOT_INITIALIZED: 'SOCKET_NOT_INITIALIZED',
  ALREADY_INVITED: 'ALREADY_INVITED',
  ALREADY_ASSIGNED: 'ALREADY_ASSIGNED',
  DRIVER_UNAVAILABLE: 'DRIVER_UNAVAILABLE',
  FORBIDDEN: 'FORBIDDEN',
  NO_TOKEN: 'NO_TOKEN',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
};

const ALERT_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const DISPUTE_ACTIONS = {
  REFUND: 'refund',
  DISMISS: 'dismiss',
  ESCALATE: 'escalate',
};

module.exports = {
  RIDE_TYPES,
  RIDE_STATUSES,
  STATUS_TRANSITIONS,
  STATUS_MAPPINGS,
  PAYMENT_TYPES,
  PARTICIPANT_STATUSES,
  SUPPORTED_COUNTRIES,
  ERROR_CODES,
  ALERT_SEVERITIES,
  DISPUTE_ACTIONS,
};