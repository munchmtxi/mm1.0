'use strict';

module.exports = {
  TIPPING_CONSTANTS: {
    TIPPABLE_ROLES: ['staff', 'merchant'],
    TIP_METHODS: ['percentage', 'fixed_amount', 'custom'],
    TIP_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    TIP_SETTINGS: {
      MIN_TIP_AMOUNT: 0.5,
      MAX_TIP_AMOUNT: 100,
      DEFAULT_TIP_PERCENTAGES: [10, 15, 20],
      MAX_TIPS_PER_BOOKING: 2, // One per role (staff, merchant)
      TIP_DISTRIBUTION: {
        staff: 'direct',   // Tip goes directly to assigned staff
        merchant: 'pooled' // Tip pooled for merchant staff
      },
      AUTO_TIP_SUGGESTION: true,          // AI-driven tip suggestions based on booking size/service
      TIP_CURRENCY: 'same_as_booking',    // Matches booking currency
      TRANSACTION_LIMIT_PER_DAY: 50
    }
  },
  TABLE_STATUSES: ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE'],
  IN_DINING_STATUSES: ['CONFIRMED', 'PREPARING', 'SERVED', 'CLOSED'],
  BOOKING_TYPES: ['TABLE', 'PRIVATE_ROOM', 'EVENT_SPACE'],
  CHECK_IN_METHODS: ['QR_CODE', 'MANUAL', 'NFC'],
  TABLE_MANAGEMENT: {
    MIN_TABLE_CAPACITY: 1,
    MAX_TABLE_CAPACITY: 30,
    LOCATION_TYPES: ['INDOOR', 'OUTDOOR', 'ROOFTOP', 'BALCONY', 'WINDOW', 'BAR', 'PATIO'],
    TABLE_TYPES: ['STANDARD', 'BOOTH', 'HIGH_TOP', 'BAR', 'LOUNGE', 'PRIVATE', 'COMMUNAL'],
    SEATING_PREFERENCES: [
      'NO_PREFERENCE', 'INDOOR', 'OUTDOOR', 'ROOFTOP', 'BALCONY', 'WINDOW', 'BOOTH',
      'HIGH_TOP', 'BAR', 'LOUNGE', 'PRIVATE', 'COMMUNAL'
    ]
  },
  BOOKING_POLICIES: {
    MIN_BOOKING_HOURS: 0.5,
    MAX_BOOKING_HOURS: 6,
    CANCELLATION_WINDOW_HOURS: 12,
    EXTENSION_LIMIT_MINUTES: 180,
    MIN_DEPOSIT_PERCENTAGE: 5
  },
  SUPPORT_SETTINGS: {
    ISSUE_TYPES: ['BOOKING', 'ORDER', 'PAYMENT', 'TABLE', 'EVENT'],
    TICKET_STATUSES: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CLOSED'],
    PRIORITIES: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    MAX_TICKET_DESCRIPTION_LENGTH: 2000,
    SUPPORT_CHANNELS: ['in_app_chat', 'email', 'phone', 'whatsapp', 'telegram'],
    AI_CHATBOT: true
  },
  STAFF_SETTINGS: {
    AVAILABILITY_STATUSES: ['AVAILABLE', 'UNAVAILABLE', 'ON_BREAK', 'TRAINING'],
    ROLES: ['WAITER', 'HOST', 'MANAGER', 'EVENT_COORDINATOR']
  },
  GROUP_SETTINGS: {
    MAX_FRIENDS_PER_BOOKING: 20,
    INVITE_STATUSES: ['PENDING', 'ACCEPTED', 'DECLINED', 'REMOVED'],
    INVITE_METHODS: ['APP', 'SMS', 'EMAIL', 'WHATSAPP', 'TELEGRAM'],
    BILL_SPLIT_TYPES: ['EQUAL', 'CUSTOM', 'ITEMIZED', 'PERCENTAGE'],
    MAX_SPLIT_PARTICIPANTS: 20,
    GROUP_CHAT: ['in_app', 'whatsapp_integration', 'real_time_updates']
  },
  ORDER_SETTINGS: {
    MAX_GROUP_SIZE: 30,
    MIN_PRE_ORDER_LEAD_TIME_MINUTES: 15,
    ALLOWED_DIETARY_FILTERS: ['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'NUT_FREE', 'DAIRY_FREE', 'HALAL', 'KOSHER', 'LOW_CARB', 'ORGANIC']
  },
  CART_SETTINGS: {
    MAX_ITEMS_PER_CART: 100,
    MIN_QUANTITY_PER_ITEM: 1,
    MAX_QUANTITY_PER_ITEM: 30
  },
  FEEDBACK_SETTINGS: {
    MIN_RATING: 1,
    MAX_RATING: 5,
    POSITIVE_RATING_THRESHOLD: 3,
    SOCIAL_SHARING: ['post_review', 'share_experience', 'tag_friends']
  },
  FINANCIAL_SETTINGS: {
    MIN_DEPOSIT_AMOUNT: 5,
    MAX_DEPOSIT_AMOUNT: 1000,
    DEPOSIT_TRANSACTION_TYPE: 'DEPOSIT',
    PAYMENT_TRANSACTION_TYPE: 'ORDER_PAYMENT',
    TRANSACTION_STATUSES: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    WALLET_FEATURES: ['add_funds', 'transfer_funds', 'crypto_payments', 'auto_top_up']
  },
  CUSTOMER_SETTINGS: {
    MAX_ACTIVE_BOOKINGS: 7,
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
      ER: ['Asmara', 'Keren', 'Massawa']
    },
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN']
  },
  DISCOUNT_TYPES: ['PERCENTAGE', 'FLAT', 'BOGO', 'SEASONAL', 'EARLY_BIRD', 'REFERRAL', 'SOCIAL_MEDIA'],
  MODIFIER_TYPES: [
    'SIZE', 'SPICINESS', 'EXTRAS', 'TOPPINGS', 'SAUCES', 'COOKING_PREFERENCE', 'TEMPERATURE', 'SIDE_CHOICES', 'DRESSINGS'
  ],
  TIME_SLOT_SETTINGS: {
    DAYS_OF_WEEK: {
      SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
    },
    SLOT_TYPES: ['REGULAR', 'SPECIAL', 'HOLIDAY', 'EVENT']
  },
  ANALYTICS_PERIODS: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
  BOOKING_STATUSES: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  ORDER_STATUSES: ['PENDING', 'PREPARING', 'COMPLETED', 'CANCELLED', 'REFUNDED'],
  PAYMENT_STATUSES: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
  NOTIFICATION_TYPES: {
    BOOKING_CONFIRMATION: 'BOOKING_CONFIRMATION',
    TABLE_ASSIGNED: 'TABLE_ASSIGNED',
    TABLE_ADJUSTED: 'TABLE_ADJUSTED',
    TABLE_AVAILABILITY_UPDATED: 'TABLE_AVAILABILITY_UPDATED',
    PRE_ORDER_CONFIRMATION: 'PRE_ORDER_CONFIRMATION',
    PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
    REFUND_PROCESSED: 'REFUND_PROCESSED',
    SUPPORT_TICKET_CREATED: 'SUPPORT_TICKET_CREATED',
    SUPPORT_TICKET_RESOLVED: 'SUPPORT_TICKET_RESOLVED',
    BILL_SPLIT_REQUEST: 'BILL_SPLIT_REQUEST',
    FRIEND_INVITED: 'FRIEND_INVITED',
    GROUP_CHAT_MESSAGE: 'GROUP_CHAT_MESSAGE',
    SOCIAL_MEDIA_POST: 'SOCIAL_MEDIA_POST'
  },
  AUDIT_TYPES: {
    BOOKING_CREATED: 'BOOKING_CREATED',
    BOOKING_UPDATED: 'BOOKING_UPDATED',
    BOOKING_CANCELLED: 'BOOKING_CANCELLED',
    TABLE_ASSIGNED: 'TABLE_ASSIGNED',
    TABLE_ADJUSTED: 'TABLE_ADJUSTED',
    TABLE_AVAILABILITY_UPDATED: 'TABLE_AVAILABILITY_UPDATED',
    PRE_ORDER_CREATED: 'PRE_ORDER_CREATED',
    PAYMENT_PROCESSED: 'PAYMENT_PROCESSED',
    REFUND_PROCESSED: 'REFUND_PROCESSED',
    BILL_SPLIT_PROCESSED: 'BILL_SPLIT_PROCESSED',
    FRIEND_INVITED: 'FRIEND_INVITED',
    SOCIAL_MEDIA_INTERACTION: 'SOCIAL_MEDIA_INTERACTION'
  },
  ERROR_TYPES: [
    'INVALID_INPUT', 'INVALID_PERIOD', 'SYSTEM_ERROR', 'PERMISSION_DENIED', 'INVALID_BOOKING_DETAILS',
    'INVALID_PARTY_SIZE', 'TABLE_NOT_AVAILABLE', 'BOOKING_NOT_FOUND', 'BOOKING_CREATION_FAILED',
    'BOOKING_UPDATE_FAILED', 'BOOKING_CANCELLATION_FAILED', 'CHECK_IN_FAILED', 'MAX_BOOKINGS_EXCEEDED',
    'CANCELLATION_WINDOW_EXPIRED', 'INVALID_CUSTOMER_ID', 'INVALID_FEEDBACK_RATING', 'INVALID_FRIEND_INVITE',
    'MAX_FRIENDS_EXCEEDED', 'INVALID_BILL_SPLIT', 'FRIEND_NOT_FOUND', 'FEEDBACK_SUBMISSION_FAILED',
    'PARTY_MEMBER_ADDITION_FAILED', 'TABLE_SEARCH_FAILED', 'PAYMENT_PROCESSING_FAILED', 'REFUND_PROCESSING_FAILED',
    'INVALID_MODIFIER', 'WALLET_INSUFFICIENT_FUNDS'
  ],
  SUCCESS_MESSAGES: [
    'BOOKING_CREATED', 'BOOKING_UPDATED', 'BOOKING_CANCELLED', 'CHECK_IN_CONFIRMED', 'BOOKING_HISTORY_RETRIEVED',
    'FEEDBACK_SUBMITTED', 'PARTY_MEMBER_ADDED', 'TABLES_RETRIEVED', 'PAYMENT_PROCESSED', 'REFUND_PROCESSED',
    'BILL_SPLIT_PROCESSED', 'ORDER_PROCESSED', 'ORDER_STATUS_UPDATED', 'PAYMENT_COMPLETED', 'SOCIAL_POST_SHARED'
  ]
};
