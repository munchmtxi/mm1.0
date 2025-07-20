'use strict';

/**
 * driverRevenueStreamConstants.js
 *
 * Defines revenue stream constants for drivers across platform services (mtxi, munch, mevents).
 * Outlines driver earnings after platform commissions and fees, payout schedules, and tax compliance
 * for 15 supported countries. Integrates with localizationConstants.js, driverConstants.js, and provided payout constants.
 *
 * Last Updated: July 15, 2025
 */

module.exports = {
  // General Driver Revenue Settings
  DRIVER_REVENUE_SETTINGS: {
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'],
    COUNTRY_CURRENCY_MAP: {
      US: 'USD', GB: 'GBP', EU: 'EUR', CA: 'CAD', AU: 'AUD', MW: 'MWK', TZ: 'TZS', KE: 'KES', MZ: 'MZN',
      ZA: 'ZAR', IN: 'INR', CM: 'XAF', GH: 'GHS', MX: 'MXN', ER: 'ERN'
    },
    PAYOUT_SCHEDULE: {
      SUPPORTED_FREQUENCIES: ['daily', 'weekly', 'biweekly', 'monthly'],
      PROCESSING_TIME_HOURS: 24,
      MIN_PAYOUT_THRESHOLD: 5,
      MAX_PAYOUT_THRESHOLD: 10000,
      AUTO_PAYOUT_THRESHOLD: 100,
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'mobile_money', 'wallet_transfer', 'crypto'],
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT']
    },
    TAX_COMPLIANCE: {
      TAX_TYPES: ['VAT', 'SALES_TAX', 'SERVICE_TAX'],
      DEFAULT_TAX_TYPE: 'VAT',
      TAX_CALCULATION_METHOD: 'EXCLUSIVE',
      TAX_EXEMPT_STATUSES: ['NON_PROFIT', 'GOVERNMENT', 'EXPORT'],
      TAX_RATES: {
        US: { SALES_TAX: 0.07 },
        GB: { VAT: 0.20 },
        EU: { VAT: 0.21 },
        CA: { SALES_TAX: 0.13 },
        AU: { VAT: 0.10 },
        MW: { VAT: 0.165 },
        TZ: { VAT: 0.18 },
        KE: { VAT: 0.16 },
        MZ: { VAT: 0.17 },
        ZA: { VAT: 0.15 },
        IN: { SERVICE_TAX: 0.18 },
        CM: { VAT: 0.1925 },
        GH: { VAT: 0.15 },
        MX: { VAT: 0.16 },
        ER: { VAT: 0.05 }
      }
    },
    REFUND_POLICY: {
      FULL_REFUND_WINDOW_HOURS: 12,
      PARTIAL_REFUND_PERCENTAGE: 50,
      NON_REFUNDABLE_FEES: ['platform_fee', 'driver_processing_fee']
    }
  },

  // Service-Specific Driver Revenue Streams
  DRIVER_REVENUE_STREAMS: {
    MTXI: {
      DRIVER_EARNINGS: {
        BASE_SHARE: 80, // 80% of ride fare after 20% platform commission
        PREMIUM_RIDE_SHARE: 85, // 85% for premium rides after 15% commission
        TRANSACTION_TYPES: ['RIDE_PAYMENT'],
        EXCLUDED: ['tips'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 20,
            PREMIUM_RIDE_PERCENTAGE: 15,
            MIN_COMMISSION: 1,
            MAX_COMMISSION: 25
          },
          DRIVER_PROCESSING_FEE: 0.2
        },
        PAYOUT_RULES: {
          TIMING: 'post_ride_completion',
          FREQUENCY: ['daily', 'weekly', 'biweekly', 'monthly'],
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['ride_volume', 'revenue', 'completion_rate']
    },
    MUNCH: {
      DRIVER_EARNINGS: {
        BASE_SHARE: 70, // 70% of delivery fee after 10% platform commission
        TRANSACTION_TYPES: ['delivery_payment'],
        EXCLUDED: ['tips'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 10,
            MIN_COMMISSION: 0.5,
            MAX_COMMISSION: 10
          },
          DRIVER_PROCESSING_FEE: 0.3
        },
        PAYOUT_RULES: {
          TIMING: 'post_delivery_completion',
          FREQUENCY: ['daily', 'weekly', 'biweekly', 'monthly'],
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['delivery_volume', 'revenue', 'delivery_completion_rate']
    },
    MEVENTS: {
      DRIVER_EARNINGS: {
        BASE_SHARE: 70, // 70% of event delivery fee after 10% platform commission
        TRANSACTION_TYPES: ['event_delivery_payment'],
        EXCLUDED: ['tips'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 10,
            MIN_COMMISSION: 1,
            MAX_COMMISSION: 20
          },
          DRIVER_PROCESSING_FEE: 0.3
        },
        PAYOUT_RULES: {
          TIMING: 'post_delivery_completion',
          FREQUENCY: ['daily', 'weekly', 'biweekly', 'monthly'],
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['event_delivery_volume', 'revenue', 'delivery_completion_rate']
    }
  },

  // Additional Driver Costs
  ADDITIONAL_COSTS: {
    DRIVER_SUBSCRIPTION: {
      PLANS: [
        {
          NAME: 'Basic',
          FEE_REDUCTION_PERCENTAGE: 2,
          PRICE: {
            US: 5, GB: 4, EU: 4.5, CA: 6, AU: 5.5, MW: 1000, TZ: 12000, KE: 700, MZ: 300, ZA: 70,
            IN: 400, CM: 3000, GH: 30, MX: 100, ER: 70
          },
          DURATION_DAYS: 30
        },
        {
          NAME: 'Premium',
          FEE_REDUCTION_PERCENTAGE: 5,
          PRICE: {
            US: 15, GB: 12, EU: 13.5, CA: 18, AU: 16.5, MW: 3000, TZ: 36000, KE: 2100, MZ: 900, ZA: 210,
            IN: 1200, CM: 9000, GH: 90, MX: 300, ER: 210
          },
          DURATION_DAYS: 30
        }
      ],
      PAYMENT_METHODS: ['credit_card', 'debit_card', 'digital_wallet', 'crypto'],
      PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
      TAX_APPLIED: true
    }
  },

  // Notifications
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'PAYOUT_REQUESTED',
      'PAYOUT_SCHEDULED',
      'PAYOUT_COMPLETED',
      'PAYOUT_FAILED',
      'AUTO_PAYOUT_TRIGGERED',
      'COMMISSION_DEDUCTED',
      'FEE_CHARGED',
      'SUBSCRIPTION_PAYMENT'
    ],
    DELIVERY_METHODS: ['EMAIL', 'PUSH', 'WHATSAPP', 'TELEGRAM'],
    PRIORITY_LEVELS: ['LOW', 'MEDIUM']
  },

  // Compliance and Audit
  COMPLIANCE_CONSTANTS: {
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_TYPES: [
      'REQUEST_PAYOUT',
      'GET_PAYOUT_HISTORY',
      'VERIFY_PAYOUT_METHOD',
      'SCHEDULE_RECURRING_PAYOUT',
      'AUTO_PAYOUT_PROCESSED',
      'commission_deduction',
      'subscription_payment'
    ],
    AUDIT_LOG_RETENTION_DAYS: 365,
    TAX_REPORTING: {
      FREQUENCY: 'QUARTERLY',
      FORMATS: ['csv', 'json']
    }
  },

  // Error and Success Messages
  ERROR_CODES: [
    'INVALID_PAYOUT_METHOD',
    'INVALID_PAYOUT_AMOUNT',
    'INSUFFICIENT_FUNDS',
    'WITHDRAWAL_ATTEMPTS_EXCEEDED',
    'PAYOUT_FAILED',
    'KYC_NOT_COMPLETED',
    'INVALID_SUBSCRIPTION_PLAN'
  ],
  SUCCESS_MESSAGES: [
    'PAYOUT_REQUESTED',
    'PAYOUT_SCHEDULED',
    'PAYOUT_COMPLETED',
    'PAYOUT_METHOD_VERIFIED',
    'AUTO_PAYOUT_PROCESSED',
    'COMMISSION_DEDUCTED',
    'SUBSCRIPTION_ACTIVATED'
  ]
};