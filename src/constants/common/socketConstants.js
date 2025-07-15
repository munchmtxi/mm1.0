'use strict';

module.exports = {
  SOCKET_EVENT_TYPES: {
    // ... existing events ...
    CONNECTION: 'CONNECTION',
    DISCONNECT: 'DISCONNECT',
    ERROR: 'ERROR',
    // Admin Events
    ADMIN_USER_UPDATED: 'ADMIN_USER_UPDATED',
    ADMIN_CONFIG_CHANGED: 'ADMIN_CONFIG_CHANGED',
    ADMIN_ANALYTICS_UPDATED: 'ADMIN_ANALYTICS_UPDATED',
    // Customer Events
    CUSTOMER_BOOKING_UPDATE: 'BOOKING_UPDATE', // mtables, mpark
    CUSTOMER_ORDER_UPDATE: 'ORDER_UPDATE', // munch
    CUSTOMER_RIDE_UPDATE: 'RIDE_UPDATE', // mtxi
    CUSTOMER_EVENT_UPDATE: 'EVENT_UPDATE', // mevents
    CUSTOMER_PARKING_UPDATE: 'PARKING_UPDATE', // mpark
    CUSTOMER_WALLET_UPDATE: 'WALLET_UPDATE',
    CUSTOMER_FRIEND_REQUEST: 'FRIEND_REQUEST',
    CUSTOMER_EVENT_INVITE: 'EVENT_INVITE', // mevents
    CUSTOMER_GROUP_CHAT: 'GROUP_CHAT', // all services
    CUSTOMER_SOCIAL_POST: 'SOCIAL_POST', // all services
    // Profile Events (Added)
    PROFILE_UPDATED: 'PROFILE_UPDATED',
    COUNTRY_SET: 'COUNTRY_SET',
    LANGUAGE_SET: 'LANGUAGE_SET',
    DIETARY_PREFERENCES_SET: 'DIETARY_PREFERENCES_SET',
    DEFAULT_ADDRESS_SET: 'DEFAULT_ADDRESS_SET',
    SCREEN_READERS_UPDATED: 'SCREEN_READERS_UPDATED',
    FONT_SIZE_UPDATED: 'FONT_SIZE_UPDATED',
    ACCESSIBILITY_LANGUAGE_UPDATED: 'ACCESSIBILITY_LANGUAGE_UPDATED',
    PRIVACY_SETTINGS_UPDATED: 'PRIVACY_SETTINGS_UPDATED',
    DATA_ACCESS_UPDATED: 'DATA_ACCESS_UPDATED',
    // Merchant Events
    MERCHANT_BOOKING_CONFIRMED: 'BOOKING_CONFIRMED', // mtables, mpark
    MERCHANT_ORDER_RECEIVED: 'ORDER_RECEIVED', // munch
    MERCHANT_EVENT_CREATED: 'EVENT_CREATED', // mevents
    MERCHANT_PARKING_UPDATE: 'PARKING_UPDATE', // mpark
    MERCHANT_PAYOUT_PROCESSED: 'PAYOUT_PROCESSED',
    // Staff Events
    STAFF_TASK_ASSIGNED: 'TASK_ASSIGNMENT',
    STAFF_SHIFT_UPDATED: 'SHIFT_UPDATE',
    STAFF_WALLET_UPDATED: 'WALLET_UPDATE',
    STAFF_ANNOUNCEMENT: 'ANNOUNCEMENT',
    // Wallet Events
    WALLET_CREATED: 'WALLET_CREATED',
    TRANSACTION_COMPLETED: 'TRANSACTION_COMPLETED',
    TRANSACTION_HISTORY: 'TRANSACTION_HISTORY',
    // Gamification Events
    GAMIFICATION_POINTS_AWARDED: 'GAMIFICATION_POINTS_AWARDED',
    GAMIFICATION_BADGE_AWARDED: 'GAMIFICATION_BADGE_AWARDED',
    GAMIFICATION_REWARD_REDEEMED: 'GAMIFICATION_REWARD_REDEEMED',
    // Location Event
    LOCATION_UPDATE: 'LOCATION_UPDATE',
    // Analytics Event
    ANALYTICS_PARKING_BEHAVIOR_TRACKED: 'ANALYTICS_PARKING_BEHAVIOR_TRACKED' // Added
  },
  SOCKET_AUDIT_ACTIONS: {
    // ... existing actions ...
    USER_LOGIN: { type: 'USER_LOGIN', description: 'User logged in via socket' },
    USER_LOGOUT: { type: 'USER_LOGOUT', description: 'User logged out via socket' },
    PROFILE_UPDATED: { type: 'PROFILE_UPDATED', description: 'User profile updated' },
    COUNTRY_SET: { type: 'COUNTRY_SET', description: 'User country set' }, // Added
    LANGUAGE_SET: { type: 'LANGUAGE_SET', description: 'User language set' }, // Added
    DIETARY_PREFERENCES_SET: { type: 'DIETARY_PREFERENCES_SET', description: 'User dietary preferences set' }, // Added
    DEFAULT_ADDRESS_SET: { type: 'DEFAULT_ADDRESS_SET', description: 'User default address set' }, // Added
    ACCESSIBILITY_UPDATED: { type: 'ACCESSIBILITY_UPDATED', description: 'User accessibility settings updated' }, // Added
    PRIVACY_UPDATED: { type: 'PRIVACY_UPDATED', description: 'User privacy settings updated' }, // Added
    NOTIFICATION_SENT: { type: 'NOTIFICATION_SENT', description: 'Socket notification sent' },
    TASK_ASSIGNED: { type: 'TASK_ASSIGNED', description: 'Task assigned to staff' },
    CONFIG_CHANGED: { type: 'CONFIG_CHANGED', description: 'Platform configuration changed' },
    ANALYTICS_UPDATED: { type: 'ANALYTICS_UPDATED', description: 'Analytics data updated' },
    PAYMENT_PROCESSED: { type: 'PAYMENT_PROCESSED', description: 'Payment processed via socket' },
    PARKING_UPDATED: { type: 'PARKING_UPDATED', description: 'Parking booking updated' },
    EVENT_UPDATED: { type: 'EVENT_UPDATED', description: 'Event updated via socket' },
    GROUP_CHAT_MESSAGE: { type: 'GROUP_CHAT_MESSAGE', description: 'Group chat message sent' },
    SOCIAL_POST_SHARED: { type: 'SOCIAL_POST_SHARED', description: 'Social post shared' },
    WALLET_CREATED: { type: 'WALLET_CREATED', description: 'Wallet created successfully' },
    TRANSACTION_SUCCESS: { type: 'TRANSACTION_SUCCESS', description: 'Transaction completed successfully' },
    BALANCE_CHECK: { type: 'BALANCE_CHECK', description: 'Wallet balance checked' },
    TRANSACTION_HISTORY_RETRIEVED: { type: 'TRANSACTION_HISTORY_RETRIEVED', description: 'Transaction history retrieved' },
    REWARD_CREDIT: { type: 'REWARD_CREDIT', description: 'Wallet credited for gamification reward' },
    POINTS_AWARDED: { type: 'POINTS_AWARDED', description: 'Gamification points awarded' },
    BADGE_AWARDED: { type: 'BADGE_AWARDED', description: 'Gamification badge awarded' },
    REWARD_REDEEMED: { type: 'REWARD_REDEEMED', description: 'Gamification reward redeemed' },
    LOCATION_UPDATED: { type: 'LOCATION_UPDATE', description: 'Entity location updated and broadcasted' }
  },
  SOCKET_SETTINGS: {
    HEARTBEAT_INTERVAL_SECONDS: 20,
    MAX_RECONNECT_ATTEMPTS: 10,
    RECONNECT_INTERVAL_SECONDS: 5,
    MAX_EVENT_PAYLOAD_SIZE_MB: 2,
    AUDIT_LOG_RETENTION_DAYS: 365,
    MAX_CONNECTIONS_PER_USER: 5
  },
  ERROR_CODES: {
    INVALID_EVENT: 'ERR_INVALID_SOCKET_EVENT',
    INVALID_ROOM: 'ERR_INVALID_SOCKET_ROOM',
    SOCKET_DISCONNECTED: 'ERR_DISCONNECTED',
    PAYLOAD_TOO_LARGE: 'ERR_PAYLOAD_TOO_LARGE',
    RATE_LIMIT_EXCEEDED: 'ERR_SOCKET_RATE_LIMIT_EXCEEDED'
  },
  SUCCESS_MESSAGES: {
    EVENT_EMITTED: 'EVENT_EMITTED',
    BROADCAST_SENT: 'BROADCAST_SENT'
  }
};