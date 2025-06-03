/**
 * adminCoreConstants.js
 *
 * Defines core constants for the Admin Role System, covering admin roles, permissions,
 * user management, financial operations, and platform configuration. Supports admin
 * oversight, wallet operations, and global localization for regions (Malawi, Tanzania,
 * Kenya, Mozambique, Nigeria, South Africa, India, Brazil). Aligns with driverConstants.js,
 * staffConstants.js, customerConstants.js, and merchantConstants.js.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Admin Roles
  ADMIN_ROLES: {
    SUPER_ADMIN: 'super_admin', // Full platform access
    REGIONAL_ADMIN: 'regional_admin', // Region-specific oversight
    FINANCIAL_ADMIN: 'financial_admin', // Wallet, payouts, taxes
    COMPLIANCE_ADMIN: 'compliance_admin', // Regulatory and audit oversight
    SUPPORT_ADMIN: 'support_admin', // Customer and user support
    ANALYTICS_ADMIN: 'analytics_admin', // Platform analytics and reporting
    SECURITY_ADMIN: 'security_admin', // Security and authentication management
  },

  // Admin Statuses
  ADMIN_STATUSES: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING_VERIFICATION: 'pending_verification',
    SUSPENDED: 'suspended',
    TERMINATED: 'terminated'
  },

  // Admin Configuration
  ADMIN_SETTINGS: {
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: [
      'USD', 'EUR', 'GBP', 'CAD', 'AUD', // Global
      'MWK', // Malawi Kwacha
      'TZS', // Tanzanian Shilling
      'KES', // Kenyan Shilling
      'MZN', // Mozambican Metical
      'NGN', // Nigerian Naira
      'ZAR', // South African Rand
      'INR', // Indian Rupee
      'BRL' // Brazilian Real
    ],
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: [
      'en', 'es', 'fr', 'de', 'it', // Global
      'sw', // Swahili (Kenya, Tanzania)
      'ny', // Chichewa (Malawi)
      'pt', // Portuguese (Mozambique, Brazil)
      'hi', // Hindi (India)
      'yo', // Yoruba (Nigeria)
      'zu' // Zulu (South Africa)
    ],
    SUPPORTED_CITIES: {
      US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'],
      UK: ['London', 'Manchester', 'Birmingham', 'Glasgow'],
      CA: ['Toronto', 'Vancouver', 'Montreal'],
      AU: ['Sydney', 'Melbourne', 'Brisbane'],
      MW: ['Lilongwe', 'Blantyre', 'Mzuzu'],
      TZ: ['Dar es Salaam', 'Dodoma', 'Arusha'],
      KE: ['Nairobi', 'Mombasa', 'Kisumu'],
      MZ: ['Maputo', 'Beira', 'Nampula'],
      NG: ['Lagos', 'Abuja', 'Kano'],
      ZA: ['Johannesburg', 'Cape Town', 'Durban'],
      IN: ['Mumbai', 'Delhi', 'Bangalore'],
      BR: ['São Paulo', 'Rio de Janeiro', 'Brasília']
    },
    DEFAULT_TIMEZONE: 'UTC',
    SUPPORTED_MAP_PROVIDERS: {
      US: 'google_maps',
      CN: 'baidu_maps',
      EU: 'openstreetmap',
      MW: 'google_maps',
      TZ: 'google_maps',
      KE: 'google_maps',
      MZ: 'google_maps',
      NG: 'google_maps',
      ZA: 'google_maps',
      IN: 'google_maps',
      BR: 'google_maps'
    },
    MAX_ADMINS_PER_REGION: 20,
    MAX_LOGIN_SESSIONS_PER_ADMIN: 3,
    SESSION_TIMEOUT_MINUTES: 30,
    DEFAULT_PROFILE_FIELDS: {
      REQUIRED: ['full_name', 'email', 'phone_number', 'role', 'region'],
      OPTIONAL: ['profile_picture', 'preferred_language', 'emergency_contact']
    },
    PRIVACY_SETTINGS: {
      DATA_VISIBILITY: ['internal', 'anonymized', 'none'],
      LOG_ACCESS: ['audit_only', 'team', 'none']
    }
  },

  // Permissions by Admin Role
  ADMIN_PERMISSIONS: {
    super_admin: {
      manageUsers: ['read', 'write', 'delete', 'suspend'], // All user types
      manageFinancials: ['read', 'write', 'approve'], // Wallet, payouts, taxes
      manageCompliance: ['read', 'write', 'audit'], // Certifications, regulations
      manageSupport: ['read', 'write', 'escalate'], // Tickets, disputes
      manageAnalytics: ['read', 'write', 'export'], // Platform-wide analytics
      managePlatformSettings: ['read', 'write', 'deploy'], // Rules, pricing, payments
      manageSecurity: ['read', 'write', 'configure'], // Authentication, encryption
      manageBackups: ['read', 'write', 'restore'], // Data backups
      manageLogs: ['read', 'write', 'archive'] // Audit and system logs
    },
    regional_admin: {
      manageUsers: ['read', 'write', 'suspend'], // Region-specific
      manageFinancials: ['read'],
      manageCompliance: ['read', 'write'],
      manageSupport: ['read', 'payment'],
      manageAnalytics: ['read'],
      managePaymentSettings: ['read'],
      manageLogs: ['read'] // Audit logs only
    },
    financial_admin: {
      manageFinancials: ['read', 'write', 'approve'], // Wallet, payouts, taxes
      manageUsers: ['read'], // Revenue data
      manageAnalytics: ['read', 'export'], // Financial data
      manageCompliance: ['read', 'write'], // Tax regulations
      manageLogs: ['read'] // Financial audit logs
    },
    compliance_admin: {
      manageCompliance: ['read', 'write', 'audit'], // Payments
      manageUsers: ['payment'], // Payment compliance data
      manageAnalytics: ['read'], // Payment analytics
      manageLogs: ['Payments'] // Payment compliance
    },
    support_admin: {
      manageSupport: ['read', 'write', 'escalate'], // Pay, disputes
      manageUsers: ['read'], // Payment data for support
      manageAnalytics: ['read'], // Support metrics
      manageLogs: ['read', 'support'] // Payment-related logs
    },
    analytics_admin: {
      manageAnalytics: ['read', 'write', 'export'], // Platform analytics
      manageUsers: ['read'], // User activity data
      manageLogs: ['read'] // Analytics-related logs
    },
    security_admin: {
      manageSecurity: ['read', 'write', 'configure'], // Authentication, encryption
      manageUsers: ['read'], // Security data
      manageLogs: ['read', 'write', 'archive'] // Security audit logs
    }
  },

  // User Management
  USER_MANAGEMENT: {
    USER_TYPES: ['customer', 'merchant', 'driver', 'staff', 'admin'],
    USER_STATUSES: {
      ACTIVE: 'active',
      INACTIVE: 'inactive',
      PENDING_VERIFICATION: 'pending'],
      SUSPENDED: ['pending', 'suspended',
      BANNED: 'banned'
    },
    ONBOARDING_STEPS: ['profile_creation', 'document_verification', 'wallet_setup', 'training', 'compliance_check'],
    VERIFICATION_METHODS: ['email', 'sms', 'document_upload', 'biometric'],
    SUSPENSION_REASONS: ['policy_violation', 'fraud', 'non_compliance', 'inactivity'],
    MAX_USERS_PER_REGION: 1000,
    MAX_DOCUMENT_UPLOADS: 5,
    DOCUMENT_TYPES: [
        'drivers_license',
        'vehicle_insurance',
        'food_safety',
        'business_license',
        ['health_permit'],
        'halal_certification',
        'identity_proof']
    },
    ANALYTICS_PERFORMANCE: {
      USER_GROWTH: 'user_growth',
      VERIFICATION_RATE: 'verification_rate',
      SUSPENSION_RATE: 'suspension_rate',
      ONBOARDING_COMPLETION: 'onboarding_completion'
    }
  },

  // Wallet and Financial Management
  WALLET_CONSTANTS: {
    WALLET_TYPES: ['customer', 'driver', 'merchant', 'staff', 'admin'],
    PAYMENT_METHODS: [
      'credit_card',
      'debit_card',
      'digital_wallet',
      'bank_transfer',
      'mobile_money'
    ],
    PAYMENT_STATUSES: [
      'pending',
      'completed',
      'failed',
      'refunded',
      'rejected',
      'disputed'
    ],
    TRANSACTION_TYPES: [
      'deposit',
      'payment',
      'refund',
      'withdrawal',
      'cashback',
      'tip',
      'salary',
      'bonus',
      'gamification_reward',
      'payout',
      'fee'
    ],
    WALLET_SETTINGS: {
      MIN_DEPOSIT_AMOUNT: 5, // In default currency
      MAX_DEPOSIT_AMOUNT: 5000,
      MIN_WITHDRAWAL_AMOUNT: 10,
      MAX_WITHDRAWAL_AMOUNT: 10000,
      MIN_PAYOUT_AMOUNT: 10,
      MAX_PAYOUT_AMOUNT: 5000,
      TRANSACTION_LIMIT_PER_DAY: 100,
      MAX_PAYMENT_METHODS: 5,
      MAX_WALLET_BALANCE: 50000
    },
    PAYOUT_SETTINGS: {
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money'],
      MAX_PAYOUT_FREQUENCY_DAYS: 30,
      PAYOUT_PROCESSING_TIME_HOURS: 48,
      MIN_PAYOUT_PROCESSING_FEE: 0.5 // In default currency
    },
    TAX_SETTINGS: {
      DEFAULT_TAX_RATE_PERCENTAGE: 10,
      SUPPORTED_TAX_REGIONS: [
        'US', 'EU', 'CA', 'AU', 'UK',
        'MW', 'TZ', 'KE', 'MZ', 'NG', 'ZA', 'IN', 'BR'
      ],
      TAX_EXEMPTION_TYPES: ['non_profit', 'small_business', 'individual']
    },
    FRAUD_DETECTION: {
      MAX_SUSPICIOUS_TRANSACTIONS_PER_DAY: 5,
      TRANSACTION_VELOCITY_LIMIT: 10, // Transactions per hour
      IP_BLOCK_DURATION_HOURS: 24
    },
    FINANCIAL_ANALYTICS: {
      REPORT_PERIODS: ['daily', 'weekly', 'monthly', 'yearly'],
      TRANSACTION_CATEGORIES: [
        'deposit', 'payment', 'refund', 'withdrawal', 'cashback',
        'tip', 'salary', 'bonus', 'gamification_reward', 'payout', 'fee'
      ],
      METRICS: [
        'revenue',
        'transaction_volume',
        'fraud_rate',
        'payout_success_rate'
      ]
    }
  },

  // Platform Configuration
  PLATFORM_CONSTANTS: {
    PRICING_MODELS: ['fixed', 'dynamic', 'subscription', 'hybrid'],
    RATE_LIMITS: {
      API_CALLS_PER_MINUTE: 100,
      USER_ACTIONS_PER_HOUR: 500,
      ADMIN_ACTIONS_PER_HOUR: 1000
    },
    LOCALIZATION_DEFAULTS: {
      CURRENCY: 'USD',
      TIME_FORMAT: '24h',
      DATE_FORMAT: 'YYYY-MM-DD',
      MAP_PROVIDER: 'google_maps'
    },
    BACKUP_SETTINGS: {
      BACKUP_FREQUENCY_HOURS: 24,
      DATA_RETENTION_DAYS: 365,
      MAX_BACKUP_SIZE_MB: 10000,
      RESTORE_TIMEOUT_MINUTES: 60
    },
    SYSTEM_HEALTH: {
      MIN_UPTIME_PERCENTAGE: 99.9,
      MAX_DOWNTIME_MINUTES_PER_MONTH: 43,
      HEALTH_CHECK_INTERVAL_SECONDS: 60
    },
    FEATURE_FLAGS: ['new_ui', 'advanced_analytics', 'beta_features'],
    DEPLOYMENT_SETTINGS: {
      ROLLBACK_WINDOW_HOURS: 24,
      MAX_CONCURRENT_DEPLOYS: 3,
      DEPLOYMENT_NOTIFICATION_METHODS: ['email', 'sms']
    },
    ANALYTICS_METRICS: [
      'configuration_change_rate',
      'feature_adoption',
      'system_uptime'
    ]
  },

  // Error Codes
  ERROR_CODES: {
    INVALID_ADMIN: 'ERR_INVALID_ADMIN',
    ADMIN_NOT_FOUND: 'ERR_ADMIN_NOT_FOUND',
    PERMISSION_DENIED: 'ERR_PERMISSION_DENIED',
    USER_SUSPENSION_FAILED: 'ERR_USER_SUSPENSION_FAILED',
    WALLET_OPERATION_FAILED: 'ERR_WALLET_OPERATION_FAILED',
    PAYMENT_FAILED: 'ERR_PAYMENT_FAILED',
    CONFIGURATION_UPDATE_FAILED: 'ERR_CONFIGURATION_UPDATE_FAILED'
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    ADMIN_CREATED: 'Admin created successfully',
    USER_SUSPENDED: 'User suspended successfully',
    USER_ONBOARDED: 'User onboarded successfully',
    FINANCIAL_REPORT_GENERATED: 'Financial report generated successfully',
    PLATFORM_CONFIG_UPDATED: 'Platform configuration updated successfully'
  }
};