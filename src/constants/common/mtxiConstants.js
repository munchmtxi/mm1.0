'use strict';

const RIDE_STATUSES = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED'];

const RIDE_TYPES = {
  STANDARD: { maxPassengers: 4, baseFare: 5.0 },
  SHARED: { maxPassengers: 4, baseFare: 4.0, pooling: true },
  PREMIUM: { maxPassengers: 3, baseFare: 10.0, perks: ['water', 'premium_audio'] },
  SCHEDULED: { maxPassengers: 4, baseFare: 5.0 },
};

const RIDE_CONFIG = {
  MIN_RANGE_KM: 0.5,
  MAX_RANGE_KM: 150,
  CANCELLATION_TIMEOUT_MIN: 5,
  PICKUP_TIMEOUT_MIN: 10,
  MAX_ACTIVE_RIDES_PER_CUSTOMER: 3,
  SUPPORTED_CITIES: {
    US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'San Francisco'],
    GB: ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Edinburgh'],
    EU: ['Berlin', 'Paris', 'Amsterdam', 'Rome', 'Madrid'],
    CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
    AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
    MW: ['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba'],
    TZ: ['Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza'],
    KE: ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret'],
    MZ: ['Maputo', 'Beira', 'Nampula', 'Matola'],
    ZA: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
    IN: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad'],
    CM: ['Douala', 'Yaoundé'],
    GH: ['Accra', 'Kumasi'],
    MX: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla'],
    ER: ['Asmara', 'Keren', 'Massawa'],
  },
  SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'],
  DYNAMIC_PRICING: {
    surgeMultiplierMax: 3.0,
    eventMultiplier: 1.5,
  },
  SOCIAL_MEDIA_INTEGRATION: ['whatsapp', 'telegram', 'facebook', 'x'],
  WALLET_FEATURES: {
    add_funds: true,
    transfer_funds: true,
    crypto_payments: true,
    auto_top_up: { min: 5, max: 500 },
  },
};

const GROUP_CONFIG = {
  MAX_PARTY_SIZE: 8,
  INVITE_STATUSES: ['PENDING', 'ACCEPTED', 'DECLINED', 'REMOVED'],
  INVITE_METHODS: ['APP', 'SMS', 'EMAIL', 'WHATSAPP', 'TELEGRAM'],
  BILL_SPLIT_TYPES: ['EQUAL', 'CUSTOM', 'PERCENTAGE'],
  MAX_SPLIT_PARTICIPANTS: 8,
  GROUP_CHAT_CHANNELS: ['in_app', 'whatsapp', 'telegram'],
};

const SHARED_RIDE_CONFIG = {
  MAX_PASSENGERS: 4,
  MAX_STOPS: 5,
  DEVIATION_LIMIT_PERCENT: 15,
  AI_ROUTE_OPTIMIZATION: true,
};

const NAVIGATION_CONFIG = {
  UPDATE_FREQUENCY_SECONDS: 3,
  ROUTE_OPTIMIZATION: {
    MAX_DEVIATION_PERCENT: 10,
    TIME_WEIGHT: 0.6,
    DISTANCE_WEIGHT: 0.3,
    TRAFFIC_WEIGHT: 0.1,
  },
  MAP_SETTINGS: {
    DEFAULT_ZOOM: 15,
    MAX_WAYPOINTS: 7,
    PROVIDERS: {
      US: 'google_maps',
      GB: 'google_maps',
      EU: 'openstreetmap',
      CA: 'google_maps',
      AU: 'google_maps',
      MW: 'openstreetmap',
      TZ: 'openstreetmap',
      KE: 'openstreetmap',
      MZ: 'openstreetmap',
      ZA: 'openstreetmap',
      IN: 'google_maps',
      CM: 'openstreetmap',
      GH: 'openstreetmap',
      MX: 'google_maps',
      ER: 'openstreetmap',
    },
    REAL_TIME_TRAFFIC: true,
  },
};

const NOTIFICATION_TYPES = {
  RIDE_REQUESTED: 'RIDE_REQUESTED',
  RIDE_ACCEPTED: 'RIDE_ACCEPTED',
  RIDE_COMPLETED: 'RIDE_COMPLETED',
  RIDE_CANCELLED: 'RIDE_CANCELLED',
  RIDE_UPDATED: 'RIDE_UPDATED',
  BILL_SPLIT_REQUEST: 'BILL_SPLIT_REQUEST',
  FRIEND_INVITED: 'FRIEND_INVITED',
  GROUP_CHAT_MESSAGE: 'GROUP_CHAT_MESSAGE',
  SOCIAL_MEDIA_POST: 'SOCIAL_MEDIA_POST',
};

const AUDIT_TYPES = {
  RIDE_CREATED: 'RIDE_CREATED',
  RIDE_UPDATED: 'RIDE_UPDATED',
  RIDE_CANCELLED: 'RIDE_CANCELLED',
  BILL_SPLIT_PROCESSED: 'BILL_SPLIT_PROCESSED',
  FRIEND_INVITED: 'FRIEND_INVITED',
  GROUP_CHAT_MESSAGE_SENT: 'GROUP_CHAT_MESSAGE_SENT',
  SOCIAL_MEDIA_INTERACTION: 'SOCIAL_MEDIA_INTERACTION',
};

const ERROR_TYPES = [
  'INVALID_RIDE_REQUEST',
  'RIDE_NOT_FOUND',
  'PERMISSION_DENIED',
  'PAYMENT_FAILED',
  'RIDE_CREATION_FAILED',
  'RIDE_CANCELLATION_FAILED',
  'NO_ROLES_AVAILABLE',
  'RIDE_NOT_TRACKABLE',
  'RIDE_NOT_CANCELLABLE',
  'INVALID_REASON',
  'INVALID_FRIEND_INVITE',
  'MAX_FRIENDS_EXCEEDED',
  'INVALID_BILL_SPLIT',
  'FRIEND_NOT_FOUND',
  'WALLET_INSUFFICIENT_FUNDS',
];

const SUCCESS_MESSAGES = [
  'RIDE_REQUESTED',
  'RIDE_ACCEPTED',
  'RIDE_COMPLETED',
  'RIDE_CANCELLED',
  'PAYMENT_PROCESSED',
  'BILL_SPLIT_PROCESSED',
  'FRIEND_INVITED',
  'SOCIAL_POST_SHARED',
];

module.exports = {
  RIDE_STATUSES,
  RIDE_TYPES,
  RIDE_CONFIG,
  GROUP_CONFIG,
  SHARED_RIDE_CONFIG,
  NAVIGATION_CONFIG,
  NOTIFICATION_TYPES,
  AUDIT_TYPES,
  ERROR_TYPES,
  SUCCESS_MESSAGES,
};