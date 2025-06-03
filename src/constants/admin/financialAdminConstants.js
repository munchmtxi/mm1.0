/**
 * financialAdminConstants.js
 *
 * Defines constants for the Financial Admin role, managing wallet operations, payouts,
 * and taxes. Supports global operations (Malawi, Tanzania, Kenya, Mozambique, Nigeria,
 * South Africa, India, Brazil) and aligns with driverConstants.js, staffConstants.js,
 * customerConstants.js, and merchantConstants.js.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Role Definition
  ROLE: 'financial_admin',

  // Permissions
  PERMISSIONS: {
    manageFinancials: ['read', 'write', 'approve'], // Wallet, payouts, taxes
    manageUsers: ['read'], // View financial data
    manageAnalytics: ['read', 'export'], // Financial analytics
    manageCompliance: ['read', 'write'], // Financial regulations
    manageLogs: ['read'] // Financial audit logs
  },

  // Admin Configuration
  SETTINGS: {
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'NGN', 'ZAR', 'INR', 'BRL'],
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: ['en'],
    DEFAULT_TIMEZONE: 'UTC',
    MAX_LOGIN_SESSIONS: 3,
    SESSION_TIMEOUT_MINUTES: 30,
    PROFILE_FIELDS: {
      REQUIRED: ['full_name', 'email', 'phone_number', 'role'],
      OPTIONAL: ['preferred_language']
    }
  },

  // Financial Operations
  FINANCIAL_OPERATIONS: {
    WALLET_TYPES: ['customer', 'driver', 'merchant', 'staff', 'admin'],
    PAYMENT_METHODS: ['credit_card', 'debit_card', 'digital_wallet', 'bank_transfer', 'mobile_money'],
    TRANSACTION_TYPES: ['deposit', 'payment', 'refund', 'withdrawal', 'cashback', 'tip', 'salary', 'bonus', 'payout', 'fee'],
    WALLET_SETTINGS: {
      MIN_DEPOSIT_AMOUNT: 5,
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
      PAYOUT_PROCESSING_TIME_HOURS: 48
    },
    TAX_SETTINGS: {
      DEFAULT_TAX_RATE_PERCENTAGE: 10,
      SUPPORTED_TAX_REGIONS: ['US', 'EU', 'AU', 'CA', 'UK', 'MW', 'TZ', 'KE', 'MZ', 'NG', 'ZA', 'IN', 'BR']
    },
    FRAUD_DETECTION: {
      MAX_SUSPICIOUS_TRANSACTIONS_PER_DAY: 5,
      TRANSACTION_VELOCITY_LIMIT: 10,
      IP_BLOCK_DURATION_HOURS: 24
    }
  },

  // Error Codes
  ERROR_CODES: ['PERMISSION_DENIED', 'WALLET_OPERATION_FAILED', 'PAYMENT_FAILED'],

  // Success Messages
  SUCCESS_MESSAGES: ['Financial report generated', 'Payment approved']
};