'use strict';

/**
 * driverWalletConstants.js
 *
 * Defines wallet-related constants for drivers, focusing on ride and delivery earnings, tips,
 * and payout settings optimized for frequent, low-latency transactions.
 *
 * Last Updated: June 25, 2025
 */

module.exports = {
  WALLET_CONSTANTS: {
    WALLET_TYPE: 'driver',
    PAYMENT_METHODS: ['bank_transfer', 'mobile_money', 'wallet_transfer', 'crypto'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    TRANSACTION_TYPES: [
      'ride_earning', 'delivery_earning', 'tip', 'payout', 'bonus'
    ],
    WALLET_SETTINGS: {
      MIN_PAYOUT: 5,
      MAX_PAYOUT: 10000,
      TRANSACTION_LIMIT_PER_DAY: 100,
      PAYOUT_PROCESSING_TIME_HOURS: 24,
      AUTO_PAYOUT_THRESHOLD: 100,
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT'],
      AUTO_PAYOUT_ENABLED: true
    },
    FINANCIAL_ANALYTICS: {
      REPORT_PERIODS: ['daily', 'weekly', 'monthly'],
      TRANSACTION_CATEGORIES: [
        'ride_earning', 'delivery_earning', 'tip', 'payout', 'bonus'
      ],
      METRICS: ['earnings_trends', 'tip_volume', 'payout_frequency', 'transaction_success_rate']
    },
    SECURITY_SETTINGS: {
      MFA_METHODS: ['sms', 'email', 'auth_app', 'biometric'],
      TOKENIZATION_PROVIDER: 'stripe',
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION_MINUTES: 15
    },
    ERROR_CODES: [
      'WALLET_INSUFFICIENT_FUNDS', 'PAYMENT_FAILED', 'INVALID_PAYOUT_METHOD',
      'MAX_DAILY_TRANSACTIONS_EXCEEDED'
    ],
    SUCCESS_MESSAGES: [
      'payment_received', 'payout_processed', 'tip_received', 'bonus_added'
    ]
  }
};