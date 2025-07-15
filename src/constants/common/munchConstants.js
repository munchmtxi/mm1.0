'use strict';

module.exports = {
  MUNCH_SETTINGS: {
    MAX_ACTIVE_ORDERS: 15,
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'],
    COUNTRY_CURRENCY_MAP: {
      US: 'USD', GB: 'GBP', EU: 'EUR', CA: 'CAD', AU: 'AUD', MW: 'MWK', TZ: 'TZS', KE: 'KES', MZ: 'MZN',
      ZA: 'ZAR', IN: 'INR', CM: 'XAF', GH: 'GHS', MX: 'MXN', ER: 'ERN'
    },
    SUPPORTED_COUNTRIES: ['US', 'GB', 'EU', 'CA', 'AU', 'MW', 'TZ', 'KE', 'MZ', 'ZA', 'IN', 'CM', 'GH', 'MX', 'ER'],
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: ['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'zu', 'xh', 'am', 'ti'],
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
    DEFAULT_TIMEZONE: 'UTC',
    SUPPORTED_MAP_PROVIDERS: {
      US: 'google_maps', GB: 'google_maps', EU: 'openstreetmap', CA: 'google_maps', AU: 'google_maps',
      MW: 'openstreetmap', TZ: 'openstreetmap', KE: 'openstreetmap', MZ: 'openstreetmap',
      ZA: 'openstreetmap', IN: 'google_maps', CM: 'openstreetmap', GH: 'openstreetmap',
      MX: 'google_maps', ER: 'openstreetmap'
    },
    SOCIAL_MEDIA_INTEGRATION: ['facebook', 'instagram', 'whatsapp', 'x', 'telegram'],
    WALLET_FEATURES: ['add_funds', 'transfer_funds', 'crypto_payments', 'auto_top_up', 'loyalty_rewards'],
    AUTO_TOP_UP_MIN: 5,
    AUTO_TOP_UP_MAX: 500
  },
  ORDER_CONSTANTS: {
    ORDER_TYPES: ['dine_in', 'takeaway', 'delivery', 'pre_order'],
    ORDER_STATUSES: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'],
    ORDER_SETTINGS: {
      MAX_ORDER_ITEMS: 100,
      MIN_ORDER_AMOUNT: 2,
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic'],
      CANCELLATION_WINDOW_MINUTES: 5,
      AI_RECOMMENDATIONS: ['personalized_menu', 'dietary_suggestions', 'trending_items'],
      SOCIAL_SHARING: ['share_order', 'post_review', 'invite_friends']
    }
  },
  GROUP_SETTINGS: {
    MAX_FRIENDS_PER_ORDER: 20,
    INVITE_STATUSES: ['invited', 'accepted', 'declined', 'removed'],
    INVITE_METHODS: ['app', 'sms', 'email', 'whatsapp', 'telegram'],
    BILL_SPLIT_TYPES: ['equal', 'custom', 'itemized', 'percentage'],
    MAX_SPLIT_PARTICIPANTS: 20,
    GROUP_CHAT: ['in_app', 'whatsapp_integration', 'real_time_updates'],
    SOCIAL_MEDIA_SHARING: ['post_group_order', 'share_event', 'tag_friends']
  },
  DELIVERY_CONSTANTS: {
    DELIVERY_STATUSES: ['requested', 'accepted', 'picked_up', 'in_delivery', 'delivered', 'cancelled', 'delayed'],
    DELIVERY_TYPES: ['standard', 'batch', 'express', 'scheduled'],
    DELIVERY_SETTINGS: {
      MAX_DELIVERY_RADIUS_KM: 25,
      MIN_DELIVERY_TIME_MINUTES: 10,
      MAX_DELIVERY_TIME_MINUTES: 120,
      BATCH_DELIVERY_LIMIT: 10,
      TIMELY_PICKUP_WINDOW_MINUTES: 3,
      AI_ROUTE_OPTIMIZATION: true,
      REAL_TIME_TRACKING: true
    },
    LOCATION_UPDATE_FREQUENCY_SECONDS: 5
  },
  SUBSCRIPTION_PROPERTIES: {
    SUBSCRIPTION_PLANS: [
      { name: 'Basic', benefits: ['free_delivery', 'priority_ordering', 'loyalty_points'], durationDays: 30, price: 'dynamic' },
      { name: 'Premium', benefits: ['free_delivery', 'priority_ordering', 'exclusive_discounts', 'early_access_events', 'dedicated_support'], durationDays: 30, price: 'dynamic' },
      { name: 'Elite', benefits: ['free_delivery', 'priority_ordering', 'exclusive_discounts', 'early_access_events', 'dedicated_support', 'crypto_rewards'], durationDays: 30, price: 'dynamic' }
    ],
    SUBSCRIPTION_STATUSES: ['active', 'paused', 'cancelled', 'expired'],
    MAX_ACTIVE_SUBSCRIPTIONS: 2
  },
  PROMOTION_TYPES: ['percentage', 'fixed_amount', 'buy_x_get_y', 'bundle', 'loyalty', 'flash_sale', 'referral', 'social_media'],
  SUPPORT_CONSTANTS: {
    ISSUE_TYPES: ['PAYMENT_ISSUE', 'SERVICE_QUALITY', 'CANCELLATION', 'DELIVERY_ISSUE', 'ORDER_ISSUE', 'ACCOUNT_ISSUE', 'SOCIAL_MEDIA_ISSUE'],
    TICKET_STATUSES: ['open', 'in_progress', 'escalated', 'resolved', 'closed'],
    RESOLUTION_ACTIONS: ['refund', 'replacement', 'discount', 'no_action', 'account_credit'],
    SUPPORT_CHANNELS: ['in_app_chat', 'email', 'phone', 'whatsapp', 'telegram'],
    AI_CHATBOT: true
  },
  ERROR_CODES: [
    'ORDER_NOT_FOUND', 'NO_DRIVER_ASSIGNED', 'ORDER_ALREADY_CANCELLED', 'CANNOT_CANCEL_ORDER', 'INVALID_DIETARY_FILTER',
    'SUBSCRIPTION_ALREADY_ACTIVE', 'INVALID_SUBSCRIPTION_PLAN', 'INVALID_FRIEND_INVITE', 'MAX_FRIENDS_EXCEEDED',
    'INVALID_BILL_SPLIT', 'FRIEND_NOT_FOUND', 'PAYMENT_FAILED', 'WALLET_INSUFFICIENT_FUNDS'
  ],
  SUCCESS_MESSAGES: [
    'Order placed', 'Order cancelled', 'Delivery tracked', 'Driver message sent', 'Subscription activated',
    'Gamification points awarded', 'Payment completed', 'Friend invited', 'Bill split processed', 'Social post shared'
  ],
  NOTIFICATION_TYPES: {
    ORDER_TRENDS_UPDATED: 'order_trends_updated',
    DELIVERY_PERFORMANCE_UPDATED: 'delivery_performance_updated',
    CUSTOMER_INSIGHTS_UPDATED: 'customer_insights_updated',
    GAMIFICATION_UPDATED: 'gamification_updated',
    DELIVERY_LOCATIONS_UPDATED: 'delivery_locations_updated',
    HIGH_CUSTOMER_ENGAGEMENT: 'high_customer_engagement',
    DELIVERY_ASSIGNED: 'delivery_assigned',
    DELIVERY_STATUS_UPDATED: 'delivery_status_updated',
    DRIVER_COMMUNICATION: 'driver_communication',
    DELIVERY_GAMIFICATION: 'delivery_gamification',
    RESTOCKING_ALERT: 'restocking_alert',
    ORDER_CONFIRMATION: 'order_confirmation',
    ORDER_STATUS_UPDATE: 'order_status_update',
    PAYMENT_CONFIRMATION: 'payment_confirmation',
    PROMOTION_CREATED: 'promotion_created',
    LOYALTY_UPDATED: 'loyalty_updated',
    REWARD_REDEMPTION: 'reward_redemption',
    INQUIRY_SUBMITTED: 'inquiry_submitted',
    TICKET_ASSIGNED: 'ticket_assigned',
    DISPUTE_RESOLVED: 'dispute_resolved',
    ORDER_POLICIES: 'order_policies',
    SOCIAL_MEDIA_POST: 'social_media_post',
    GROUP_CHAT_MESSAGE: 'group_chat_message'
  },
  AUDIT_TYPES: {
    TRACK_ORDER_TRENDS: 'track_order_trends',
    MONITOR_DELIVERY_PERFORMANCE: 'monitor_delivery_performance',
    AGGREGATE_CUSTOMER_INSIGHTS: 'aggregate_customer_insights',
    TRACK_GAMIFICATION: 'track_gamification',
    ANALYZE_DELIVERY_LOCATIONS: 'analyze_delivery_locations',
    ASSIGN_DELIVERY: 'assign_delivery',
    TRACK_DELIVERY_STATUS: 'track_delivery_status',
    COMMUNICATE_WITH_DRIVER: 'communicate_with_driver',
    LOG_DELIVERY_GAMIFICATION: 'log_delivery_gamification',
    TRACK_STOCK_LEVELS: 'track_stock_levels',
    UPDATE_INVENTORY: 'update_inventory',
    SEND_RESTOCKING_ALERTS: 'send_restocking_alerts',
    PROCESS_ORDER: 'process_order',
    APPLY_DIETARY_PREFERENCES: 'apply_dietary_preferences',
    UPDATE_ORDER_STATUS: 'update_order_status',
    PAY_ORDER_WITH_WALLET: 'pay_order_with_wallet',
    CREATE_PROMOTION: 'create_promotion',
    MANAGE_LOYALTY_PROGRAM: 'manage_loyalty_program',
    REDEEM_POINTS: 'redeem_points',
    HANDLE_ORDER_INQUIRY: 'handle_order_inquiry',
    RESOLVE_ORDER_DISPUTE: 'resolve_order_dispute',
    SHARE_ORDER_POLICIES: 'share_order_policies',
    SOCIAL_MEDIA_INTERACTION: 'social_media_interaction'
  },
  PERMISSIONS: {
    TRACK_ORDER_TRENDS: 'track_order_trends',
    MONITOR_DELIVERY_PERFORMANCE: 'monitor_delivery_performance',
    AGGREGATE_CUSTOMER_INSIGHTS: 'aggregate_customer_insights',
    TRACK_GAMIFICATION: 'track_gamification',
    ANALYZE_DELIVERY_LOCATIONS: 'analyze_delivery_locations',
    ASSIGN_DELIVERY: 'assign_delivery',
    TRACK_DELIVERY_STATUS: 'track_delivery_status',
    COMMUNICATE_WITH_DRIVER: 'communicate_with_driver',
    LOG_DELIVERY_GAMIFICATION: 'log_delivery_gamification',
    TRACK_STOCK_LEVELS: 'track_stock_levels',
    UPDATE_INVENTORY: 'update_inventory',
    SEND_RESTOCKING_ALERTS: 'send_restocking_alerts',
    PROCESS_ORDER: 'process_order',
    APPLY_DIETARY_PREFERENCES: 'apply_dietary_preferences',
    UPDATE_ORDER_STATUS: 'update_order_status',
    PAY_ORDER_WITH_WALLET: 'pay_order_with_wallet',
    CREATE_PROMOTION: 'create_promotion',
    MANAGE_LOYALTY_PROGRAM: 'manage_loyalty_program',
    REDEEM_POINTS: 'redeem_points',
    HANDLE_ORDER_INQUIRY: 'handle_order_inquiry',
    RESOLVE_ORDER_DISPUTE: 'resolve_order_dispute',
    SHARE_ORDER_POLICIES: 'share_order_policies',
    MANAGE_SOCIAL_MEDIA: 'manage_social_media'
  }
};