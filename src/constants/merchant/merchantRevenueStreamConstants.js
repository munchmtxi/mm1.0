'use strict';

/**
 * merchantRevenueStreamConstants.js
 *
 * Defines revenue stream constants for merchants across platform services (mtables, munch, mtxi, mevents, mpark).
 * Outlines merchant earnings after platform commissions and fees, payout schedules, and tax compliance for 15 supported countries.
 *
 * Last Updated: July 15, 2025
 */

module.exports = {
  // General Merchant Revenue Settings
  MERCHANT_REVENUE_SETTINGS: {
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'],
    COUNTRY_CURRENCY_MAP: {
      US: 'USD', GB: 'GBP', EU: 'EUR', CA: 'CAD', AU: 'AUD', MW: 'MWK', TZ: 'TZS', KE: 'KES', MZ: 'MZN',
      ZA: 'ZAR', IN: 'INR', CM: 'XAF', GH: 'GHS', MX: 'MXN', ER: 'ERN'
    },
    PAYOUT_SCHEDULE: {
      FREQUENCY: 'WEEKLY',
      PROCESSING_TIME_HOURS: 24,
      MIN_PAYOUT_THRESHOLD: 5,
      MAX_PAYOUT_THRESHOLD: 10000,
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money', 'crypto'],
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
      NON_REFUNDABLE_FEES: ['platform_fee', 'merchant_processing_fee']
    }
  },

  // Service-Specific Merchant Revenue Streams
  MERCHANT_REVENUE_STREAMS: {
    MTABLES: {
      MERCHANT_EARNINGS: {
        BASE_SHARE: 85, // 85% of booking total after 15% platform commission
        PREMIUM_SUBSCRIPTION_SHARE: 90, // 90% with 10% commission for premium merchants
        TRANSACTION_TYPES: ['BOOKING_PAYMENT', 'pre_order_payment'],
        EXCLUDED: ['tips', 'deposits'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 15,
            PREMIUM_SUBSCRIPTION_PERCENTAGE: 10,
            MIN_COMMISSION: 1,
            MAX_COMMISSION: 50
          },
          MERCHANT_PROCESSING_FEE: 0.5
        },
        PAYOUT_RULES: {
          TIMING: 'post_transaction',
          FREQUENCY: 'weekly',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['booking_volume', 'revenue', 'no_show_rate']
    },
    MUNCH: {
      MERCHANT_EARNINGS: {
        BASE_SHARE: 80, // 80% of order total after 20% platform commission
        PREMIUM_SUBSCRIPTION_SHARE: 85, // 85% with 15% commission for premium merchants
        TRANSACTION_TYPES: ['ORDER_PAYMENT'],
        EXCLUDED: ['tips', 'delivery_fee'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 20,
            PREMIUM_SUBSCRIPTION_PERCENTAGE: 15,
            MIN_COMMISSION: 1,
            MAX_COMMISSION: 100
          },
          MERCHANT_PROCESSING_FEE: 0.3
        },
        PAYOUT_RULES: {
          TIMING: 'post_transaction',
          FREQUENCY: 'weekly',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['order_volume', 'revenue', 'customer_retention']
    },
    MEVENTS: {
      MERCHANT_EARNINGS: {
        BASE_SHARE: 82, // 82% of event total after 18% platform commission
        PREMIUM_SUBSCRIPTION_SHARE: 88, // 88% with 12% commission for premium merchants
        TRANSACTION_TYPES: ['EVENT_PAYMENT'],
        EXCLUDED: ['tips', 'deposits'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 18,
            PREMIUM_SUBSCRIPTION_PERCENTAGE: 12,
            MIN_COMMISSION: 5,
            MAX_COMMISSION: 500
          },
          MERCHANT_PROCESSING_FEE: 1
        },
        PAYOUT_RULES: {
          TIMING: 'post_transaction',
          FREQUENCY: 'weekly',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['event_volume', 'revenue', 'participant_engagement']
    },
    MPARK: {
      MERCHANT_EARNINGS: {
        BASE_SHARE: 88, // 88% of parking total after 12% platform commission
        PREMIUM_SUBSCRIPTION_SHARE: 92, // 92% with 8% commission for premium merchants
        TRANSACTION_TYPES: ['PARKING_PAYMENT'],
        EXCLUDED: ['deposits'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 12,
            PREMIUM_SUBSCRIPTION_PERCENTAGE: 8,
            MIN_COMMISSION: 0.5,
            MAX_COMMISSION: 25
          },
          MERCHANT_PROCESSING_FEE: 0.2
        },
        PAYOUT_RULES: {
          TIMING: 'post_transaction',
          FREQUENCY: 'weekly',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['occupancy_rate', 'revenue', 'booking_volume']
    }
  },

  // Subscription Costs for Merchants
  SUBSCRIPTION_COSTS: {
    PLANS: [
      {
        NAME: 'Basic',
        FEE_REDUCTION_PERCENTAGE: 2,
        PRICE: {
          US: 10, GB: 8, EU: 9, CA: 12, AU: 11, MW: 2000, TZ: 25000, KE: 1500, MZ: 600, ZA: 150,
          IN: 800, CM: 6000, GH: 60, MX: 200, ER: 150
        },
        DURATION_DAYS: 30
      },
      {
        NAME: 'Premium',
        FEE_REDUCTION_PERCENTAGE: 5,
        PRICE: {
          US: 25, GB: 20, EU: 22, CA: 30, AU: 28, MW: 5000, TZ: 60000, KE: 3500, MZ: 1500, ZA: 350,
          IN: 2000, CM: 15000, GH: 150, MX: 500, ER: 350
        },
        DURATION_DAYS: 30
      },
      {
        NAME: 'Elite',
        FEE_REDUCTION_PERCENTAGE: 7,
        PRICE: {
          US: 50, GB: 40, EU: 45, CA: 60, AU: 55, MW: 10000, TZ: 120000, KE: 7000, MZ: 3000, ZA: 700,
          IN: 4000, CM: 30000, GH: 300, MX: 1000, ER: 700
        },
        DURATION_DAYS: 30
      }
    ],
    PAYMENT_METHODS: ['credit_card', 'debit_card', 'digital_wallet', 'crypto'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    TAX_APPLIED: true
  },

  // Additional Merchant Costs
  ADDITIONAL_COSTS: {
    ADVERTISING: {
      BANNER_AD: {
        US: 50, GB: 40, EU: 45, CA: 60, AU: 55, MW: 10000, TZ: 120000, KE: 7000, MZ: 3000, ZA: 700,
        IN: 4000, CM: 30000, GH: 300, MX: 1000, ER: 700
      },
      SPONSORED_LISTING: {
        US: 100, GB: 80, EU: 90, CA: 120, AU: 110, MW: 20000, TZ: 240000, KE: 14000, MZ: 6000, ZA: 1400,
        IN: 8000, CM: 60000, GH: 600, MX: 2000, ER: 1400
      },
      PUSH_NOTIFICATION: {
        US: 0.1, GB: 0.08, EU: 0.09, CA: 0.12, AU: 0.11, MW: 20, TZ: 240, KE: 14, MZ: 6, ZA: 1.4,
        IN: 8, CM: 60, GH: 0.6, MX: 2, ER: 1.4
      },
      APPLIES_TO: ['mtables', 'munch', 'mevents'],
      PAYMENT_TIMING: 'prepaid',
      TAX_APPLIED: true
    },
    LOYALTY_PROGRAM: {
      PARTICIPATION_FEE: {
        US: 5, GB: 4, EU: 4.5, CA: 6, AU: 5.5, MW: 1000, TZ: 12000, KE: 700, MZ: 300, ZA: 70,
        IN: 400, CM: 3000, GH: 30, MX: 100, ER: 70
      },
      REWARD_REDEMPTION_FEE: {
        US: 0.5, GB: 0.4, EU: 0.45, CA: 0.6, AU: 0.55, MW: 100, TZ: 1200, KE: 70, MZ: 30, ZA: 7,
        IN: 40, CM: 300, GH: 3, MX: 10, ER: 7
      },
      APPLIES_TO: ['mtables', 'munch', 'mevents'],
      TAX_APPLIED: true
    },
    PREMIUM_ANALYTICS: {
      FEE: {
        US: 20, GB: 16, EU: 18, CA: 24, AU: 22, MW: 4000, TZ: 48000, KE: 2800, MZ: 1200, ZA: 280,
        IN: 1600, CM: 12000, GH: 120, MX: 400, ER: 280
      },
      METRICS: ['customer_insights', 'predictive_trends', 'competitor_analysis'],
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
      ADVERTISING_PAYMENT: 'ADVERTISING_PAYMENT',
      LOYALTY_FEE: 'LOYALTY_FEE'
    },
    DELIVERY_METHODS: ['EMAIL', 'PUSH', 'WHATSAPP', 'TELEGRAM'],
    PRIORITY_LEVELS: ['LOW', 'MEDIUM']
  },

  // Compliance and Audit
  COMPLIANCE_CONSTANTS: {
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_TYPES: ['payout_processed', 'commission_deduction', 'subscription_payment', 'advertising_payment', 'loyalty_fee'],
    AUDIT_LOG_RETENTION_DAYS: 365,
    TAX_REPORTING: {
      FREQUENCY: 'QUARTERLY',
      FORMATS: ['csv', 'json']
    }
  },

  // Error and Success Messages
  ERROR_CODES: [
    'INVALID_PAYOUT_AMOUNT', 'PAYMENT_FAILED', 'INSUFFICIENT_FUNDS', 'INVALID_SUBSCRIPTION_PLAN',
    'ADVERTISING_PAYMENT_FAILED', 'LOYALTY_FEE_FAILED'
  ],
  SUCCESS_MESSAGES: [
    'PAYOUT_PROCESSED', 'COMMISSION_DEDUCTED', 'SUBSCRIPTION_ACTIVATED', 'ADVERTISING_PAYMENT_PROCESSED',
    'LOYALTY_FEE_PROCESSED'
  ]
};