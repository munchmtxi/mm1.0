/**
 * adminServiceConstants.js
 *
 * Defines constants for admin interactions with platform services (mtables, mtxi, munch, mevents),
 * engagement features (gamification, notifications, support), and system-level operations
 * (compliance, security, analytics, accessibility, training). Supports merchant business types
 * (restaurant, dark kitchen, butcher, grocery, caterer, cafe, bakery) and global operations
 * (Malawi, Tanzania, Kenya, Mozambique, Nigeria, South Africa, India, Brazil). Aligns with
 * driverConstants.js, staffConstants.js, customerConstants.js, and merchantConstants.js.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Service Access: mtables (Table Bookings)
  MTABLES_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['restaurant', 'cafe', 'caterer'],
    BOOKING_STATUSES: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
    TABLE_STATUSES: ['available', 'occupied', 'reserved', 'maintenance'],
    CHECK_IN_METHODS: ['qr_code', 'manual', 'auto'],
    BOOKING_POLICIES: {
      MIN_BOOKING_HOURS: 1,
      MAX_BOOKING_HOURS: 4,
      CANCELLATION_WINDOW_HOURS: 24,
      EXTENSION_LIMIT_MINUTES: 120,
      MIN_DEPOSIT_PERCENTAGE: 10,
      MAX_DEPOSIT_PERCENTAGE: 50,
      NO_SHOW_PENALTY_PERCENTAGE: 10
    },
    PRE_ORDER_SETTINGS: {
      MAX_GROUP_SIZE: 20,
      MIN_PRE_ORDER_LEAD_TIME_MINUTES: 30,
      MAX_PRE_ORDER_ITEMS: 50,
      ALLOWED_DIETARY_FILTERS: [
        'vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal'
      ]
    },
    TABLE_MANAGEMENT: {
      MIN_TABLE_CAPACITY: 1,
      MAX_TABLE_CAPACITY: 20,
      DEFAULT_TURNOVER_MINUTES: 90,
      MAX_TABLES_PER_MERCHANT: 100,
      WAITLIST_LIMIT: 50
    },
    ANALYTICS_METRICS: [
      'booking_rate',
      'no_show_rate',
      'turnover_time',
      'pre_order_uptake'
    ]
  },

  // Service Access: mtxi (Ride-Sharing)
  MTXI_CONSTANTS: {
    RIDE_STATUSES: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'],
    RIDE_TYPES: ['standard', 'shared', 'premium'],
    RIDE_SETTINGS: {
      MAX_PASSENGERS: 4,
      MIN_RIDE_DISTANCE_KM: 1,
      MAX_RIDE_DISTANCE_KM: 50,
      CANCELLATION_WINDOW_MINUTES: 5,
      TIMELY_PICKUP_WINDOW_MINUTES: 5,
      MAX_WAIT_TIME_MINUTES: 10
    },
    SHARED_RIDE_SETTINGS: {
      MAX_PASSENGERS_PER_SHARED_RIDE: 4,
      MAX_STOPS_PER_SHARED_RIDE: 3,
      MAX_DEVIATION_KM: 5
    },
    DRIVER_ASSIGNMENT: {
      MAX_ASSIGNMENT_RADIUS_KM: 10,
      MAX_ASSIGNMENT_ATTEMPTS: 3,
      ASSIGNMENT_TIMEOUT_SECONDS: 30
    },
    ANALYTICS_METRICS: [
      'ride_completion_rate',
      'driver_utilization',
      'cancellation_rate',
      'shared_ride_uptake'
    ]
  },

  // Service Access: munch (Food Orders)
  MUNCH_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: [
      'restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery'
    ],
    ORDER_TYPES: ['dine_in', 'takeaway', 'delivery'],
    ORDER_STATUSES: [
      'pending', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled'
    ],
    DELIVERY_STATUSES: [
      'requested', 'accepted', 'picked_up', 'in_delivery', 'delivered', 'cancelled'
    ],
    ORDER_SETTINGS: {
      ALLOWED_DIETARY_FILTERS: [
        'vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal'
      ],
      MAX_ORDER_ITEMS: 50,
      MIN_ORDER_AMOUNT: 5, // In default currency
      MAX_ORDER_AMOUNT: 1000,
      CANCELLATION_WINDOW_MINUTES: 10
    },
    DELIVERY_SETTINGS: {
      MAX_DELIVERY_RADIUS_KM: 15,
      MIN_DELIVERY_TIME_MINUTES: 15,
      MAX_DELIVERY_TIME_MINUTES: 90,
      BATCH_DELIVERY_LIMIT: 5,
      MAX_DELIVERY_ATTEMPTS: 2
    },
    INVENTORY_SETTINGS: {
      LOW_STOCK_THRESHOLD_PERCENTAGE: 20,
      RESTOCK_ALERT_FREQUENCY_HOURS: 24,
      MAX_INVENTORY_ITEMS: 1000,
      BUTCHER_SPECIFIC: {
        MEAT_TYPES: ['beef', 'chicken', 'lamb', 'pork', 'halal']
      },
      GROCERY_SPECIFIC: {
        CATEGORY_TYPES: ['produce', 'dairy', 'meat', 'packaged', 'household']
      }
    },
    MENU_SETTINGS: {
      MAX_MENU_ITEMS: 200,
      MAX_CATEGORIES: 20,
      ALLOWED_MEDIA_TYPES: ['jpg', 'png', 'jpeg'],
      MAX_MEDIA_SIZE_MB: 5
    },
    ANALYTICS_METRICS: [
      'order_completion_rate',
      'delivery_time',
      'inventory_turnover',
      'dietary_filter_usage'
    ]
  },

  // Service Access: mevents (Events)
  MEVENTS_CONSTANTS: {
    EVENT_STATUSES: ['draft', 'published', 'in_progress', 'completed', 'cancelled'],
    EVENT_TYPES: ['private', 'public', 'corporate'],
    EVENT_SETTINGS: {
      MAX_PARTICIPANTS: 100,
      MIN_LEAD_TIME_HOURS: 24,
      MAX_SERVICES_PER_EVENT: 3, // mtables, munch, mtxi
      CANCELLATION_WINDOW_HOURS: 48
    },
    GROUP_BOOKING_SETTINGS: {
      MAX_GROUP_SIZE: 50,
      MIN_DEPOSIT_PERCENTAGE: 20,
      MAX_PAYMENT_SPLITS: 10
    },
    ANALYTICS_METRICS: [
      'event_completion_rate',
      'participant_engagement',
      'group_booking_rate',
      'service_usage'
    ]
  },

  // Gamification Metrics
  GAMIFICATION_CONSTANTS: {
    ADMIN_ACTIONS: {
      USER_ONBOARDING: { action: 'user_onboarding', points: 50, name: 'Onboarding Facilitator', roles: ['super_admin', 'regional_admin'] },
      DISPUTE_RESOLUTION: { action: 'dispute_resolution', points: 30, name: 'Dispute Resolver', roles: ['super_admin', 'support_admin'] },
      COMPLIANCE_AUDIT: { action: 'compliance_audit', points: 100, name: 'Compliance Guardian', roles: ['super_admin', 'compliance_admin'] },
      FINANCIAL_REPORT: { action: 'financial_report', points: 50, name: 'Financial Analyst', roles: ['super_admin', 'financial_admin'] },
      SECURITY_ENHANCEMENT: { action: 'security_enhancement', points: 30, name: 'Security Pro', roles: ['super_admin', 'security_admin'] },
      ANALYTICS_REVIEW: { action: 'analytics_review', points: 20, name: 'Data Explorer', roles: ['super_admin', 'analytics_admin'] },
      PLATFORM_CONFIG_UPDATE: { action: 'platform_config_update', points: 50, name: 'Platform Configurator', roles: ['super_admin'] },
      BACKUP_EXECUTION: { action: 'backup_execution', points: 30, name: 'Backup Specialist', roles: ['super_admin'] },
      LOG_ANALYSIS: { action: 'log_analysis', points: 20, name: 'Log Investigator', roles: ['super_admin', 'security_admin'] },
      PROFILE_UPDATE: { action: 'profile_update', points: 0, name: 'Profile Updater', roles: ['super_admin', 'regional_admin'] },
      SET_PERMISSIONS: { action: 'set_permissions', points: 0, name: 'Permissions Manager', roles: ['super_admin'] },
      SUSPEND_ACCOUNT: { action: 'suspend_account', points: 0, name: 'Account Suspender', roles: ['super_admin', 'regional_admin'] },
      DELETE_ACCOUNT: { action: 'delete_account', points: 0, name: 'Account Deleter', roles: ['super_admin'] },
      CONFIGURE_LOCALIZATION: { action: 'configure_localization', points: 0, name: 'Localization Configurator', roles: ['super_admin', 'regional_admin'] }
    },
    CUSTOMER_ACTIONS: {
      CHECK_IN: { action: 'check_in', points: 20, name: 'Check-In Challenge', walletCredit: 0.50 },
      PRE_ORDER: { action: 'pre_order', points: 50, name: 'Pre-Order Quest', walletCredit: 1.00 },
      ORDER_FREQUENCY: { action: 'order_frequency', points: 30, name: 'Order Prep Journey', walletCredit: 0.75 },
      WALLET_USAGE: { action: 'wallet_usage', points: 15, name: 'Digital Wallet Bonus', walletCredit: 0.40 },
      LOYALTY_TIER: { action: 'loyalty_tier', points: 500, name: 'Loyalty Tier Climber', walletCredit: 10.00 },
      REFERRAL: { action: 'referral', points: 100, name: 'Referral Champion', walletCredit: 2.00 },
      CROSS_SERVICE_USAGE: { action: 'cross_service_usage', points: 50, name: 'Cross-Service Star', walletCredit: 1.00 },
      SECURITY_FEATURES: { action: 'security_features', points: 30, name: 'Security Pro', walletCredit: 0.75 }
    },
    STAFF_ACTIONS: {
      CHECK_IN_LOG: { action: 'check_in_log', points: 10, name: 'Check-In Logger', walletCredit: 0.40, roles: ['front_of_house'] },
      TIMELY_PREP: { action: 'timely_prep', points: 15, name: 'Speedy Prep Star', walletCredit: 0.50, roles: ['kitchen', 'butcher', 'barista'] },
      INVENTORY_UPDATE: { action: 'inventory_update', points: 10, name: 'Inventory Keeper', walletCredit: 0.30, roles: ['back_of_house', 'butcher', 'stock_clerk'] },
      TASK_COMPLETION: { action: 'task_completion', points: 10, name: 'Task Master', walletCredit: 0.30, roles: ['front_of_house', 'back_of_house', 'kitchen', 'butcher', 'barista', 'stock_clerk', 'cashier'] },
      MEAT_PREPARATION: { action: 'meat_preparation', points: 15, name: 'Master Butcher', walletCredit: 0.50, roles: ['butcher'] },
      COFFEE_PREPARATION: { action: 'coffee_preparation', points: 10, name: 'Barista Star', walletCredit: 0.30, roles: ['barista'] },
      SHELF_STOCKING: { action: 'shelf_stocking', points: 10, name: 'Stocking Pro', walletCredit: 0.30, roles: ['stock_clerk'] },
      CHECKOUT_PROCESSING: { action: 'checkout_processing', points: 10, name: 'Checkout Champion', walletCredit: 0.30, roles: ['cashier'] }
    },
    DRIVER_ACTIONS: {
      DELIVERY_COMPLETION: { action: 'delivery_completion', points: 25, name: 'Delivery Completion Quest', walletCredit: 0.60 },
      BATCH_DELIVERY: { action: 'batch_delivery', points: 15, name: 'Batch Delivery Boost', walletCredit: 0.40 },
      TIMELY_PICKUP: { action: 'timely_pickup', points: 15, name: 'Timely Pickup Reward', walletCredit: 0.40 },
      CROSS_SERVICE_STAR: { action: 'cross_service_star', points: 50, name: 'Cross-Service Star', walletCredit: 1.00 }
    },
    POINT_EXPIRY_DAYS: 365,
    MAX_POINTS_PER_DAY: 1000,
    LEADERBOARD_SETTINGS: {
      UPDATE_FREQUENCY_HOURS: 24,
      TOP_RANK_LIMIT: 100,
      CATEGORIES: ['admin', 'customer', 'staff', 'driver']
    },
    LOYALTY_TIERS: {
      BRONZE: { name: 'Bronze', minPoints: 0, discount: 5, cashback: 2 },
      SILVER: { name: 'Silver', minPoints: 500, discount: 10, cashback: 5 },
      GOLD: { name: 'Gold', minPoints: 1000, discount: 15, cashback: 10 }
    },
    REWARD_TYPES: ['wallet_credit', 'discount', 'free_service'],
    REDEMPTION_SETTINGS: {
      MIN_REDEMPTION_POINTS: 100,
      MAX_REDEMPTION_POINTS: 5000,
      REDEMPTION_COOLDOWN_DAYS: 7
    }
  },

  // Notifications
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'user_update',
      'financial_update',
      'compliance_alert',
      'support_ticket',
      'platform_announcement',
      'security_alert',
      'gamification_update',
      'analytics_report',
      'backup_status',
      'system_health'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'in_app'],
    MAX_NOTIFICATIONS_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_INTERVAL_SECONDS: 60,
    PRIORITY_LEVELS: ['low', 'medium', 'high'],
    LOCALIZATION_FORMATS: {
      TIME_FORMAT: ['12h', '24h'],
      DATE_FORMAT: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
    },
    ANALYTICS_METRICS: [
      'delivery_rate',
      'open_rate',
      'engagement_rate'
    ]
  },

  // Support and Dispute Resolution
  SUPPORT_CONSTANTS: {
    ISSUE_TYPES: [
      'booking', 'order', 'ride', 'delivery', 'payment', 'wallet',
      'compliance', 'security', 'platform', 'other'
    ],
    DISPUTE_STATUSES: ['open', 'in_progress', 'resolved', 'escalated', 'closed'],
    RESOLUTION_TYPES: [
      'refund', 'compensation', 'replacement', 'apology',
      'user_suspension', 'warning'
    ],
    SUPPORT_RESPONSE_TIME_HOURS: {
      STANDARD: 24,
      PRIORITY: 6,
      URGENT: 1
    },
    TICKET_PRIORITIES: ['low', 'medium', 'high', 'critical'],
    ESCALATION_LEVELS: ['tier_1', 'tier_2', 'tier_3'],
    ANALYTICS_METRICS: [
      'ticket_resolution_time',
      'escalation_rate',
      'customer_satisfaction'
    ]
  },

  // Compliance and Certifications
  COMPLIANCE_CONSTANTS: {
    REGULATORY_REQUIREMENTS: [
      'food_safety', 'health_permit', 'business_license', 'drivers_license',
      'vehicle_insurance', 'financial_compliance', 'halal_certification',
      'tax_registration'
    ],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_FREQUENCY_DAYS: 180,
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_TYPES: ['financial', 'operational', 'security', 'compliance'],
    COMPLIANCE_REPORT_FORMATS: ['pdf', 'csv', 'json'],
    ANALYTICS_METRICS: [
      'compliance_rate',
      'audit_completion',
      'certification_renewal'
    ]
  },

  // Security
  SECURITY_CONSTANTS: {
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    TOKEN_EXPIRY_MINUTES: 60,
    REFRESH_TOKEN_EXPIRY_DAYS: 7,
    PERMISSION_LEVELS: ['read', 'write', 'delete', 'admin', 'restricted'],
    MFA_METHODS: ['sms', 'email', 'auth_app', 'biometric'],
    TOKENIZATION_PROVIDER: 'stripe',
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30,
    AUDIT_LOG_RETENTION_DAYS: 180,
    SECURITY_INCIDENT_TYPES: [
      'unauthorized_access', 'data_breach', 'fraud_attempt', 'system_down'
    ],
    PASSWORD_POLICY: {
      MIN_LENGTH: 12,
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBERS: true,
      REQUIRE_SPECIAL_CHARS: true,
      MAX_AGE_DAYS: 90
    },
    API_SECURITY: {
      RATE_LIMIT_REQUESTS_PER_MINUTE: 100,
      CORS_ALLOWED_ORIGINS: ['*.platform.com', '*.admin.platform.com']
    },
    ANALYTICS_METRICS: [
      'security_incident_rate',
      'mfa_adoption',
      'login_failure_rate'
    ],
    TRANSACTION_VERIFICATION_METHODS: ['otp', 'biometric', 'pin']
  },

  // Analytics
  ANALYTICS_CONSTANTS: {
    METRICS: [
      'user_activity', 'financial_performance', 'gamification_engagement',
      'compliance_status', 'support_ticket_resolution', 'platform_health',
      'cross_vertical_usage', 'error_rate', 'api_performance', 'user_retention'
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json'],
    DATA_RETENTION_DAYS: 365,
    PERFORMANCE_THRESHOLDS: {
      SUPPORT_RESPONSE_TIME_HOURS: 24,
      FINANCIAL_REPORT_GENERATION_MINUTES: 5,
      AUDIT_COMPLETION_DAYS: 7,
      API_RESPONSE_TIME_MS: 500,
      ERROR_RATE_PERCENTAGE: 1
    },
    DASHBOARD_TYPES: ['executive', 'operational', 'financial', 'compliance', 'support'],
    EXPORT_LIMITS: {
      MAX_ROWS_CSV: 100000,
      MAX_PAGES_PDF: 50
    }
  },

  // Cross-Vertical Integration
  CROSS_VERTICAL_CONSTANTS: {
    SERVICES: ['mtables', 'munch', 'mtxi', 'mevents'],
    LOYALTY_UNIFICATION: {
      POINT_CONVERSION_RATE: 1, // 1 point in mtables = 1 point in others
      CROSS_SERVICE_BONUS_POINTS: 50
    },
    UI_CONSISTENCY: {
      THEME: 'default',
      COLOR_SCHEME: 'neutral',
      FONT_FAMILY: 'Roboto'
    },
    ANALYTICS_CATEGORIES: [
      'user_engagement', 'financial_performance', 'gamification_impact',
      'cross_service_usage', 'service_adoption'
    ],
    INTEGRATION_POINTS: ['wallet', 'gamification', 'analytics', 'notifications'],
    ANALYTICS_METRICS: [
      'cross_service_usage_rate',
      'loyalty_unification_impact',
      'service_adoption_rate'
    ]
  },

  // Operational Resilience
  OPERATIONAL_CONSTANTS: {
    OFFLINE_CACHE_LIMIT_MB: 100,
    SYNC_INTERVAL_MINUTES: 5,
    WEBSOCKET_HEARTBEAT_SECONDS: 30,
    MAX_OFFLINE_TRANSACTIONS: 100,
    FAILOVER_MODES: ['read_only', 'limited_write', 'full_offline'],
    ERROR_RECOVERY: {
      MAX_RETRY_ATTEMPTS: 3,
      RETRY_BACKOFF_SECONDS: 10
    },
    CACHE_SETTINGS: {
      MAX_CACHE_AGE_HOURS: 24,
      CACHE_INVALIDATION_EVENTS: ['user_update', 'order_update', 'ride_update']
    },
    ANALYTICS_METRICS: [
      'offline_usage_rate',
      'sync_success_rate',
      'failover_events'
    ]
  },

  // Accessibility and Inclusivity
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_ACCESSIBILITY_FEATURES: [
      'screen_reader', 'adjustable_fonts', 'high_contrast',
      'voice_commands', 'keyboard_navigation'
    ],
    FONT_SIZE_RANGE: { min: 12, max: 24 },
    ALLOWED_DIETARY_FILTERS: [
      'vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal'
    ],
    COLOR_CONTRAST_RATIO: 4.5, // WCAG 2.1 compliance
    ANALYTICS_METRICS: [
      'accessibility_feature_usage',
      'dietary_filter_usage'
    ]
  },

  // Training and Onboarding
  TRAINING_CONSTANTS: {
    TRAINING_MODULES: [
      'platform_overview', 'user_management', 'financial_operations',
      'compliance_audits', 'support_operations', 'security_protocols',
      'analytics_reporting'
    ],
    CERTIFICATION_STATUSES: ['pending', 'completed', 'expired'],
    CERTIFICATION_EXPIRY_DAYS: 365,
    TRAINING_FORMATS: ['video', 'document', 'interactive'],
    ANALYTICS_METRICS: [
      'training_completion_rate',
      'certification_renewal'
    ]
  },

  // Error Codes
  ERROR_CODES: {
    INVALID_BOOKING: 'ERR_INVALID_BOOKING',
    INVALID_RIDE: 'ERR_INVALID_RIDE',
    INVALID_ORDER: 'ERR_INVALID_ORDER',
    SUPPORT_TICKET_FAILED: 'ERR_SUPPORT_TICKET_FAILED',
    NOTIFICATION_DELIVERY_FAILED: 'ERR_NOTIFICATION_DELIVERY_FAILED',
    COMPLIANCE_VIOLATION: 'ERR_COMPLIANCE_VIOLATION',
    ANALYTICS_GENERATION_FAILED: 'ERR_ANALYTICS_GENERATION_FAILED',
    OFFLINE_MODE_UNAVAILABLE: 'ERR_OFFLINE_MODE_UNAVAILABLE',
    BACKUP_RESTORE_FAILED: 'ERR_BACKUP_RESTORE_FAILED',
    SECURITY_INCIDENT: 'ERR_SECURITY_INCIDENT',
    TRAINING_MODULE_NOT_FOUND: 'ERR_TRAINING_MODULE_NOT_FOUND',
    AUDIT_LOG_ACCESS_DENIED: 'ERR_AUDIT_LOG_ACCESS_DENIED'
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    BOOKING_UPDATED: 'Booking updated successfully',
    RIDE_UPDATED: 'Ride updated successfully',
    ORDER_UPDATED: 'Order updated successfully',
    SUPPORT_TICKET_RESOLVED: 'Support ticket resolved successfully',
    GAMIFICATION_POINTS_AWARDED: 'Gamification points awarded successfully',
    NOTIFICATION_SENT: 'Notification sent successfully',
    COMPLIANCE_AUDIT_COMPLETED: 'Compliance audit completed successfully',
    ANALYTICS_REPORT_EXPORTED: 'Analytics report exported successfully',
    BACKUP_COMPLETED: 'Backup completed successfully',
    SECURITY_ENHANCEMENT_APPLIED: 'Security enhancement applied successfully',
    TRAINING_COMPLETED: 'Training completed successfully'
  }
};