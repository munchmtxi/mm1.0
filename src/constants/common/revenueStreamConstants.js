'use strict';

/**
 * revenueStreamConstants.js
 *
 * Defines platform revenue streams from merchants, drivers, and customers for all services
 * (mtables, munch, mtxi, mevents, mpark), assuming free app and web app usage. Includes
 * commissions, fees, and rules for deductions, integrated with localization and tax settings
 * for 15 supported countries. Ensures fair, transparent, and region-specific revenue distribution.
 *
 * Last Updated: June 25, 2025
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
    PAYOUT_PROCESSING_TIME_HOURS: 24,
    MIN_PAYOUT_THRESHOLD: 5,
    MAX_PAYOUT_THRESHOLD: 10000,
    AUDIT_FREQUENCY_DAYS: 90,
    TAX_COMPLIANCE: {
      TAX_TYPES: ['VAT', 'SALES_TAX', 'SERVICE_TAX'],
      DEFAULT_TAX_TYPE: 'VAT',
      TAX_CALCULATION_METHOD: 'EXCLUSIVE', // Taxes added to transaction total
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
      FULL_REFUND_WINDOW_HOURS: 12, // Full refund (excl. fees) within 12 hours
      PARTIAL_REFUND_PERCENTAGE: 50, // 50% refund after window
      NON_REFUNDABLE_FEES: ['platform_fee', 'commission']
    },
    LOCALIZATION: {
      DYNAMIC_CURRENCY_CONVERSION: true, // Convert fees to local currency
      NUMBER_FORMATS: {
        DECIMAL_SEPARATOR: { US: '.', CA: '.', AU: '.', others: ',' },
        THOUSAND_SEPARATOR: { US: ',', CA: ',', AU: ',', others: '.' }
      }
    }
  },

  // Service-Specific Revenue Streams
  REVENUE_STREAMS: {
    // mtables (Table Bookings)
    MTABLES: {
      PLATFORM_REVENUE: {
        MERCHANT_COMMISSION: {
          BASE_PERCENTAGE: 15, // 15% of booking total (excl. taxes)
          PREMIUM_SUBSCRIPTION_PERCENTAGE: 10, // 10% for premium merchants
          MIN_COMMISSION: 1, // $1 min per booking
          MAX_COMMISSION: 50, // $50 max per booking
          APPLIES_TO: ['BOOKING_PAYMENT', 'pre_order_payment'],
          EXCLUDED: ['tips', 'deposits'],
          DEDUCTION_RULES: {
            TIMING: 'at_transaction',
            FREQUENCY: 'per_booking',
            REFUNDABLE: false,
            CONDITIONS: {
              NO_SHOW: 50, // Retain 50% commission on no-shows
              CANCELLATION_WITHIN_12H: 0 // No commission if cancelled within 12 hours
            },
            TAX_APPLIED: true // Add applicable tax (e.g., 7% SALES_TAX in US)
          }
        },
        CUSTOMER_PLATFORM_FEE: {
          AMOUNT: 2, // $2 per booking (converted to local currency)
          APPLIES_TO: ['BOOKING_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        MERCHANT_PROCESSING_FEE: {
          AMOUNT: 0.5, // $0.5 per transaction
          APPLIES_TO: ['BOOKING_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: false
        }
      },
      REVENUE_DISTRIBUTION: {
        MERCHANT: 85, // 85% of booking total (after commission)
        CUSTOMER: 0, // Pays platform fee + tax
        DRIVER: 0, // No driver involvement
        PLATFORM: 15 // 15% commission + fees + tax
      },
      ANALYTICS_METRICS: ['booking_volume', 'commission_earned', 'no_show_rate', 'fee_revenue']
    },

    // munch (Food Orders)
    MUNCH: {
      PLATFORM_REVENUE: {
        MERCHANT_COMMISSION: {
          BASE_PERCENTAGE: 20, // 20% of order total (excl. taxes)
          PREMIUM_SUBSCRIPTION_PERCENTAGE: 15, // 15% for premium merchants
          MIN_COMMISSION: 1,
          MAX_COMMISSION: 100,
          APPLIES_TO: ['ORDER_PAYMENT', 'delivery_payment'],
          EXCLUDED: ['tips', 'delivery_fee'],
          DEDUCTION_RULES: {
            TIMING: 'at_transaction',
            FREQUENCY: 'per_order',
            REFUNDABLE: false,
            CONDITIONS: {
              CANCELLATION_WITHIN_5MIN: 0, // No commission if cancelled within 5 minutes
              DELIVERY_FAILED: 50 // Retain 50% commission if delivery fails
            },
            TAX_APPLIED: true
          }
        },
        DRIVER_COMMISSION: {
          BASE_PERCENTAGE: 10, // 10% of delivery fee
          MIN_COMMISSION: 0.5,
          MAX_COMMISSION: 10,
          APPLIES_TO: ['delivery_payment'],
          DEDUCTION_RULES: {
            TIMING: 'at_delivery_completion',
            FREQUENCY: 'per_delivery',
            REFUNDABLE: false,
            CONDITIONS: {
              DELAYED_DELIVERY: 50, // Retain 50% commission if delayed > 30 minutes
              CANCELLED_BY_DRIVER: 0 // No commission if driver cancels
            },
            TAX_APPLIED: true
          }
        },
        CUSTOMER_PLATFORM_FEE: {
          AMOUNT: 1.5, // $1.5 per order
          APPLIES_TO: ['ORDER_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        CUSTOMER_DELIVERY_FEE: {
          BASE_AMOUNT: 3, // $3 base fee
          DISTANCE_BASED: 0.5, // $0.5 per km beyond 5 km
          APPLIES_TO: ['delivery_payment'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        MERCHANT_PROCESSING_FEE: {
          AMOUNT: 0.3, // $0.3 per transaction
          APPLIES_TO: ['ORDER_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: false
        }
      },
      REVENUE_DISTRIBUTION: {
        MERCHANT: 80, // 80% of order total (after commission)
        DRIVER: 70, // 70% of delivery fee (after commission)
        CUSTOMER: 0, // Pays platform and delivery fees + tax
        PLATFORM: 30 // 20% merchant commission + 10% driver commission + fees + tax
      },
      ANALYTICS_METRICS: ['order_volume', 'delivery_fee_revenue', 'commission_earned', 'fee_revenue']
    },

    // mtxi (Ride Requests)
    MTXI: {
      PLATFORM_REVENUE: {
        DRIVER_COMMISSION: {
          BASE_PERCENTAGE: 20, // 20% of ride fare
          PREMIUM_RIDE_PERCENTAGE: 15, // 15% for premium rides
          MIN_COMMISSION: 1,
          MAX_COMMISSION: 25,
          APPLIES_TO: ['RIDE_PAYMENT'],
          EXCLUDED: ['tips'],
          DEDUCTION_RULES: {
            TIMING: 'at_ride_completion',
            FREQUENCY: 'per_ride',
            REFUNDABLE: false,
            CONDITIONS: {
              CANCELLATION_WITHIN_5MIN: 0, // No commission if cancelled within 5 minutes
              DELAYED_PICKUP: 50 // Retain 50% commission if pickup delayed > 7 minutes
            },
            TAX_APPLIED: true
          }
        },
        CUSTOMER_PLATFORM_FEE: {
          AMOUNT: 1, // $1 per ride
          APPLIES_TO: ['RIDE_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        DRIVER_PROCESSING_FEE: {
          AMOUNT: 0.2, // $0.2 per transaction
          APPLIES_TO: ['RIDE_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: false
        }
      },
      REVENUE_DISTRIBUTION: {
        MERCHANT: 0, // No merchant involvement
        DRIVER: 80, // 80% of ride fare (after commission)
        CUSTOMER: 0, // Pays platform fee + tax
        PLATFORM: 20 // 20% commission + fees + tax
      },
      ANALYTICS_METRICS: ['ride_volume', 'completion_rate', 'commission_earned', 'fee_revenue']
    },

    // mevents (Event Services)
    MEVENTS: {
      PLATFORM_REVENUE: {
        MERCHANT_COMMISSION: {
          BASE_PERCENTAGE: 18, // 18% of event total (excl. taxes)
          PREMIUM_SUBSCRIPTION_PERCENTAGE: 12, // 12% for premium merchants
          MIN_COMMISSION: 5,
          MAX_COMMISSION: 500,
          APPLIES_TO: ['EVENT_PAYMENT'],
          EXCLUDED: ['tips', 'deposits'],
          DEDUCTION_RULES: {
            TIMING: 'at_transaction',
            FREQUENCY: 'per_event',
            REFUNDABLE: false,
            CONDITIONS: {
              CANCELLATION_WITHIN_12H: 0, // No commission if cancelled within 12 hours
              EVENT_PARTIAL_COMPLETION: 50 // Retain 50% commission if partially completed
            },
            TAX_APPLIED: true
          }
        },
        DRIVER_COMMISSION: {
          BASE_PERCENTAGE: 10, // 10% of event delivery fee
          MIN_COMMISSION: 1,
          MAX_COMMISSION: 20,
          APPLIES_TO: ['event_delivery_payment'],
          DEDUCTION_RULES: {
            TIMING: 'at_delivery_completion',
            FREQUENCY: 'per_delivery',
            REFUNDABLE: false,
            CONDITIONS: {
              DELAYED_DELIVERY: 50, // Retain 50% commission if delayed > 20 minutes
              CANCELLED_BY_DRIVER: 0 // No commission if driver cancels
            },
            TAX_APPLIED: true
          }
        },
        CUSTOMER_PLATFORM_FEE: {
          AMOUNT: 5, // $5 per event booking
          APPLIES_TO: ['EVENT_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        CUSTOMER_DELIVERY_FEE: {
          AMOUNT: 5, // $5 base delivery fee
          APPLIES_TO: ['event_delivery_payment'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        MERCHANT_PROCESSING_FEE: {
          AMOUNT: 1, // $1 per transaction
          APPLIES_TO: ['EVENT_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: false
        }
      },
      REVENUE_DISTRIBUTION: {
        MERCHANT: 82, // 82% of event total (after commission)
        DRIVER: 70, // 70% of delivery fee (after commission)
        CUSTOMER: 0, // Pays platform and delivery fees + tax
        PLATFORM: 28 // 18% merchant commission + 10% driver commission + fees + tax
      },
      ANALYTICS_METRICS: ['event_volume', 'participant_engagement', 'commission_earned', 'fee_revenue']
    },

    // mpark (Parking Services)
    MPARK: {
      PLATFORM_REVENUE: {
        MERCHANT_COMMISSION: {
          BASE_PERCENTAGE: 12, // 12% of parking booking total (excl. taxes)
          PREMIUM_SUBSCRIPTION_PERCENTAGE: 8, // 8% for premium merchants
          MIN_COMMISSION: 0.5,
          MAX_COMMISSION: 25,
          APPLIES_TO: ['PARKING_PAYMENT'],
          EXCLUDED: ['deposits'],
          DEDUCTION_RULES: {
            TIMING: 'at_transaction',
            FREQUENCY: 'per_booking',
            REFUNDABLE: false,
            CONDITIONS: {
              NO_SHOW: 50, // Retain 50% commission on no-shows
              CANCELLATION_WITHIN_1H: 0 // No commission if cancelled within 1 hour
            },
            TAX_APPLIED: true
          }
        },
        CUSTOMER_PLATFORM_FEE: {
          AMOUNT: 1, // $1 per parking booking
          APPLIES_TO: ['PARKING_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: true
        },
        MERCHANT_PROCESSING_FEE: {
          AMOUNT: 0.2, // $0.2 per transaction
          APPLIES_TO: ['PARKING_PAYMENT'],
          REFUNDABLE: false,
          TAX_APPLIED: false
        }
      },
      REVENUE_DISTRIBUTION: {
        MERCHANT: 88, // 88% of parking total (after commission)
        DRIVER: 0, // No driver involvement
        CUSTOMER: 0, // Pays platform fee + tax
        PLATFORM: 12 // 12% commission + fees + tax
      },
      ANALYTICS_METRICS: ['occupancy_rate', 'booking_volume', 'commission_earned', 'fee_revenue']
    }
  },

  // Subscription-Based Revenue
  SUBSCRIPTION_REVENUE: {
    PLANS: [
      {
        NAME: 'Basic',
        MERCHANT_FEE_REDUCTION_PERCENTAGE: 2, // Reduces commission by 2% (e.g., 15% to 13% for mtables)
        PRICE: { // Dynamic pricing in local currency
          US: 10, GB: 8, EU: 9, CA: 12, AU: 11, MW: 2000, TZ: 25000, KE: 1500, MZ: 600, ZA: 150,
          IN: 800, CM: 6000, GH: 60, MX: 200, ER: 150
        },
        DURATION_DAYS: 30
      },
      {
        NAME: 'Premium',
        MERCHANT_FEE_REDUCTION_PERCENTAGE: 5, // Reduces commission by 5% (e.g., 15% to 10% for mtables)
        PRICE: {
          US: 25, GB: 20, EU: 22, CA: 30, AU: 28, MW: 5000, TZ: 60000, KE: 3500, MZ: 1500, ZA: 350,
          IN: 2000, CM: 15000, GH: 150, MX: 500, ER: 350
        },
        DURATION_DAYS: 30
      },
      {
        NAME: 'Elite',
        MERCHANT_FEE_REDUCTION_PERCENTAGE: 7, // Reduces commission by 7% (e.g., 15% to 8% for mtables)
        PRICE: {
          US: 50, GB: 40, EU: 45, CA: 60, AU: 55, MW: 10000, TZ: 120000, KE: 7000, MZ: 3000, ZA: 700,
          IN: 4000, CM: 30000, GH: 300, MX: 1000, ER: 700
        },
        DURATION_DAYS: 30
      }
    ],
    PAYMENT_METHODS: ['credit_card', 'debit_card', 'digital_wallet', 'crypto'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    REFUND_POLICY: {
      WINDOW_DAYS: 7, // Full refund within 7 days
      PARTIAL_REFUND_PERCENTAGE: 50 // 50% refund after 7 days
    },
    TAX_APPLIED: true, // Apply local tax (e.g., 20% VAT in GB)
    ANALYTICS_METRICS: ['subscription_revenue', 'churn_rate', 'upgrade_rate']
  },

  // Additional Revenue Streams
  ADDITIONAL_REVENUE: {
    ADVERTISING: {
      TYPES: ['banner_ads', 'sponsored_listings', 'push_notifications'],
      MERCHANT_COST: { // Weekly costs in local currency
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
        }
      },
      APPLIES_TO: ['mtables', 'munch', 'mevents'],
      PAYMENT_TIMING: 'prepaid',
      TAX_APPLIED: true
    },
    LOYALTY_PROGRAM: {
      MERCHANT_FEE: {
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
      MERCHANT_FEE: {
        US: 20, GB: 16, EU: 18, CA: 24, AU: 22, MW: 4000, TZ: 48000, KE: 2800, MZ: 1200, ZA: 280,
        IN: 1600, CM: 12000, GH: 120, MX: 400, ER: 280
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
      TAX_CALCULATED: 'TAX_CALCULATED'
    },
    DELIVERY_METHODS: ['EMAIL', 'PUSH', 'WHATSAPP', 'TELEGRAM'],
    PRIORITY_LEVELS: ['LOW', 'MEDIUM']
  },

  // Compliance and Audit
  COMPLIANCE_CONSTANTS: {
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_TYPES: [
      'commission_deduction', 'payout_processed', 'refund_processed', 'subscription_payment',
      'advertising_payment', 'loyalty_fee', 'tax_calculated'
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
    'INVALID_TAX_RATE', 'TAX_CALCULATION_FAILED'
  ],

  // Success Messages
  SUCCESS_MESSAGES: [
    'COMMISSION_DEDUCTED', 'FEE_CHARGED', 'SUBSCRIPTION_ACTIVATED', 'ADVERTISING_PAYMENT_PROCESSED',
    'LOYALTY_FEE_PROCESSED', 'TAX_CALCULATED'
  ]
};