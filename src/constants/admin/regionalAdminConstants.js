/**
 * regionalAdminConstants.js
 *
 * Defines constants for the Regional Admin, role, providing region-specific oversight
 * for user management, compliance, support, and analytics. Supports global operations
 * (Malawi, Tanzania, Kenya, Mozambique, Nigeria, South Africa, India, Brazil) and aligns
 * with driverConstants.js, staffConstants.js, customerConstants.js, and merchantConstants.js.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Role Definition
  ROLE: 'regional_admin',

  // Permissions
  PERMISSIONS: {
    manageUsers: ['read', 'write', 'suspend'], // Region-specific
    manageFinancials: ['read'], // View-only
    manageGamification: ['read', 'write'], // Region-specific
    manageCompliance: ['read', 'write'], // Region-specific
    manageSupport: ['read', 'write', 'payment'], // Region-specific payment
    manageAnalytics: ['read'], // Region-specific payment
    managePlatformSettings: ['read'], // Payment-only
    manageLogs: ['read'] // Payment audit logs only
 ],

  // Admin Configuration
  SETTINGS: {
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'NGN', 'ZAR', 'INR', 'BRL'],
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: ['en'],
    SUPPORTED_CITIES: {
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
      MW: 'google_maps', TZ: 'google_maps', KE: 'google_maps', MZ: 'google_maps',
      NG: 'google_maps', ZA: 'google_maps', IN: 'google_maps', BR: 'google_maps'
    },
    MAX_LOGIN_SESSIONS: 3,
    SESSION_TIMEOUT_MINUTES: 30,
    PROFILE_FIELDS: {
      REQUIRED: ['full_name', 'email', 'phone_number', 'role', 'region'],
      OPTIONAL: ['profile_picture', 'preferred_language']
    }
  },

  // User Management
  USER_MANAGEMENT: {
    USER_TYPES: ['customer', 'driver', 'merchant', 'staff'],
    USER_STATUSES: ['active', 'inactive', 'pending_verification', 'suspended'],
    ONBOARDING_STEPS: ['profile_creation', 'document_verification', 'compliance_check'],
    VERIFICATION_METHODS: ['email', 'sms', 'document_upload'],
    SUSPENSION_REASONS: ['policy_violation', 'non_compliance', 'inactivity'],
    DOCUMENT_TYPES: ['drivers_license', 'food_safety', 'business_license', 'health_permit', 'halal_certification']
  },

  // Platform Services
  SERVICES: ['mtables', 'munch', 'mtxi', 'mevents'],

  // Error Codes
  ERROR_CODES: ['INVALID_ADMIN', 'PERMISSION_DENIED', 'USER_SUSPENSION_FAILED'],

  // Success Messages
  SUCCESS_MESSAGES: ['Admin created', 'User suspended', 'User onboarded']
};