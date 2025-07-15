'use strict';

module.exports = {
  ROLE: 'financial_admin',
  DESCRIPTION: 'Manages wallet operations, payouts, and tax compliance.',
  PERMISSIONS: {
    manageFinancials: ['read', 'write', 'approve'],
    manageUsers: ['read'],
    manageAnalytics: ['read', 'export'],
    manageCompliance: ['read', 'write'],
    manageLogs: ['read']
  },
  SETTINGS: {
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60,
    TWO_FACTOR_AUTH: { ENABLED: true, METHODS: ['sms', 'email', 'authenticator_app'] },
    PROFILE_FIELDS: { REQUIRED: ['full_name', 'email', 'phone_number', 'role'], OPTIONAL: ['preferred_language'] }
  },
  FINANCIAL_OPERATIONS: {
    WALLET_TYPES: ['customer', 'driver', 'merchant', 'staff', 'admin'],
    PAYMENT_METHODS: ['credit_card', 'debit_card', 'digital_wallet', 'bank_transfer', 'mobile_money', 'crypto'],
    TRANSACTION_TYPES: ['deposit', 'payment', 'refund', 'withdrawal', 'payout', 'fee'],
    WALLET_SETTINGS: {
      MIN_DEPOSIT_AMOUNT: 5,
      MAX_DEPOSIT_AMOUNT: 10000,
      MIN_WITHDRAWAL_AMOUNT: 5,
      MAX_WITHDRAWAL_AMOUNT: 15000,
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_AMOUNT: 10000,
      TRANSACTION_LIMIT_PER_DAY: 200,
      MAX_WALLET_BALANCE: 100000
    },
    PAYOUT_SETTINGS: {
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money', 'crypto'],
      MAX_PAYOUT_FREQUENCY_DAYS: 7,
      PAYOUT_PROCESSING_TIME_HOURS: 24,
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT']
    },
    FRAUD_DETECTION: {
      MAX_SUSPICIOUS_TRANSACTIONS_PER_DAY: 10,
      TRANSACTION_VELOCITY_LIMIT: 15,
      IP_BLOCK_DURATION_HOURS: 12
    }
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['revenue', 'transaction_volume', 'fraud_rate', 'payout_success_rate'],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['financial_update', 'payout_processed', 'fraud_alert', 'announcement'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    MAX_PER_HOUR: 15,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },
  ERROR_CODES: ['PERMISSION_DENIED', 'WALLET_OPERATION_FAILED', 'PAYMENT_FAILED'],
  SUCCESS_MESSAGES: ['financial_report_generated', 'payment_approved', 'payout_processed']
};