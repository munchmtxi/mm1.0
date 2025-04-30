'use strict';

// Array-based constant lists
const SUBSCRIPTION_TYPES_ARRAY = ['ride_basic', 'ride_premium', 'food'];
const SUBSCRIPTION_SCHEDULES_ARRAY = ['daily', 'weekly', 'monthly'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const RIDE_TYPES = ['STANDARD', 'PREMIUM'];

module.exports = {
  // Array-based exports
  SUBSCRIPTION_TYPES_ARRAY,
  SUBSCRIPTION_SCHEDULES_ARRAY,
  DAYS_OF_WEEK,
  RIDE_TYPES,

  // Enum-like object definitions
  SUBSCRIPTION_TYPES: {
    RIDE_BASIC: 'ride_basic',
    RIDE_PREMIUM: 'ride_premium',
    FOOD: 'food',
  },
  SUBSCRIPTION_SCHEDULES: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
  },
  SUBSCRIPTION_STATUSES: {
    ACTIVE: 'active',
    PAUSED: 'paused',
    CANCELED: 'canceled',
  },
  SUBSCRIPTION_SHARE_STATUSES: {
    INVITED: 'invited',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
  },
  SUBSCRIPTION_RIDE_LIMITS: {
    RIDE_BASIC: 5,
    RIDE_PREMIUM: 15,
  },
};