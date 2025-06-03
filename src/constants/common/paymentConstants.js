'use strict';

module.exports = {
  WALLET_SETTINGS: {
    WALLET_TYPES: ['admin', 'customer', 'driver', 'merchant', 'staff'],
    MIN_BALANCE: 0,
    MAX_BALANCE: 100000,
    TRANSACTION_LIMIT_PER_DAY: 50,
    MAX_PAYMENT_METHODS: 5,
  },
  PAYMENT_METHODS: [
    'credit_card',
    'debit_card',
    'digital_wallet',
    'bank_transfer',
    'mobile_money',
  ],
  TRANSACTION_TYPES: [
    'deposit',
    'payment',
    'refund',
    'withdrawal',
    'earning',
    'salary',
    'bonus',
    'tip',
    'cashback',
    'transfer',
    'social_bill_split', // For Social Service
  ],
  TRANSACTION_STATUSES: ['pending', 'completed', 'failed', 'rejected'],
  FINANCIAL_LIMITS: [
    { type: 'DEPOSIT', min: 5, max: 5000 },
    { type: 'WITHDRAWAL', min: 10, max: 10000 },
    { type: 'PAYMENT', min: 1, max: 10000 },
    { type: 'TIP', min: 0.01, max: 1000 }, // Aligned with tipConstants
    { type: 'CASHBACK', min: 1, max: 100 },
    { type: 'GAMIFICATION_REWARD', min: 0.01, max: 500 }, // For Wallet creditWallet
    { type: 'SOCIAL_BILL_SPLIT', min: 1, max: 5000 }, // For Social Service
  ],
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: {
      WALLET_CREATED: 'WALLET_CREATED',
      DEPOSIT_CONFIRMED: 'DEPOSIT_CONFIRMED',
      WITHDRAWAL_PROCESSED: 'WITHDRAWAL_PROCESSED',
      PAYMENT_CONFIRMATION: 'PAYMENT_CONFIRMATION',
      GAMIFICATION_REWARD: 'GAMIFICATION_REWARD',
      TIP_SENT: 'TIP_SENT', // For Tip Service
      TIP_RECEIVED: 'TIP_RECEIVED',
      TIP_UPDATED: 'TIP_UPDATED',
      TIP_FAILED: 'TIP_FAILED',
      SOCIAL_BILL_SPLIT_REQUEST: 'SOCIAL_BILL_SPLIT_REQUEST', // For Social Service
      SOCIAL_BILL_SPLIT_COMPLETED: 'SOCIAL_BILL_SPLIT_COMPLETED',
    },
    DELIVERY_METHODS: {
      PUSH: 'push',
      EMAIL: 'email',
      SMS: 'sms',
    },
    PRIORITY_LEVELS: {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
    },
  },
  ERROR_CODES: [
    'WALLET_NOT_FOUND',
    'INSUFFICIENT_FUNDS',
    'INVALID_PAYMENT_METHOD',
    'TRANSACTION_FAILED',
    'KYC_NOT_COMPLETED',
    'MAX_PAYMENT_METHODS_EXCEEDED',
    'TRANSACTION_LIMIT_EXCEEDED',
    'WITHDRAWAL_ATTEMPTS_EXCEEDED',
    'INVALID_IP_ADDRESS',
    'CURRENCY_MISMATCH',
    'INVALID_BALANCE',
    'INVALID_SOCIAL_BILL_SPLIT', // For Social Service
  ],
  SUCCESS_MESSAGES: [
    'Wallet created',
    'Payment completed',
    'Deposit confirmed',
    'Withdrawal processed',
    'Payment method added',
    'Transaction recorded',
    'Bill split completed', // For Social Service
  ],
};