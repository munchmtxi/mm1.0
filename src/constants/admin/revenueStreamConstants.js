'use strict';

/**
 * revenueStreamConstants.js
 *
 * Defines platform revenue streams from merchants, drivers, and customers for all services
 * (mtables, munch, mtxi, mtickets, mstays, mpark, mevents), assuming free app and web app usage.
 * Includes commissions, fees, and rules for deductions, integrated with localization and tax settings
 * for 15 supported countries. Ensures fair, transparent, and region-specific revenue distribution.
 *
 * Last Updated: July 18, 2025
 */

module.exports = {
  // General Revenue Settings
  REVENUE_SETTINGS: {
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'],
    COUNTRY_CURRENCY_MAP: {
      US: 'USD', GB: 'GBP', EU: 'EUR', CA: 'CAD', AU: 'AUD', MW: 'MWK', TZ: 'TZS', KE: 'KES', MZ: 'MZN',
      ZA: 'ZAR', IN: 'INR', CM: 'XAF', GH: 'GHS', MX: 'MXN', ER: 'ERN'
    },
    PAYOUT_PROCESSING_TIME_HOURS: {
      INSTANT: 0.5, // Aligned with merchant/driver settings
      DAILY: 24,
      WEEKLY: 168,
      BIWEEKLY: 336,
      MONTHLY: 720
    },
    MIN_PAYOUT_THRESHOLD: 2, // Lowered to align with merchant/driver settings
    MAX_PAYOUT_THRESHOLD: 15000, // Increased to align with merchant/driver settings
    AUDIT_FREQUENCY_DAYS: 90,
    TAX_COMPLIANCE: {
      TAX_TYPES: ['VAT', 'SALES_TAX', 'SERVICE_TAX'],
      DEFAULT_TAX_TYPE: 'VAT',
      TAX_CALCULATION_METHOD: 'EXCLUSIVE',
      TAX_EXEMPT_STATUSES: ['NON_PROFIT', 'GOVERNMENT', 'EXPORT', 'SMALL_BUSINESS', 'INDEPENDENT_CONTRACTOR'], // Added from merchant/driver
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
      FULL_REFUND_WINDOW_HOURS: 48, // Extended to align with merchant settings
      PARTIAL_REFUND_PERCENTAGE: 75, // Increased to align with merchant/driver settings
      NON_REFUNDABLE_FEES: ['platform_fee', 'processing_fee'] // Generalized term
    },
    LOCALIZATION: {
      DYNAMIC_CURRENCY_CONVERSION: true,
      NUMBER_FORMATS: {
        DECIMAL_SEPARATOR: { US: '.', CA: '.', AU: '.', MW: '.', TZ: '.', KE: '.', ZA: '.', IN: '.', GH: '.', MX: '.', ER: '.', others: ',' },
        THOUSAND_SEPARATOR: { US: ',', CA: ',', AU: ',', MW: ',', TZ: ',', KE: ',', IN: ',', GH: ',', MX: ',', ER: ',', others: '.' }
      }
    }
  },

  // Service-Specific Revenue Streams
  REVENUE_STREAMS: {
    MTABLES: {
      PLATFORM_REVENUE: {
        MERCHANT_COMMISSION: {
          BASE_PERCENTAGE: 12, // Reduced from 15% to align with merchant settings
          PREMIUM_SUBSCRIPTION_PERCENTAGE: 7, // Reduced from 10%
          MIN_COMMISSION: 0.3, // Reduced
          MAX_COMMISSION: 40, // Reduced
          APPLIES_TO: ['BOOKING_PAYMENT', 'ORDER_PAYMENT', 'DEPOSIT'], // Aligned with merchant settings
          EXCLUDED: ['tips', 'deposits'],
          DEDUCTION_RULES: {
            TIMING: 'at_transaction',
            FREQUENCY: 'per_booking',
            REFUNDABLE: false,
            CONDITIONS: {
              NO_SHOW: 50,
              CANCELLATION_WITHIN_48H: 0 // Extended to 48 hours
            },
            TAX_APPLIED: true
          }
        },
        CUSTOMER_PLATFORM_FEE: {
          AMOUNT: 1.5, // Reduced from 2
          APPLIES_TO: ['BOOKING_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        MERCHANT_PROCESSING_FEE: {
          AMOUNT: 0.3, // Reduced from 0.5
          APPLIES_TO: ['BOOKING_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: false
        }
      },
      REVENUE_DISTRIBUTION: {
        MERCHANT: 88, // Increased from 85% to align with merchant settings
        CUSTOMER: 0,
        DRIVER: 0,
        PLATFORM: 12 // 12% commission + fees + tax
      },
      ANALYTICS_METRICS: ['booking_volume', 'commission_earned', 'no_show_rate', 'fee_revenue', 'customer_satisfaction']
    },
    MUNCH: {
      PLATFORM_REVENUE: {
        MERCHANT_COMMISSION: {
          BASE_PERCENTAGE: 15, // Reduced from 20%
          PREMIUM_SUBSCRIPTION_PERCENTAGE: 10, // Reduced from 15%
          MIN_COMMISSION: 0.5, // Reduced
          MAX_COMMISSION: 80, // Reduced
          APPLIES_TO: ['ORDER_PAYMENT', 'DELIVERY_PAYMENT'],
          EXCLUDED: ['tips', 'delivery_fee'],
          DEDUCTION_RULES: {
            TIMING: 'at_transaction',
            FREQUENCY: 'per_order',
            REFUNDABLE: false,
            CONDITIONS: {
              CANCELLATION_WITHIN_5MIN: 0,
              DELIVERY_FAILED: 50
            },
            TAX_APPLIED: true
          }
        },
        DRIVER_COMMISSION: {
          BASE_PERCENTAGE: 10, // Aligned with driver settings
          MIN_COMMISSION: 0.3, // Reduced
          MAX_COMMISSION: 8, // Reduced
          APPLIES_TO: ['DELIVERY_PAYMENT'],
          DEDUCTION_RULES: {
            TIMING: 'at_delivery_completion',
            FREQUENCY: 'per_delivery',
            REFUNDABLE: false,
            CONDITIONS: {
              DELAYED_DELIVERY: 50,
              CANCELLED_BY_DRIVER: 0
            },
            TAX_APPLIED: true
          }
        },
        CUSTOMER_PLATFORM_FEE: {
          AMOUNT: 1, // Reduced from 1.5
          APPLIES_TO: ['ORDER_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        CUSTOMER_DELIVERY_FEE: {
          BASE_AMOUNT: 2.5, // Reduced from 3
          DISTANCE_BASED: 0.4, // Reduced from 0.5
          APPLIES_TO: ['DELIVERY_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        MERCHANT_PROCESSING_FEE: {
          AMOUNT: 0.2, // Reduced from 0.3
          APPLIES_TO: ['ORDER_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: false
        }
      },
      REVENUE_DISTRIBUTION: {
        MERCHANT: 85, // Increased from 80%
        DRIVER: 80, // Increased from 70% to align with driver settings
        CUSTOMER: 0,
        PLATFORM: 25 // 15% merchant commission + 10% driver commission + fees + tax
      },
      ANALYTICS_METRICS: ['order_volume', 'delivery_fee_revenue', 'commission_earned', 'fee_revenue', 'delivery_performance']
    },
    MTXI: {
      PLATFORM_REVENUE: {
        DRIVER_COMMISSION: {
          BASE_PERCENTAGE: 15, // Reduced from 20% to align with driver settings
          PREMIUM_RIDE_PERCENTAGE: 10, // Reduced from 15%
          MIN_COMMISSION: 0.5, // Reduced
          MAX_COMMISSION: 20, // Reduced
          APPLIES_TO: ['RIDE_PAYMENT'],
          EXCLUDED: ['tips'],
          DEDUCTION_RULES: {
            TIMING: 'at_ride_completion',
            FREQUENCY: 'per_ride',
            REFUNDABLE: false,
            CONDITIONS: {
              CANCELLATION_WITHIN_5MIN: 0,
              DELAYED_PICKUP: 50
            },
            TAX_APPLIED: true
          }
        },
        CUSTOMER_PLATFORM_FEE: {
          AMOUNT: 0.8, // Reduced from 1
          APPLIES_TO: ['RIDE_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        DRIVER_PROCESSING_FEE: {
          AMOUNT: 0.15, // Reduced from 0.2
          APPLIES_TO: ['RIDE_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: false
        }
      },
      REVENUE_DISTRIBUTION: {
        MERCHANT: 0,
        DRIVER: 85, // Increased from 80% to align with driver settings
        CUSTOMER: 0,
        PLATFORM: 15 // 15% commission + fees + tax
      },
      ANALYTICS_METRICS: ['ride_volume', 'completion_rate', 'commission_earned', 'fee_revenue', 'customer_satisfaction']
    },
    MTICKETS: {
      PLATFORM_REVENUE: {
        MERCHANT_COMMISSION: {
          BASE_PERCENTAGE: 13, // Reduced from 18% to align with merchant settings
          PREMIUM_SUBSCRIPTION_PERCENTAGE: 8, // Reduced from 12%
          MIN_COMMISSION: 0.5, // Reduced
          MAX_COMMISSION: 80, // Reduced
          APPLIES_TO: ['TICKET_PURCHASE', 'GROUP_PAYMENT'],
          EXCLUDED: ['tips'],
          DEDUCTION_RULES: {
            TIMING: 'at_transaction',
            FREQUENCY: 'per_ticket',
            REFUNDABLE: false,
            CONDITIONS: {
              CANCELLATION_WITHIN_48H: 0, // Extended to 48 hours
              NO_SHOW: 50
            },
            TAX_APPLIED: true
          }
        },
        CUSTOMER_PLATFORM_FEE: {
          AMOUNT: 2, // Reduced from 3 (assumed)
          APPLIES_TO: ['TICKET_PURCHASE'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        MERCHANT_PROCESSING_FEE: {
          AMOUNT: 0.3, // Reduced from 0.5
          APPLIES_TO: ['TICKET_PURCHASE'],
          REFUNDABLE: false,
          TAX_APPLIED: false
        }
      },
      REVENUE_DISTRIBUTION: {
        MERCHANT: 87, // Increased from 82% to align with merchant settings
        DRIVER: 0,
        CUSTOMER: 0,
        PLATFORM: 13 // 13% commission + fees + tax
      },
      ANALYTICS_METRICS: ['ticket_sales', 'commission_earned', 'fee_revenue', 'event_attendance']
    },
    MSTAYS: {
      PLATFORM_REVENUE: {
        MERCHANT_COMMISSION: {
          BASE_PERCENTAGE: 12, // Reduced from 15% to align with merchant settings
          PREMIUM_SUBSCRIPTION_PERCENTAGE: 7, // Reduced from 10%
          MIN_COMMISSION: 0.5, // Reduced
          MAX_COMMISSION: 150, // Reduced
          APPLIES_TO: ['STAY_PAYMENT', 'DEPOSIT'],
          EXCLUDED: ['tips'],
          DEDUCTION_RULES: {
            TIMING: 'at_transaction',
            FREQUENCY: 'per_booking',
            REFUNDABLE: false,
            CONDITIONS: {
              CANCELLATION_WITHIN_48H: 0, // Extended to 48 hours
              NO_SHOW: 50
            },
            TAX_APPLIED: true
          }
        },
        CUSTOMER_PLATFORM_FEE: {
          AMOUNT: 3, // Reduced from 4 (assumed)
          APPLIES_TO: ['STAY_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        MERCHANT_PROCESSING_FEE: {
          AMOUNT: 0.3, // Reduced from 0.5
          APPLIES_TO: ['STAY_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: false
        }
      },
      REVENUE_DISTRIBUTION: {
        MERCHANT: 88, // Increased from 85% to align with merchant settings
        DRIVER: 0,
        CUSTOMER: 0,
        PLATFORM: 12 // 12% commission + fees + tax
      },
      ANALYTICS_METRICS: ['occupancy_rate', 'commission_earned', 'fee_revenue', 'guest_satisfaction']
    },
    MPARK: {
      PLATFORM_REVENUE: {
        MERCHANT_COMMISSION: {
          BASE_PERCENTAGE: 10, // Reduced from 12%
          PREMIUM_SUBSCRIPTION_PERCENTAGE: 5, // Reduced from 8%
          MIN_COMMISSION: 0.3, // Reduced
          MAX_COMMISSION: 20, // Reduced
          APPLIES_TO: ['PARKING_PAYMENT'],
          EXCLUDED: ['deposits'],
          DEDUCTION_RULES: {
            TIMING: 'at_transaction',
            FREQUENCY: 'per_booking',
            REFUNDABLE: false,
            CONDITIONS: {
              NO_SHOW: 50,
              CANCELLATION_WITHIN_1H: 0
            },
            TAX_APPLIED: true
          }
        },
        CUSTOMER_PLATFORM_FEE: {
          AMOUNT: 0.8, // Reduced from 1
          APPLIES_TO: ['PARKING_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        MERCHANT_PROCESSING_FEE: {
          AMOUNT: 0.15, // Reduced from 0.2
          APPLIES_TO: ['PARKING_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: false
        }
      },
      REVENUE_DISTRIBUTION: {
        MERCHANT: 90, // Increased from 88%
        DRIVER: 0,
        CUSTOMER: 0,
        PLATFORM: 10 // 10% commission + fees + tax
      },
      ANALYTICS_METRICS: ['occupancy_rate', 'booking_volume', 'commission_earned', 'fee_revenue']
    },
    MEVENTS: {
      PLATFORM_REVENUE: {
        MERCHANT_COMMISSION: {
          BASE_PERCENTAGE: 13, // Reduced from 18%
          PREMIUM_SUBSCRIPTION_PERCENTAGE: 8, // Reduced from 12%
          MIN_COMMISSION: 3, // Reduced
          MAX_COMMISSION: 400, // Reduced
          APPLIES_TO: ['EVENT_PAYMENT', 'TICKET_SOLD', 'CROWDFUNDING_PROCESSED'],
          EXCLUDED: ['tips', 'deposits'],
          DEDUCTION_RULES: {
            TIMING: 'at_transaction',
            FREQUENCY: 'per_event',
            REFUNDABLE: false,
            CONDITIONS: {
              CANCELLATION_WITHIN_48H: 0, // Extended to 48 hours
              EVENT_PARTIAL_COMPLETION: 50
            },
            TAX_APPLIED: true
          }
        },
        DRIVER_COMMISSION: {
          BASE_PERCENTAGE: 10, // Aligned with driver settings
          MIN_COMMISSION: 0.5, // Reduced
          MAX_COMMISSION: 15, // Reduced
          APPLIES_TO: ['EVENT_DELIVERY_PAYMENT'],
          DEDUCTION_RULES: {
            TIMING: 'at_delivery_completion',
            FREQUENCY: 'per_delivery',
            REFUNDABLE: false,
            CONDITIONS: {
              DELAYED_DELIVERY: 50,
              CANCELLED_BY_DRIVER: 0
            },
            TAX_APPLIED: true
          }
        },
        CUSTOMER_PLATFORM_FEE: {
          AMOUNT: 4, // Reduced from 5
          APPLIES_TO: ['EVENT_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        CUSTOMER_DELIVERY_FEE: {
          AMOUNT: 4, // Reduced from 5
          APPLIES_TO: ['EVENT_DELIVERY_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        MERCHANT_PROCESSING_FEE: {
          AMOUNT: 0.5, // Reduced from 1
          APPLIES_TO: ['EVENT_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: false
        }
      },
      REVENUE_DISTRIBUTION: {
        MERCHANT: 87, // Increased from 82%
        DRIVER: 80, // Increased from 70%
        CUSTOMER: 0,
        PLATFORM: 23 // 13% merchant commission + 10% driver commission + fees + tax
      },
      ANALYTICS_METRICS: ['event_volume', 'participant_engagement', 'commission_earned', 'fee_revenue', 'ticket_sales']
    }
  },

  // Subscription-Based Revenue
  SUBSCRIPTION_REVENUE: {
    PLANS: [
      {
        NAME: 'Basic',
        MERCHANT_FEE_REDUCTION_PERCENTAGE: 3, // Increased from 2%
        PRICE: {
          US: 8, GB: 6, EU: 7, CA: 10, AU: 9, MW: 1500, TZ: 20000, KE: 1200, MZ: 500, ZA: 120,
          IN: 600, CM: 5000, GH: 50, MX: 150, ER: 120 // Reduced prices
        },
        DURATION_DAYS: 30
      },
      {
        NAME: 'Premium',
        MERCHANT_FEE_REDUCTION_PERCENTAGE: 6, // Increased from 5%
        PRICE: {
          US: 20, GB: 16, EU: 18, CA: 25, AU: 22, MW: 4000, TZ: 50000, KE: 3000, MZ: 1200, ZA: 300,
          IN: 1500, CM: 12000, GH: 120, MX: 400, ER: 300 // Reduced prices
        },
        DURATION_DAYS: 30
      },
      {
        NAME: 'Elite',
        MERCHANT_FEE_REDUCTION_PERCENTAGE: 8, // Increased from 7%
        PRICE: {
          US: 40, GB: 32, EU: 36, CA: 50, AU: 45, MW: 8000, TZ: 100000, KE: 6000, MZ: 2500, ZA: 600,
          IN: 3000, CM: 25000, GH: 250, MX: 800, ER: 600 // Reduced prices
        },
        DURATION_DAYS: 30
      }
    ],
    PAYMENT_METHODS: ['CREDIT_CARD', 'DEBIT_CARD', 'DIGITAL_WALLET', 'CRYPTO'],
    PAYMENT_STATUSES: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    REFUND_POLICY: {
      WINDOW_DAYS: 7,
      PARTIAL_REFUND_PERCENTAGE: 50
    },
    TAX_APPLIED: true,
    ANALYTICS_METRICS: ['subscription_revenue', 'churn_rate', 'upgrade_rate']
  },

  // Additional Revenue Streams
  ADDITIONAL_REVENUE: {
    ADVERTISING: {
      TYPES: ['banner_ads', 'sponsored_listings', 'push_notifications'],
      MERCHANT_COST: {
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
        }
      },
      APPLIES_TO: ['MTABLES', 'MUNCH', 'MEVENTS', 'MTICKETS', 'MSTAYS'],
      PAYMENT_TIMING: 'prepaid',
      TAX_APPLIED: true
    },
    LOYALTY_PROGRAM: {
      MERCHANT_FEE: {
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
      MERCHANT_FEE: {
        US: 15, GB: 12, EU: 13, CA: 18, AU: 16, MW: 3000, TZ: 36000, KE: 2100, MZ: 900, ZA: 210,
        IN: 1200, CM: 9000, GH: 90, MX: 300, ER: 210 // Reduced
      },
      APPLIES_TO: ['merchants'],
      METRICS: ['customer_insights', 'predictive_trends', 'competitor_analysis'],
      TAX_APPLIED: true
    }
  },

  // Notifications
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: {
      COMMISSION_DEDUCTED: 'COMMISSION_DEDUCTED',
      FEE_CHARGED: 'FEE_CHARGED',
      SUBSCRIPTION_PAYMENT: 'SUBSCRIPTION_PAYMENT',
      ADVERTISING_PAYMENT: 'ADVERTISING_PAYMENT',
      LOYALTY_FEE: 'LOYALTY_FEE',
      TAX_CALCULATED: 'TAX_CALCULATED',
      INSTANT_PAYOUT_FAILED: 'INSTANT_PAYOUT_FAILED' // Added for instant payout issues
    },
    DELIVERY_METHODS: ['EMAIL', 'PUSH', 'WHATSAPP', 'TELEGRAM'],
    PRIORITY_LEVELS: ['LOW', 'MEDIUM', 'HIGH'] // Added HIGH for instant payout failures
  },

  // Compliance and Audit
  COMPLIANCE_CONSTANTS: {
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_TYPES: [
      'commission_deduction', 'payout_processed', 'refund_processed', 'subscription_payment',
      'advertising_payment', 'loyalty_fee', 'tax_calculated', 'instant_payout'
    ],
    AUDIT_LOG_RETENTION_DAYS: 365,
    TAX_REPORTING: {
      FREQUENCY: 'QUARTERLY',
      FORMATS: ['csv', 'json']
    }
  },

  // Error Codes
  ERROR_CODES: [
    'INVALID_COMMISSION_RATE', 'PAYMENT_FAILED', 'REFUND_NOT_ALLOWED', 'INSUFFICIENT_FUNDS',
    'INVALID_SUBSCRIPTION_PLAN', 'ADVERTISING_PAYMENT_FAILED', 'LOYALTY_FEE_FAILED',
    'INVALID_TAX_RATE', 'TAX_CALCULATION_FAILED', 'INSTANT_PAYOUT_NOT_AVAILABLE',
    'INSTANT_PAYOUT_LIMIT_EXCEEDED', 'BANKING_HOURS_RESTRICTION'
  ],

  // Success Messages
  SUCCESS_MESSAGES: [
    'COMMISSION_DEDUCTED', 'FEE_CHARGED', 'SUBSCRIPTION_ACTIVATED', 'ADVERTISING_PAYMENT_PROCESSED',
    'LOYALTY_FEE_PROCESSED', 'TAX_CALCULATED', 'INSTANT_PAYOUT_PROCESSED'
  ]
};