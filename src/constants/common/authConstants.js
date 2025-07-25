'use strict';

module.exports = {
  AUTH_SETTINGS: {
    DEFAULT_ROLE: 'customer',
    SUPPORTED_ROLES: ['admin', 'customer', 'merchant', 'staff', 'driver'],
    PROTECTED_ROLES: ['admin', 'staff'],
    KYC_REQUIRED: ['merchant', 'driver'],
    ONBOARDING_STATUSES: ['pending', 'verified', 'rejected'],
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'],
    DEFAULT_CURRENCY: 'USD',
  },
  USER_STATUSES: ['active', 'inactive', 'pending_verification', 'suspended', 'banned'],
  RBAC_CONSTANTS: {
    PERMISSION_LEVELS: ['read', 'write', 'delete', 'approve', 'configure', 'audit', 'cancel', 'accept'],
    ROLE_PERMISSIONS: {
      customer: {
        manageProfile: ['read', 'write'],
        manageBookings: ['read', 'write', 'cancel'], // mpark, mtables
        manageOrders: ['read', 'write', 'cancel'], // munch
        manageRides: ['read', 'write', 'cancel'], // mtxi
        manageWallet: ['read', 'write'],
        viewAnalytics: ['read'],
        manageSocial: ['read', 'write'],
        manageSupport: ['read', 'write'],
      },
      merchant: {
        manageMerchantProfile: ['read', 'write'],
        manageBookings: ['read', 'write', 'approve', 'cancel'], // mpark, mtables
        manageOrders: ['read', 'write', 'approve'], // munch
        manageEvents: ['read', 'write', 'approve'], // mevents
        viewAnalytics: ['read'],
        managePayouts: ['read', 'write'],
        manageSupport: ['read', 'write', 'escalate'],
      },
      staff: {
        manageTasks: ['read', 'write'],
        manageBookings: ['read', 'write', 'approve'], // mpark, mtables
        manageOrders: ['read', 'write', 'approve'], // munch
        manageEvents: ['read', 'write', 'approve'], // mevents
        viewAnalytics: ['read'],
        manageSupport: ['read', 'write'],
      },
      admin: {
        manageUsers: ['read', 'write', 'delete', 'approve'],
        manageConfig: ['read', 'write', 'configure'],
        viewAnalytics: ['read', 'audit'],
        manageSupport: ['read', 'write', 'escalate'],
        manageAllServices: ['read', 'write', 'approve', 'cancel'], // mpark, mtables, munch, mtxi, mevents
      },
      driver: {
        manageRides: ['read', 'write', 'accept', 'cancel'], // mtxi
        manageDeliveries: ['read', 'write', 'accept'], // munch, mevents
        viewAnalytics: ['read'],
        manageWallet: ['read', 'write'],
        manageSupport: ['read', 'write'],
      },
    },
  },
  MFA_CONSTANTS: {
    MFA_METHODS: ['sms', 'email', 'auth_app', 'biometric'],
    MFA_STATUSES: ['enabled', 'disabled', 'pending'],
    MFA_ATTEMPT_LIMIT: 3,
    MFA_LOCKOUT_DURATION_MINUTES: 15,
    MFA_BACKUP_CODES: { COUNT: 10, LENGTH: 12 },
    MFA_REQUIRED_ROLES: ['admin', 'merchant', 'driver'],
  },
  SESSION_CONSTANTS: {
    MAX_SESSIONS_PER_USER: { customer: 5, merchant: 3, staff: 3, admin: 5, driver: 3 },
    SESSION_TIMEOUT_MINUTES: { customer: 60, merchant: 30, staff: 30, admin: 60, driver: 30 },
    SESSION_STATUSES: ['active', 'expired', 'terminated'],
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30,
  },
  TOKEN_CONSTANTS: {
    TOKEN_TYPES: { ACCESS: 'access', REFRESH: 'refresh' },
    TOKEN_EXPIRY: { ACCESS: 60, REFRESH: 10080 }, // 60 min, 7 days
    JWT: {
      SECRET: process.env.JWT_SECRET || null,
      ALGORITHM: process.env.JWT_ALGORITHM || 'HS256',
      REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || null,
    },
  },
  AUDIT_LOG_CONSTANTS: {
    LOG_TYPES: {
      TOKEN_ISSUANCE: 'TOKEN_ISSUANCE',
      LOGOUT: 'LOGOUT',
      USER_REGISTRATION: 'USER_REGISTRATION',
      LOGIN: 'LOGIN',
      MFA_ATTEMPT: 'MFA_ATTEMPT',
      PASSWORD_RESET: 'PASSWORD_RESET',
      KYC_VERIFICATION: 'KYC_VERIFICATION',
    },
    RETENTION_DAYS: 365,
  },
  VERIFICATION_CONSTANTS: {
    VERIFICATION_METHODS: ['email', 'phone', 'google', 'document_upload'],
    VERIFICATION_STATUSES: ['pending', 'verified', 'rejected'],
    VERIFICATION_DOCUMENT_TYPES: ['drivers_license', 'passport', 'national_id', 'vehicle_insurance', 'business_license'],
  },
  ERROR_CODES: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    MFA_FAILED: 'MFA_FAILED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    VERIFICATION_FAILED: 'VERIFICATION_FAILED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    KYC_REQUIRED: 'KYC_REQUIRED',
    INVALID_ROLE: 'INVALID_ROLE',
    DUPLICATE_USER: 'DUPLICATE_USER',
  },
  SUCCESS_MESSAGES: [
    'USER_LOGGED_IN',
    'TOKEN_REFRESHED',
    'MFA_ENABLED',
    'PASSWORD_RESET',
    'USER_VERIFIED',
    'SESSION_TERMINATED',
    'KYC_VERIFIED',
  ],
};