'use strict';

// === Core ENUM-style objects ===
const SUBSCRIPTION_TYPES = {
  RIDE_STANDARD: 'ride_standard',
  RIDE_PREMIUM: 'ride_premium',
};

const SUBSCRIPTION_SCHEDULES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  CANCELED: 'canceled',
};

const SUBSCRIPTION_SHARE_STATUSES = {
  INVITED: 'invited',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_STATUS: 'INVALID_STATUS',
};

// === Ride Limits for Subscriptions ===
const SUBSCRIPTION_RIDE_LIMITS = {
  RIDE_STANDARD: 10, // Example: 10 rides per month for standard
  RIDE_PREMIUM: 20, // Example: 20 rides per month for premium
};

// === Array-based lists (for ENUM spreads) ===
const SUBSCRIPTION_TYPES_ARRAY = Object.values(SUBSCRIPTION_TYPES);
const SUBSCRIPTION_SCHEDULES_ARRAY = Object.values(SUBSCRIPTION_SCHEDULES);
const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];
const RIDE_TYPES = ['STANDARD', 'PREMIUM'];

// === Export them all together ===
module.exports = {
  SUBSCRIPTION_TYPES,
  SUBSCRIPTION_SCHEDULES,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_SHARE_STATUSES,
  ERROR_CODES,
  SUBSCRIPTION_RIDE_LIMITS, // Add to exports
  SUBSCRIPTION_TYPES_ARRAY,
  SUBSCRIPTION_SCHEDULES_ARRAY,
  DAYS_OF_WEEK,
  RIDE_TYPES,
};