'use strict';

/**
 * driverRevenueStreamConstants.js
 *
 * Defines revenue stream constants for drivers across platform services (mtxi, munch, mevents).
 * Outlines driver earnings with competitive shares, payout schedules (instant to monthly with relaxed constraints),
 * and tax compliance for 15 supported countries. Aligns with localizationConstants.js, munchConstants.js, mtxiConstants.js, and meventsConstants.js.
 *
 * Last Updated: July 18, 2025
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
      FREQUENCY: ['INSTANT', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
      DEFAULT_FREQUENCY: 'WEEKLY',
      PROCESSING_TIME_HOURS: {
        INSTANT: 0.5, // Reduced for competitiveness
        DAILY: 24,
        WEEKLY: 168,
        BIWEEKLY: 336,
        MONTHLY: 720
      },
      MIN_PAYOUT_THRESHOLD: 2, // Lowered to make payouts accessible
      MAX_PAYOUT_THRESHOLD: 15000, // Increased to support high earners
      SUPPORTED_PAYOUT_METHODS: ['BANK_TRANSFER', 'WALLET_TRANSFER', 'MOBILE_MONEY', 'CRYPTO'],
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT'],
      INSTANT_PAYOUT_RULES: {
        ELIGIBLE_METHODS: ['BANK_TRANSFER', 'WALLET_TRANSFER', 'MOBILE_MONEY', 'CRYPTO'], // Added BANK_TRANSFER for flexibility
        MAX_INSTANT_PAYOUT_AMOUNT: 10000, // Increased for larger transactions
        TRANSACTION_LIMIT_PER_DAY: 20, // Increased for frequent payouts
        GATEWAY_AVAILABILITY: ['STRIPE', 'PAYPAL', 'COINBASE', 'SQUARE'], // Added SQUARE
        BANKING_HOURS: {
          US: { START: '08:00', END: '20:00', TIMEZONE: 'America/New_York' }, // Extended hours
          GB: { START: '08:00', END: '20:00', TIMEZONE: 'Europe/London' },
          EU: { START: '08:00', END: '20:00', TIMEZONE: 'Europe/Berlin' },
          CA: { START: '08:00', END: '20:00', TIMEZONE: 'America/Toronto' },
          AU: { START: '08:00', END: '20:00', TIMEZONE: 'Australia/Sydney' },
          MW: { START: '07:00', END: '18:00', TIMEZONE: 'Africa/Blantyre' },
          TZ: { START: '07:00', END: '18:00', TIMEZONE: 'Africa/Dar_es_Salaam' },
          KE: { START: '07:00', END: '18:00', TIMEZONE: 'Africa/Nairobi' },
          MZ: { START: '07:00', END: '18:00', TIMEZONE: 'Africa/Maputo' },
          ZA: { START: '07:00', END: '18:00', TIMEZONE: 'Africa/Johannesburg' },
          IN: { START: '08:00', END: '20:00', TIMEZONE: 'Asia/Kolkata' },
          CM: { START: '07:00', END: '18:00', TIMEZONE: 'Africa/Douala' },
          GH: { START: '07:00', END: '18:00', TIMEZONE: 'Africa/Accra' },
          MX: { START: '08:00', END: '20:00', TIMEZONE: 'America/Mexico_City' },
          ER: { START: '07:00', END: '18:00', TIMEZONE: 'Africa/Asmara' }
        },
        NON_BANKING_HOUR_FALLBACK: 'DAILY',
        GATEWAY_FEES: {
          STRIPE: 0.015, // 1.5% for instant payouts
          PAYPAL: 0.01, // 1%
          COINBASE: 0.005, // 0.5%
          SQUARE: 0.012 // 1.2%
        }
      }
    },
    TAX_COMPLIANCE: {
      TAX_TYPES: ['VAT', 'SALES_TAX', 'SERVICE_TAX'],
      DEFAULT_TAX_TYPE: 'VAT',
      TAX_CALCULATION_METHOD: 'EXCLUSIVE',
      TAX_EXEMPT_STATUSES: ['NON_PROFIT', 'GOVERNMENT', 'EXPORT', 'INDEPENDENT_CONTRACTOR'], // Added for drivers
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
      FULL_REFUND_WINDOW_HOURS: 24, // Extended for fairness
      PARTIAL_REFUND_PERCENTAGE: 75, // Increased for driver benefit
      NON_REFUNDABLE_FEES: ['platform_fee', 'driver_processing_fee']
    }
  },

  // Service-Specific Driver Revenue Streams
  DRIVER_REVENUE_STREAMS: {
    MTXI: {
      DRIVER_EARNINGS: {
        BASE_SHARE: 85, // Increased from 80% for competitiveness
        PREMIUM_RIDE_SHARE: 90, // Increased from 85%
        TRANSACTION_TYPES: ['RIDE_PAYMENT'], // Aligned with mtxiConstants.js
        EXCLUDED: ['tips'], // Aligned with mtxiConstants.js
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 15, // Reduced from 20%
            PREMIUM_RIDE_PERCENTAGE: 10, // Reduced from 15%
            MIN_COMMISSION: 0.5, // Reduced
            MAX_COMMISSION: 20 // Reduced
          },
          DRIVER_PROCESSING_FEE: 0.15, // Reduced from 0.2
          INSTANT_PAYOUT_FEE: {
            STRIPE: 0.015,
            PAYPAL: 0.01,
            COINBASE: 0.005,
            SQUARE: 0.012
          }
        },
        PAYOUT_RULES: {
          TIMING: 'post_ride_completion', // Aligned with mtxiConstants.js
          FREQUENCY: ['INSTANT', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
          DEFAULT_FREQUENCY: 'WEEKLY',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['ride_volume', 'revenue', 'completion_rate', 'customer_satisfaction'] // Added customer_satisfaction
    },
    MUNCH: {
      DRIVER_EARNINGS: {
        BASE_SHARE: 80, // Increased from 70% to align with merchant fairness
        TRANSACTION_TYPES: ['DELIVERY_PAYMENT'], // Aligned with munchConstants.js
        EXCLUDED: ['tips'], // Aligned with munchConstants.js
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 10, // Reduced to match munchConstants.js
            MIN_COMMISSION: 0.3, // Reduced
            MAX_COMMISSION: 8 // Reduced
          },
          DRIVER_PROCESSING_FEE: 0.2, // Reduced from 0.3
          INSTANT_PAYOUT_FEE: {
            STRIPE: 0.015,
            PAYPAL: 0.01,
            COINBASE: 0.005,
            SQUARE: 0.012
          }
        },
        PAYOUT_RULES: {
          TIMING: 'post_delivery_completion', // Aligned with munchConstants.js
          FREQUENCY: ['INSTANT', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
          DEFAULT_FREQUENCY: 'WEEKLY',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['delivery_volume', 'revenue', 'delivery_completion_rate', 'delivery_performance'] // Aligned with munchConstants.js
    },
    MEVENTS: {
      DRIVER_EARNINGS: {
        BASE_SHARE: 80, // Increased from 70% to align with merchant fairness
        TRANSACTION_TYPES: ['EVENT_DELIVERY_PAYMENT'], // Aligned with meventsConstants.js
        EXCLUDED: ['tips'], // Aligned with meventsConstants.js
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 10, // Reduced to match meventsConstants.js
            MIN_COMMISSION: 0.5, // Reduced
            MAX_COMMISSION: 15 // Reduced
          },
          DRIVER_PROCESSING_FEE: 0.2, // Reduced from 0.3
          INSTANT_PAYOUT_FEE: {
            STRIPE: 0.015,
            PAYPAL: 0.01,
            COINBASE: 0.005,
            SQUARE: 0.012
          }
        },
        PAYOUT_RULES: {
          TIMING: 'post_delivery_completion', // Aligned with meventsConstants.js
          FREQUENCY: ['INSTANT', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
          DEFAULT_FREQUENCY: 'WEEKLY',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['event_delivery_volume', 'revenue', 'delivery_completion_rate', 'participant_engagement'] // Aligned with meventsConstants.js
    }
  },

  // Additional Driver Costs
  ADDITIONAL_COSTS: {
    DRIVER_SUBSCRIPTION: {
      PLANS: [
        {
          NAME: 'Basic',
          FEE_REDUCTION_PERCENTAGE: 3, // Increased from 2%
          PRICE: {
            US: 4, GB: 3, EU: 3.5, CA: 5, AU: 4.5, MW: 800, TZ: 10000, KE: 600, MZ: 250, ZA: 60,
            IN: 300, CM: 2500, GH: 25, MX: 80, ER: 60 // Reduced prices
          },
          DURATION_DAYS: 30
        },
        {
          NAME: 'Premium',
          FEE_REDUCTION_PERCENTAGE: 6, // Increased from 5%
          PRICE: {
            US: 12, GB: 10, EU: 11, CA: 15, AU: 13, MW: 2500, TZ: 30000, KE: 1800, MZ: 750, ZA: 180,
            IN: 900, CM: 7500, GH: 75, MX: 250, ER: 180 // Reduced prices
          },
          DURATION_DAYS: 30
        }
      ],
      PAYMENT_METHODS: ['CREDIT_CARD', 'DEBIT_CARD', 'DIGITAL_WALLET', 'CRYPTO'],
      PAYMENT_STATUSES: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
      TAX_APPLIED: true
    }
  },

  // Notifications
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: {
      PAYOUT_PROCESSED: 'PAYOUT_PROCESSED',
      COMMISSION_DEDUCTED: 'COMMISSION_DEDUCTED',
      FEE_CHARGED: 'FEE_CHARGED',
      SUBSCRIPTION_PAYMENT: 'SUBSCRIPTION_PAYMENT',
      INSTANT_PAYOUT_FAILED: 'INSTANT_PAYOUT_FAILED' // Added for instant payout issues
    },
    DELIVERY_METHODS: ['EMAIL', 'PUSH', 'WHATSAPP', 'TELEGRAM'], // Aligned with service constants
    PRIORITY_LEVELS: ['LOW', 'MEDIUM', 'HIGH'] // Added HIGH for instant payout failures
  },

  // Compliance and Audit
  COMPLIANCE_CONSTANTS: {
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'], // Aligned with localizationConstants.js
    AUDIT_TYPES: ['payout_processed', 'commission_deduction', 'subscription_payment', 'instant_payout'],
    AUDIT_LOG_RETENTION_DAYS: 365,
    TAX_REPORTING: {
      FREQUENCY: 'QUARTERLY',
      FORMATS: ['csv', 'json']
    }
  },

  // Error and Success Messages
  ERROR_CODES: [
    'INVALID_PAYOUT_AMOUNT', 'PAYMENT_FAILED', 'INSUFFICIENT_FUNDS', 'INVALID_SUBSCRIPTION_PLAN',
    'INSTANT_PAYOUT_NOT_AVAILABLE', 'INSTANT_PAYOUT_LIMIT_EXCEEDED', 'BANKING_HOURS_RESTRICTION'
  ],
  SUCCESS_MESSAGES: [
    'PAYOUT_PROCESSED', 'COMMISSION_DEDUCTED', 'SUBSCRIPTION_ACTIVATED', 'INSTANT_PAYOUT_PROCESSED'
  ]
};