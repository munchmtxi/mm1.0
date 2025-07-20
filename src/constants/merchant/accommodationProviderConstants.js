'use strict';

module.exports = {
  MERCHANT_TYPE: 'accommodation_provider',
  BUSINESS_SETTINGS: {
    DEFAULT_BOOKINGS_ENABLED: true,
    DEFAULT_DELIVERY_ENABLED: false,
    DEFAULT_PICKUP_ENABLED: false,
    DEFAULT_PREP_TIME_MINUTES: 30,
    DEFAULT_UI: 'generic',
    DEFAULT_SERVICES: ['mstays'],
    AI_ENABLED_FEATURES: [
      'recommendations', 'scheduling', 'room_optimization', 'customer_support', 'sustainability_scorer'
    ],
    SOCIAL_MEDIA_INTEGRATION: ['facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'telegram']
  },
  BRANCH_SETTINGS: {
    DEFAULT_MAX_BRANCHES: 50,
    DEFAULT_MAX_LOGIN_SESSIONS: 3,
    DEFAULT_SESSION_TIMEOUT_MINUTES: 30,
    TWO_FACTOR_AUTH: {
      ENABLED: false,
      METHODS: ['sms', 'email', 'authenticator_app']
    }
  },
  STAFF_CONSTANTS: {
    DEFAULT_ROLES: [
      'front_desk', 'housekeeping', 'concierge', 'event_staff', 'consultant',
      'front_of_house', 'back_of_house', 'manager'
    ],
    STAFF_ROLES: {
      front_desk: {
        name: 'Front Desk',
        description: 'Handles guest check-ins, check-outs, and inquiries.',
        responsibilities: ['process_check_in_out', 'handle_inquiries', 'manage_bookings', 'resolve_disputes'],
        permissions: [
          'manage_bookings', 'process_check_in_out', 'handle_support_requests',
          'view_customer_data', 'view_wallet', 'request_withdrawal', 'escalate_issues'
        ],
        taskTypes: {
          mstays: ['check_in_out', 'booking_update', 'resolve_dispute', 'handle_inquiry']
        },
        trainingModules: ['hospitality_management', 'customer_service', 'booking_management'],
        analyticsConstants: {
          metrics: ['task_completion_rate', 'customer_satisfaction', 'check_in_out_speed'],
          performanceThresholds: { check_in_out_speed_minutes: 5 }
        },
        notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'booking_update', 'announcement', 'stay_assignment'],
        errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_STAY_ASSIGNMENT'],
        successMessages: ['task_completed', 'check_in_out_completed', 'booking_processed']
      },
      housekeeping: {
        name: 'Housekeeping',
        description: 'Manages room cleaning and maintenance.',
        responsibilities: ['clean_rooms', 'report_maintenance', 'update_room_status'],
        permissions: ['clean_rooms', 'report_maintenance', 'update_room_status', 'view_wallet', 'request_withdrawal'],
        taskTypes: {
          mstays: ['clean_room', 'report_maintenance', 'update_room_status']
        },
        trainingModules: ['hospitality_management', 'sustainability_training', 'cleaning_procedures'],
        analyticsConstants: {
          metrics: ['task_completion_rate', 'room_cleaning_time', 'maintenance_report_accuracy'],
          performanceThresholds: { room_cleaning_time_minutes: 60 }
        },
        notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'room_maintenance_alert', 'announcement'],
        errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_ROOM_STATUS'],
        successMessages: ['task_completed', 'room_cleaned', 'maintenance_reported']
      },
      concierge: {
        name: 'Concierge',
        description: 'Assists guests with personalized services and local recommendations.',
        responsibilities: ['handle_inquiries', 'provide_recommendations', 'coordinate_services'],
        permissions: ['handle_inquiries', 'provide_recommendations', 'coordinate_services', 'view_wallet', 'request_withdrawal'],
        taskTypes: {
          mstays: ['handle_inquiry', 'provide_recommendations', 'coordinate_services']
        },
        trainingModules: ['hospitality_management', 'customer_service', 'accessibility_training'],
        analyticsConstants: {
          metrics: ['task_completion_rate', 'customer_satisfaction', 'recommendation_accuracy'],
          performanceThresholds: { inquiry_response_time_minutes: 10 }
        },
        notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'announcement'],
        errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],
        successMessages: ['task_completed', 'inquiry_handled']
      },
      event_staff: {
        name: 'Event Staff',
        description: 'Supports event setup and service.',
        responsibilities: ['setup_events', 'serve_events', 'handle_event_inquiries'],
        permissions: ['event_setup', 'serve_event', 'view_wallet', 'request_withdrawal'],
        taskTypes: {
          mstays: ['event_setup', 'serve_event'],
          mevents: ['event_setup', 'serve_event']
        },
        trainingModules: ['food_safety', 'event_management', 'customer_service'],
        analyticsConstants: {
          metrics: ['task_completion_rate', 'event_setup_time', 'customer_satisfaction'],
          performanceThresholds: { event_setup_time_minutes: 90 }
        },
        notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'event_assignment', 'announcement'],
        errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_EVENT_ASSIGNMENT'],
        successMessages: ['task_completed', 'event_setup_completed']
      },
      consultant: {
        name: 'Consultant',
        description: 'Manages client consultations for events or stays.',
        responsibilities: ['conduct_consultations', 'customize_stays'],
        permissions: ['client_consultation', 'customize_stays', 'view_wallet', 'request_withdrawal'],
        taskTypes: {
          mstays: ['client_consultation', 'customize_stays'],
          mevents: ['client_consultation']
        },
        trainingModules: ['financial_compliance', 'event_management', 'hospitality_management'],
        analyticsConstants: {
          metrics: ['task_completion_rate', 'consultation_completion_time', 'customer_satisfaction'],
          performanceThresholds: { consultation_completion_time_minutes: 30 }
        },
        notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'consultation_scheduled', 'announcement'],
        errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_CONSULTATION'],
        successMessages: ['task_completed', 'consultation_scheduled']
      },
      front_of_house: {
        name: 'Front of House',
        description: 'Handles customer-facing tasks.',
        responsibilities: ['process_check_ins', 'manage_bookings', 'handle_check_in_out', 'resolve_disputes'],
        permissions: [
          'manage_bookings', 'process_check_in_out', 'handle_support_requests',
          'view_customer_data', 'view_wallet', 'request_withdrawal', 'escalate_issues'
        ],
        taskTypes: {
          mstays: ['check_in_out', 'booking_update', 'resolve_dispute']
        },
        trainingModules: ['customer_service', 'booking_management', 'financial_compliance', 'hospitality_management'],
        analyticsConstants: {
          metrics: ['task_completion_rate', 'customer_satisfaction', 'check_in_out_speed'],
          performanceThresholds: { check_in_out_speed_minutes: 5 }
        },
        notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'booking_update', 'announcement', 'stay_assignment'],
        errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_STAY_ASSIGNMENT'],
        successMessages: ['task_completed', 'booking_processed', 'check_in_out_completed']
      },
      back_of_house: {
        name: 'Back of House',
        description: 'Manages operational tasks like inventory and room maintenance.',
        responsibilities: ['monitor_supplies', 'update_room_inventory', 'manage_room_inventory'],
        permissions: [
          'update_room_inventory', 'manage_supplies', 'view_restocking_alerts',
          'view_wallet', 'request_withdrawal', 'manage_room_inventory'
        ],
        taskTypes: {
          mstays: ['update_room_inventory', 'maintenance_request']
        },
        trainingModules: ['inventory_management', 'delivery_operations'],
        analyticsConstants: {
          metrics: ['inventory_accuracy', 'task_completion_rate', 'restock_response_time'],
          performanceThresholds: { inventory_update_time_minutes: 15 }
        },
        notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'restock_alert', 'announcement'],
        errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],
        successMessages: ['task_completed', 'inventory_updated']
      },
      manager: {
        name: 'Manager',
        description: 'Oversees operations, staff, and financial approvals.',
        responsibilities: ['approve_withdrawals', 'manage_schedules', 'resolve_disputes', 'view_analytics', 'audit_operations', 'train_staff'],
        permissions: [
          'manage_bookings', 'update_room_inventory', 'view_analytics',
          'manage_staff', 'approve_withdrawals', 'view_wallet', 'request_withdrawal',
          'resolve_disputes', 'audit_operations', 'train_staff'
        ],
        taskTypes: {
          mstays: ['manage_bookings', 'resolve_dispute'],
          all: ['approve_withdrawal', 'manage_schedule', 'view_analytics', 'audit_operations', 'train_staff']
        },
        trainingModules: ['customer_service', 'financial_compliance', 'operational_management', 'audit_procedures'],
        analyticsConstants: {
          metrics: [
            'task_completion_rate', 'customer_satisfaction', 'room_occupancy',
            'staff_training_completion', 'audit_completion_rate'
          ],
          performanceThresholds: {
            check_in_out_speed_minutes: 5,
            room_cleaning_time_minutes: 60
          }
        },
        notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'compliance_alert', 'announcement', 'audit_alert', 'stay_assignment'],
        errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_AUDIT', 'INVALID_STAY_ASSIGNMENT'],
        successMessages: ['task_completed', 'schedule_updated', 'dispute_resolved', 'withdrawal_approved', 'audit_completed', 'stay_assignment_completed']
      }
    },
    TASK_STATUSES: ['assigned', 'in_progress', 'completed', 'delayed', 'failed', 'cancelled'],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 2,
      MAX_SHIFT_HOURS: 12,
      MAX_SHIFTS_PER_WEEK: 6,
      AI_SHIFT_SCHEDULING: true
    }
  },
  ROOM_SETTINGS: {
    ROOM_TYPES: ['single', 'double', 'suite', 'deluxe', 'family', 'accessible'],
    MAX_OCCUPANCY_PER_ROOM: {
      single: 2,
      double: 4,
      suite: 6,
      deluxe: 4,
      family: 8,
      accessible: 4
    },
    DEFAULT_CHECK_IN_TIME: '14:00',
    DEFAULT_CHECK_OUT_TIME: '11:00',
    MAINTENANCE_TYPES: ['cleaning', 'repair', 'inspection'],
    MAX_BOOKING_DURATION_DAYS: 30,
    MIN_BOOKING_DURATION_HOURS: 12,
    AI_ROOM_OPTIMIZATION: true
  },
  WALLET_CONSTANTS: {
    PAYMENT_METHODS: ['wallet', 'credit_card', 'debit_card', 'digital_wallet', 'mobile_money', 'crypto'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    PAYOUT_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_AMOUNT: 5000,
      MAX_PAYOUT_FREQUENCY_DAYS: 7,
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money', 'crypto'],
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT'],
      PAYOUT_PROCESSING_TIME_HOURS: 24
    }
  },
  ANALYTICS_CONSTANTS: {
    METRICS: [
      'room_occupancy', 'guest_satisfaction', 'check_in_out_speed', 'room_cleaning_time',
      'maintenance_report_accuracy', 'task_completion_rate', 'booking_completion_rate'
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 365,
    PERFORMANCE_THRESHOLDS: {
      check_in_out_speed_minutes: 5,
      room_cleaning_time_minutes: 60,
      inquiry_response_time_minutes: 10,
      booking_completion_time_minutes: 10
    }
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'booking_confirmation', 'check_in_reminder', 'stay_confirmation', 'stay_cancellation',
      'room_maintenance_alert', 'task_assignment', 'shift_update', 'wallet_update',
      'consultation_scheduled', 'announcement', 'compliance_alert', 'stay_assignment'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    PRIORITY_LEVELS: ['low', 'medium', 'high'],
    MAX_NOTIFICATIONS_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_INTERVAL_SECONDS: 60
  },
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_ACCESSIBILITY_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands', 'accessible_seating'],
    FONT_SIZE_RANGE: { min: 12, max: 24 },
    ALLOWED_DIETARY_FILTERS: [
      'vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'paleo'
    ]
  },
  COMPLIANCE_CONSTANTS: {
    REGULATORY_REQUIREMENTS: ['hospitality_license', 'sustainability_certification'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_FREQUENCY_DAYS: 180,
    AUDIT_TYPES: [
      'booking_processed', 'check_in_out_processed', 'room_maintenance_reported',
      'stay_booked', 'stay_updated', 'stay_cancelled', 'dispute_resolved', 'sustainability_audit'
    ]
  },
  ERROR_CODES: [
    'INVALID_BOOKING_TYPE', 'PERMISSION_DENIED', 'PAYMENT_FAILED', 'INVALID_STAY_ASSIGNMENT',
    'INVALID_ROOM_STATUS', 'INVALID_CONSULTATION', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'
  ],
  SUCCESS_MESSAGES: [
    'booking_processed', 'check_in_out_completed', 'room_cleaned', 'maintenance_reported',
    'stay_booked', 'stay_updated', 'stay_cancelled', 'task_completed', 'consultation_scheduled',
    'dispute_resolved', 'stay_assignment_completed'
  ],
  SOCIAL_MEDIA_CONSTANTS: {
    SUPPORTED_PLATFORMS: ['x', 'instagram', 'facebook', 'linkedin', 'tiktok', 'telegram'],
    POST_TYPES: ['promotion', 'update', 'event', 'review', 'booking'],
    MAX_POST_LENGTH: 280,
    MAX_MEDIA_PER_POST: 4,
    ALLOWED_MEDIA_TYPES: ['jpg', 'png', 'jpeg', 'mp4'],
    MAX_MEDIA_SIZE_MB: 10
  },
  SUPPORT_CONSTANTS: {
    SUPPORT_CHANNELS: ['email', 'phone', 'chat', 'whatsapp', 'telegram'],
    RESPONSE_TIME_HOURS: {
      STANDARD: 24,
      PRIORITY: 4,
      URGENT: 1
    },
    TICKET_STATUSES: ['open', 'in_progress', 'resolved', 'closed'],
    MAX_TICKETS_PER_DAY: 50,
    AI_TICKET_ROUTING: true
  }
};