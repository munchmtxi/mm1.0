'use strict';

/**
 * staffWalletConstants.js
 *
 * Defines wallet-related constants for staff, focusing on salary payments, delivery earnings,
 * and limited payout options tailored to operational roles within merchant businesses.
 *
 * Last Updated: July 18, 2025
 */
module.exports = {
  WALLET_CONSTANTS: {
    WALLET_TYPE: 'staff',
    PAYMENT_METHODS: ['bank_transfer', 'mobile_money', 'wallet_transfer', 'crypto'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'rejected', 'disputed'],
    TRANSACTION_TYPES: [
      'salary_payment', 'bonus_payment', 'withdrawal', 'delivery_earnings',
      'parking_earnings', 'stay_earnings', 'ticket_earnings'
    ],
    WALLET_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_AMOUNT: 10000,
      PAYOUT_FREQUENCY_DAYS: 7,
      PAYOUT_PROCESSING_TIME_HOURS: 24,
      AUTO_PAYOUT_ENABLED: true,
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT', 'BNB'],
      MAX_DAILY_TRANSACTIONS: 100,
      MAX_TRANSACTION_AMOUNT: 10000
    },
    FINANCIAL_ANALYTICS: {
      REPORT_PERIODS: ['weekly', 'monthly'],
      TRANSACTION_CATEGORIES: [
        'salary_payment', 'bonus_payment', 'withdrawal', 'delivery_earnings',
        'parking_earnings', 'stay_earnings', 'ticket_earnings'
      ],
      METRICS: ['earnings_total', 'payout_frequency', 'transaction_success_rate']
    },
    SECURITY_SETTINGS: {
      MFA_METHODS: ['sms', 'email', 'authenticator_app'],
      TOKENIZATION_PROVIDER: 'stripe',
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION_MINUTES: 15
    },
    ERROR_CODES: [
      'WALLET_INSUFFICIENT_FUNDS', 'PAYMENT_FAILED', 'INVALID_PAYOUT_METHOD',
      'INVALID_BANK_DETAILS'
    ],
    SUCCESS_MESSAGES: [
      'payment_processed', 'withdrawal_requested', 'salary_payment_received',
      'delivery_earnings_added', 'parking_earnings_added', 'stay_earnings_added',
      'ticket_earnings_added'
    ]
  }
};