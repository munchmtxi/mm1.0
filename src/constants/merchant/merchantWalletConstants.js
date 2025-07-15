'use strict';

/**
 * merchantWalletConstants.js
 *
 * Defines wallet-related constants for merchants, focusing on payout operations, high transaction
 * volumes, and financial compliance for business operations across multiple branches.
 *
 * Last Updated: June 25, 2025
 */

module.exports = {
  WALLET_CONSTANTS: {
    WALLET_TYPE: 'merchant',
    PAYMENT_METHODS: [
      'wallet', 'credit_card', 'debit_card', 'digital_wallet', 'mobile_money', 'crypto'
    ],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded', 'disputed'],
    TRANSACTION_TYPES: [
      'order_payment', 'booking_payment', 'event_payment', 'parking_payment', 'payout',
      'refund', 'deposit'
    ],
    WALLET_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_AMOUNT: 10000,
      MAX_PAYOUT_FREQUENCY_DAYS: 7,
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money', 'crypto'],
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT'],
      PAYOUT_PROCESSING_TIME_HOURS: 24,
      AUTO_PAYOUT_ENABLED: true,
      MAX_DAILY_TRANSACTIONS: 1000,
      MAX_TRANSACTION_AMOUNT: 50000
    },
    FINANCIAL_ANALYTICS: {
      REPORT_PERIODS: ['daily', 'weekly', 'monthly', 'yearly'],
      TRANSACTION_CATEGORIES: [
        'order_payment', 'booking_payment', 'event_payment', 'parking_payment', 'payout',
        'refund', 'deposit'
      ],
      METRICS: ['revenue', 'payout_volume', 'refund_rate', 'transaction_success_rate']
    },
    SECURITY_SETTINGS: {
      MFA_METHODS: ['sms', 'email', 'authenticator_app'],
      TOKENIZATION_PROVIDER: 'stripe',
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION_MINUTES: 15
    },
    ERROR_CODES: [
      'PAYMENT_FAILED', 'WALLET_INSUFFICIENT_FUNDS', 'INVALID_PAYOUT_METHOD',
      'MAX_DAILY_TRANSACTIONS_EXCEEDED'
    ],
    SUCCESS_MESSAGES: [
      'payment_completed', 'payout_processed', 'refund_processed', 'wallet_funded'
    ]
  }
};