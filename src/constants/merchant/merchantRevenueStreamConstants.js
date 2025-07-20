'use strict';

/**
 * merchantRevenueStreamConstants.js
 *
 * Defines revenue stream constants for merchants across platform services (mtables, munch, mtxi, mtickets, mstays, mpark, mevents).
 * Outlines merchant earnings with competitive revenue shares, payout schedules (instant to monthly with relaxed constraints), and tax compliance for 15 supported countries.
 *
 * Last Updated: July 18, 2025
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
      FREQUENCY: ['INSTANT', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
      DEFAULT_FREQUENCY: 'WEEKLY',
      PROCESSING_TIME_HOURS: {
        INSTANT: 0.5, // Reduced for competitiveness
        DAILY: 24,
        WEEKLY: 168,
        BIWEEKLY: 336,
        MONTHLY: 720
      },
      MIN_PAYOUT_THRESHOLD: 2, // Lowered to make payouts more accessible
      MAX_PAYOUT_THRESHOLD: 15000, // Increased to support larger merchants
      SUPPORTED_PAYOUT_METHODS: ['BANK_TRANSFER', 'WALLET_TRANSFER', 'MOBILE_MONEY', 'CRYPTO'],
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT'],
      INSTANT_PAYOUT_RULES: {
        ELIGIBLE_METHODS: ['BANK_TRANSFER', 'WALLET_TRANSFER', 'MOBILE_MONEY', 'CRYPTO'], // Added BANK_TRANSFER for flexibility
        MAX_INSTANT_PAYOUT_AMOUNT: 10000, // Increased for larger transactions
        TRANSACTION_LIMIT_PER_DAY: 20, // Increased to allow more frequent payouts
        GATEWAY_AVAILABILITY: ['STRIPE', 'PAYPAL', 'COINBASE', 'SQUARE'], // Added SQUARE for broader coverage
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
          STRIPE: 0.015, // Reduced from 2% to 1.5%
          PAYPAL: 0.01, // Reduced from 1.5% to 1%
          COINBASE: 0.005, // Reduced from 1% to 0.5%
          SQUARE: 0.012 // Added SQUARE at 1.2%
        }
      }
    },
    TAX_COMPLIANCE: {
      TAX_TYPES: ['VAT', 'SALES_TAX', 'SERVICE_TAX'],
      DEFAULT_TAX_TYPE: 'VAT',
      TAX_CALCULATION_METHOD: 'EXCLUSIVE',
      TAX_EXEMPT_STATUSES: ['NON_PROFIT', 'GOVERNMENT', 'EXPORT', 'SMALL_BUSINESS'], // Added SMALL_BUSINESS for fairness
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
      FULL_REFUND_WINDOW_HOURS: 48, // Extended for merchant flexibility
      PARTIAL_REFUND_PERCENTAGE: 75, // Increased for fairness
      NON_REFUNDABLE_FEES: ['platform_fee', 'merchant_processing_fee']
    }
  },

  // Service-Specific Merchant Revenue Streams
  MERCHANT_REVENUE_STREAMS: {
    MTABLES: {
      MERCHANT_EARNINGS: {
        BASE_SHARE: 88, // Increased from 85% for competitiveness
        PREMIUM_SUBSCRIPTION_SHARE: 93, // Increased from 90%
        TRANSACTION_TYPES: ['BOOKING_PAYMENT', 'ORDER_PAYMENT', 'DEPOSIT'],
        EXCLUDED: ['tips', 'deposits'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 12, // Reduced from 15%
            PREMIUM_SUBSCRIPTION_PERCENTAGE: 7, // Reduced from 10%
            MIN_COMMISSION: 0.3, // Reduced
            MAX_COMMISSION: 40 // Reduced
          },
          MERCHANT_PROCESSING_FEE: 0.3, // Reduced from 0.5
          INSTANT_PAYOUT_FEE: {
            STRIPE: 0.015,
            PAYPAL: 0.01,
            COINBASE: 0.005,
            SQUARE: 0.012
          }
        },
        PAYOUT_RULES: {
          TIMING: 'post_transaction',
          FREQUENCY: ['INSTANT', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
          DEFAULT_FREQUENCY: 'WEEKLY',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['booking_volume', 'revenue', 'no_show_rate', 'customer_satisfaction']
    },
    MUNCH: {
      MERCHANT_EARNINGS: {
        BASE_SHARE: 85, // Increased from 80%
        PREMIUM_SUBSCRIPTION_SHARE: 90, // Increased from 85%
        TRANSACTION_TYPES: ['ORDER_PAYMENT', 'DELIVERY_PAYMENT'],
        EXCLUDED: ['tips', 'delivery_fee'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 15, // Reduced from 20%
            PREMIUM_SUBSCRIPTION_PERCENTAGE: 10, // Reduced from 15%
            MIN_COMMISSION: 0.5, // Reduced
            MAX_COMMISSION: 80 // Reduced
          },
          MERCHANT_PROCESSING_FEE: 0.2, // Reduced from 0.3
          INSTANT_PAYOUT_FEE: {
            STRIPE: 0.015,
            PAYPAL: 0.01,
            COINBASE: 0.005,
            SQUARE: 0.012
          }
        },
        PAYOUT_RULES: {
          TIMING: 'post_transaction',
          FREQUENCY: ['INSTANT', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
          DEFAULT_FREQUENCY: 'WEEKLY',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['order_volume', 'revenue', 'customer_retention', 'delivery_performance']
    },
    MTXI: {
      MERCHANT_EARNINGS: {
        BASE_SHARE: 90, // Increased from 87%
        PREMIUM_SUBSCRIPTION_SHARE: 95, // Increased from 92%
        TRANSACTION_TYPES: ['RIDE_PAYMENT'],
        EXCLUDED: ['tips'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 10, // Reduced from 13%
            PREMIUM_SUBSCRIPTION_PERCENTAGE: 5, // Reduced from 8%
            MIN_COMMISSION: 0.3, // Reduced
            MAX_COMMISSION: 20 // Reduced
          },
          MERCHANT_PROCESSING_FEE: 0.15, // Reduced from 0.2
          INSTANT_PAYOUT_FEE: {
            STRIPE: 0.015,
            PAYPAL: 0.01,
            COINBASE: 0.005,
            SQUARE: 0.012
          }
        },
        PAYOUT_RULES: {
          TIMING: 'post_transaction',
          FREQUENCY: ['INSTANT', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
          DEFAULT_FREQUENCY: 'WEEKLY',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['ride_volume', 'revenue', 'customer_retention', 'surge_pricing_impact']
    },
    MTICKETS: {
      MERCHANT_EARNINGS: {
        BASE_SHARE: 87, // Increased from 82%
        PREMIUM_SUBSCRIPTION_SHARE: 92, // Increased from 88%
        TRANSACTION_TYPES: ['TICKET_PURCHASE', 'GROUP_PAYMENT'],
        EXCLUDED: ['tips'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 13, // Reduced from 18%
            PREMIUM_SUBSCRIPTION_PERCENTAGE: 8, // Reduced from 12%
            MIN_COMMISSION: 0.5, // Reduced
            MAX_COMMISSION: 80 // Reduced
          },
          MERCHANT_PROCESSING_FEE: 0.3, // Reduced from 0.5
          INSTANT_PAYOUT_FEE: {
            STRIPE: 0.015,
            PAYPAL: 0.01,
            COINBASE: 0.005,
            SQUARE: 0.012
          }
        },
        PAYOUT_RULES: {
          TIMING: 'post_transaction',
          FREQUENCY: ['INSTANT', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
          DEFAULT_FREQUENCY: 'WEEKLY',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['ticket_sales', 'event_attendance', 'revenue', 'customer_satisfaction']
    },
    MSTAYS: {
      MERCHANT_EARNINGS: {
        BASE_SHARE: 88, // Increased from 85%
        PREMIUM_SUBSCRIPTION_SHARE: 93, // Increased from 90%
        TRANSACTION_TYPES: ['STAY_PAYMENT', 'DEPOSIT'],
        EXCLUDED: ['tips'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 12, // Reduced from 15%
            PREMIUM_SUBSCRIPTION_PERCENTAGE: 7, // Reduced from 10%
            MIN_COMMISSION: 0.5, // Reduced
            MAX_COMMISSION: 150 // Reduced
          },
          MERCHANT_PROCESSING_FEE: 0.3, // Reduced from 0.5
          INSTANT_PAYOUT_FEE: {
            STRIPE: 0.015,
            PAYPAL: 0.01,
            COINBASE: 0.005,
            SQUARE: 0.012
          }
        },
        PAYOUT_RULES: {
          TIMING: 'post_transaction',
          FREQUENCY: ['INSTANT', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
          DEFAULT_FREQUENCY: 'WEEKLY',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['occupancy_rate', 'revenue', 'guest_satisfaction', 'sustainability_impact']
    },
    MPARK: {
      MERCHANT_EARNINGS: {
        BASE_SHARE: 90, // Increased from 88%
        PREMIUM_SUBSCRIPTION_SHARE: 95, // Increased from 92%
        TRANSACTION_TYPES: ['PARKING_PAYMENT'],
        EXCLUDED: ['tips', 'deposits'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 10, // Reduced from 12%
            PREMIUM_SUBSCRIPTION_PERCENTAGE: 5, // Reduced from 8%
            MIN_COMMISSION: 0.3, // Reduced
            MAX_COMMISSION: 20 // Reduced
          },
          MERCHANT_PROCESSING_FEE: 0.15, // Reduced from 0.2
          INSTANT_PAYOUT_FEE: {
            STRIPE: 0.015,
            PAYPAL: 0.01,
            COINBASE: 0.005,
            SQUARE: 0.012
          }
        },
        PAYOUT_RULES: {
          TIMING: 'post_transaction',
          FREQUENCY: ['INSTANT', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
          DEFAULT_FREQUENCY: 'WEEKLY',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['occupancy_rate', 'revenue', 'booking_volume', 'peak_usage_hours']
    },
    MEVENTS: {
      MERCHANT_EARNINGS: {
        BASE_SHARE: 87, // Increased from 82%
        PREMIUM_SUBSCRIPTION_SHARE: 92, // Increased from 88%
        TRANSACTION_TYPES: ['EVENT_PAYMENT', 'TICKET_SOLD', 'CROWDFUNDING_PROCESSED'],
        EXCLUDED: ['tips', 'deposits'],
        DEDUCTIONS: {
          PLATFORM_COMMISSION: {
            BASE_PERCENTAGE: 13, // Reduced from 18%
            PREMIUM_SUBSCRIPTION_PERCENTAGE: 8, // Reduced from 12%
            MIN_COMMISSION: 3, // Reduced
            MAX_COMMISSION: 400 // Reduced
          },
          MERCHANT_PROCESSING_FEE: 0.5, // Reduced from 1
          INSTANT_PAYOUT_FEE: {
            STRIPE: 0.015,
            PAYPAL: 0.01,
            COINBASE: 0.005,
            SQUARE: 0.012
          }
        },
        PAYOUT_RULES: {
          TIMING: 'post_transaction',
          FREQUENCY: ['INSTANT', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
          DEFAULT_FREQUENCY: 'WEEKLY',
          TAX_APPLIED: true
        }
      },
      ANALYTICS_METRICS: ['event_volume', 'revenue', 'participant_engagement', 'ticket_sales']
    }
  },

  // Subscription Costs for Merchants
  SUBSCRIPTION_COSTS: {
    PLANS: [
      {
        NAME: 'Basic',
        FEE_REDUCTION_PERCENTAGE: 3, // Increased from 2%
        PRICE: {
          US: 8, GB: 6, EU: 7, CA: 10, AU: 9, MW: 1500, TZ: 20000, KE: 1200, MZ: 500, ZA: 120,
          IN: 600, CM: 5000, GH: 50, MX: 150, ER: 120 // Reduced prices
        },
        DURATION_DAYS: 30
      },
      {
        NAME: 'Premium',
        FEE_REDUCTION_PERCENTAGE: 6, // Increased from 5%
        PRICE: {
          US: 20, GB: 16, EU: 18, CA: 25, AU: 22, MW: 4000, TZ: 50000, KE: 3000, MZ: 1200, ZA: 300,
          IN: 1500, CM: 12000, GH: 120, MX: 400, ER: 300 // Reduced prices
        },
        DURATION_DAYS: 30
      },
      {
        NAME: 'Elite',
        FEE_REDUCTION_PERCENTAGE: 8, // Increased from 7%
        PRICE: {
          US: 40, GB: 32, EU: 36, CA: 50, AU: 45, MW: 8000, TZ: 100000, KE: 6000, MZ: 2500, ZA: 600,
          IN: 3000, CM: 25000, GH: 250, MX: 800, ER: 600 // Reduced prices
        },
        DURATION_DAYS: 30
      }
    ],
    PAYMENT_METHODS: ['CREDIT_CARD', 'DEBIT_CARD', 'DIGITAL_WALLET', 'CRYPTO'],
    PAYMENT_STATUSES: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    TAX_APPLIED: true
  },

  // Additional Merchant Costs
  ADDITIONAL_COSTS: {
    ADVERTISING: {
      BANNER_AD: {
        US: 40, GB: 32, EU: 36, CA: 50, AU: 45, MW: 8000, TZ: 100000, KE: 6000, MZ: 2500, ZA: 600,
        IN: 3000, CM: 25000, GH: 250, MX: 800, ER: 600 // Reduced
      },
      SPONSORED_LISTING: {
        US: 80, GB: 64, EU: 72, CA: 100, AU: 90, MW: 16000, TZ: 200000, KE: 12000, MZ: 5000, ZA: 1200,
        IN: 6000, CM: 50000, GH: 500, MX: 1600, ER: 1200 // Reduced
      },
      PUSH_NOTIFICATION: {
        US: 0.08, GB: 0.06, EU: 0.07, CA: 0.1, AU: 0.09, MW: 16, TZ: 200, KE: 12, MZ: 5, ZA: 1.2,
        IN: 6, CM: 50, GH: 0.5, MX: 1.6, ER: 1.2 // Reduced
      },
      APPLIES_TO: ['MTABLES', 'MUNCH', 'MEVENTS', 'MTICKETS', 'MSTAYS'],
      PAYMENT_TIMING: 'prepaid',
      TAX_APPLIED: true
    },
    LOYALTY_PROGRAM: {
      PARTICIPATION_FEE: {
        US: 4, GB: 3, EU: 3.5, CA: 5, AU: 4.5, MW: 800, TZ: 10000, KE: 600, MZ: 250, ZA: 60,
        IN: 300, CM: 2500, GH: 25, MX: 80, ER: 60 // Reduced
      },
      REWARD_REDEMPTION_FEE: {
        US: 0.4, GB: 0.3, EU: 0.35, CA: 0.5, AU: 0.45, MW: 80, TZ: 1000, KE: 60, MZ: 25, ZA: 6,
        IN: 30, CM: 250, GH: 2.5, MX: 8, ER: 6 // Reduced
      },
      APPLIES_TO: ['MTABLES', 'MUNCH', 'MEVENTS', 'MTICKETS', 'MSTAYS'],
      TAX_APPLIED: true
    },
    PREMIUM_ANALYTICS: {
      FEE: {
        US: 15, GB: 12, EU: 13, CA: 18, AU: 16, MW: 3000, TZ: 36000, KE: 2100, MZ: 900, ZA: 210,
        IN: 1200, CM: 9000, GH: 90, MX: 300, ER: 210 // Reduced
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
      LOYALTY_FEE: 'LOYALTY_FEE',
      INSTANT_PAYOUT_FAILED: 'INSTANT_PAYOUT_FAILED'
    },
    DELIVERY_METHODS: ['EMAIL', 'PUSH', 'WHATSAPP', 'TELEGRAM'],
    PRIORITY_LEVELS: ['LOW', 'MEDIUM', 'HIGH']
  },

  // Compliance and Audit
  COMPLIANCE_CONSTANTS: {
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_TYPES: ['payout_processed', 'commission_deduction', 'subscription_payment', 'advertising_payment', 'loyalty_fee', 'instant_payout'],
    AUDIT_LOG_RETENTION_DAYS: 365,
    TAX_REPORTING: {
      FREQUENCY: 'QUARTERLY',
      FORMATS: ['csv', 'json']
    }
  },

  // Error and Success Messages
  ERROR_CODES: [
    'INVALID_PAYOUT_AMOUNT', 'PAYMENT_FAILED', 'INSUFFICIENT_FUNDS', 'INVALID_SUBSCRIPTION_PLAN',
    'ADVERTISING_PAYMENT_FAILED', 'LOYALTY_FEE_FAILED', 'INSTANT_PAYOUT_NOT_AVAILABLE',
    'INSTANT_PAYOUT_LIMIT_EXCEEDED', 'BANKING_HOURS_RESTRICTION'
  ],
  SUCCESS_MESSAGES: [
    'PAYOUT_PROCESSED', 'COMMISSION_DEDUCTED', 'SUBSCRIPTION_ACTIVATED', 'ADVERTISING_PAYMENT_PROCESSED',
    'LOYALTY_FEE_PROCESSED', 'INSTANT_PAYOUT_PROCESSED'
  ]
};