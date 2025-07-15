'use strict';

/**
 * customerWalletConstants.js
 *
 * Defines wallet-related constants for customers, including payment methods, transaction types,
 * and settings tailored for customer interactions like deposits, payments, and bill splitting.
 *
 * Last Updated: June 25, 2025
 */

module.exports = {
  WALLET_CONSTANTS: {
    WALLET_TYPE: 'customer',
    PAYMENT_METHODS: [
      'credit_card', 'debit_card', 'digital_wallet', 'bank_transfer', 'mobile_money', 'crypto'
    ],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    TRANSACTION_TYPES: [
      'deposit', 'ride_payment', 'order_payment', 'event_payment', 'parking_payment',
      'booking_payment', 'refund', 'withdrawal', 'tip', 'social_bill_split'
    ],
    WALLET_SETTINGS: {
      MIN_DEPOSIT_AMOUNT: 5,
      MAX_DEPOSIT_AMOUNT: 10000,
      MIN_WITHDRAWAL_AMOUNT: 10,
      MAX_WITHDRAWAL_AMOUNT: 20000,
      MAX_PAYMENT_METHODS: 10,
      TRANSACTION_LIMIT_PER_DAY: 100,
      AUTO_TOP_UP_MIN: 5,
      AUTO_TOP_UP_MAX: 1000,
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT'],
      AUTO_TOP_UP_ENABLED: true
    },
    BILL_SPLIT_SETTINGS: {
      BILL_SPLIT_TYPES: ['equal', 'custom', 'itemized', 'percentage', 'sponsor_contribution'],
      MAX_SPLIT_PARTICIPANTS: 50
    },
    FINANCIAL_ANALYTICS: {
      REPORT_PERIODS: ['daily', 'weekly', 'monthly', 'yearly'],
      TRANSACTION_CATEGORIES: [
        'deposit', 'ride_payment', 'order_payment', 'event_payment', 'parking_payment',
        'booking_payment', 'refund', 'withdrawal', 'tip', 'social_bill_split'
      ],
      METRICS: ['transaction_volume', 'average_transaction_amount', 'success_rate', 'refund_rate']
    },
    SECURITY_SETTINGS: {
      MFA_METHODS: ['sms', 'email', 'auth_app', 'biometric'],
      TOKENIZATION_PROVIDER: 'stripe',
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION_MINUTES: 15
    },
    ERROR_CODES: [
      'WALLET_INSUFFICIENT_FUNDS', 'PAYMENT_FAILED', 'INVALID_BILL_SPLIT',
      'MAX_SPLIT_PARTICIPANTS_EXCEEDED'
    ],
    SUCCESS_MESSAGES: [
      'wallet_funded', 'payment_completed', 'bill_split_completed', 'withdrawal_processed'
    ]
  }
};