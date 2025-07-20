'use strict';

module.exports = {
  STAFF_PROFILE_CONSTANTS: {
    ALLOWED_STAFF_TYPES: [
      'server', 'host', 'chef', 'manager', 'butcher', 'barista', 'stock_clerk', 'picker',
      'cashier', 'driver', 'packager', 'event_staff', 'consultant', 'front_of_house',
      'back_of_house', 'car_park_operative', 'front_desk', 'housekeeping', 'concierge',
      'ticket_agent', 'event_coordinator'
    ],
    ALLOWED_CERTIFICATIONS: [
      'food_safety', 'financial_compliance', 'halal_certification', 'kosher_certification',
      'drivers_license', 'food_safety_driver', 'parking_operations', 'inventory_management',
      'payment_processing', 'meat_preparation', 'beverage_preparation', 'operational_management',
      'hospitality_management', 'sustainability_training', 'accessibility_training',
      'event_management', 'ticketing_operations', 'vendor_coordination'
    ],
    REQUIRED_CERTIFICATIONS: {
      server: ['financial_compliance', 'customer_service'],
      host: ['financial_compliance', 'customer_service'],
      chef: ['food_safety', 'halal_certification', 'kosher_certification'],
      manager: ['financial_compliance', 'food_safety', 'operational_management'],
      butcher: ['food_safety', 'halal_certification', 'meat_preparation'],
      barista: ['food_safety', 'beverage_preparation'],
      stock_clerk: ['financial_compliance', 'inventory_management'],
      picker: ['financial_compliance'],
      cashier: ['financial_compliance', 'payment_processing'],
      driver: ['drivers_license', 'food_safety_driver', 'parking_operations'],
      packager: ['food_safety'],
      event_staff: ['food_safety'],
      consultant: ['financial_compliance'],
      front_of_house: ['financial_compliance', 'customer_service'],
      back_of_house: ['food_safety', 'financial_compliance', 'parking_operations'],
      car_park_operative: ['parking_operations'],
      front_desk: ['hospitality_management', 'customer_service'],
      housekeeping: ['hospitality_management', 'sustainability_training'],
      concierge: ['hospitality_management', 'customer_service', 'accessibility_training'],
      ticket_agent: ['ticketing_operations', 'customer_service'],
      event_coordinator: ['event_management', 'customer_service']
    }
  },
  STAFF_STATUSES: ['active', 'inactive', 'pending_onboarding', 'suspended', 'terminated'],
  STAFF_SETTINGS: {
    MAX_STAFF_PER_BRANCH: 200,
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60,
    TWO_FACTOR_AUTH: {
      ENABLED: true,
      METHODS: ['sms', 'email', 'authenticator_app']
    }
  },
  STAFF_ROLES: {
    server: {
      name: 'Server',
      supportedMerchantTypes: ['restaurant'],
      description: 'Handles table service and customer interactions.',
      responsibilities: ['serve_tables', 'process_orders', 'manage_check_ins', 'handle_inquiries', 'resolve_disputes'],
      permissions: [
        'serve_table', 'process_orders', 'manage_check_ins', 'handle_support_requests',
        'view_customer_data', 'view_wallet', 'request_withdrawal', 'escalate_issues'
      ],
      taskTypes: {
        mtables: ['serve_table', 'check_in', 'pre_order', 'extra_order', 'resolve_dispute'],
        munch: ['takeaway_confirm', 'resolve_dispute']
      },
      trainingModules: [
        'customer_service', 'financial_compliance', 'booking_management', 'order_management'
      ],
      analyticsConstants: {
        metrics: ['task_completion_rate', 'customer_satisfaction', 'check_in_speed', 'order_accuracy'],
        performanceThresholds: { check_in_speed_minutes: 3 }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'booking_update', 'announcement'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],
      successMessages: ['task_completed', 'order_processed', 'check_in_completed']
    },
    host: {
      name: 'Host',
      supportedMerchantTypes: ['restaurant'],
      description: 'Manages table bookings and customer greetings.',
      responsibilities: ['process_check_ins', 'manage_bookings', 'assign_tables', 'resolve_disputes'],
      permissions: [
        'manage_bookings', 'manage_check_ins', 'table_assignment', 'handle_support_requests',
        'view_customer_data', 'view_wallet', 'request_withdrawal', 'escalate_issues'
      ],
      taskTypes: {
        mtables: ['check_in', 'booking_update', 'table_assignment', 'resolve_dispute'],
        munch: ['takeaway_confirm']
      },
      trainingModules: ['customer_service', 'booking_management', 'financial_compliance'],
      analyticsConstants: {
        metrics: ['task_completion_rate', 'customer_satisfaction', 'check_in_speed', 'booking_management'],
        performanceThresholds: { check_in_speed_minutes: 3 }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'booking_update', 'announcement'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],
      successMessages: ['task_completed', 'booking_processed', 'check_in_completed']
    },
    chef: {
      name: 'Chef',
      supportedMerchantTypes: ['restaurant', 'dark_kitchen', 'caterer', 'cafe', 'bakery'],
      description: 'Prepares food for dine-in, takeaway, delivery, and events.',
      responsibilities: ['prepare_food', 'ensure_dietary_compliance', 'update_order_status', 'monitor_kitchen_inventory'],
      permissions: [
        'view_orders', 'update_order_statuses', 'prepare_food', 'view_wallet', 'request_withdrawal',
        'view_kitchen_inventory'
      ],
      taskTypes: {
        mtables: ['prep_order'],
        munch: ['prep_order', 'monitor_inventory'],
        mevents: ['event_food_prep']
      },
      trainingModules: ['food_safety', 'dietary_compliance', 'event_catering', 'inventory_management'],
      analyticsConstants: {
        metrics: ['prep_time', 'task_completion_rate', 'dietary_compliance_rate', 'inventory_accuracy'],
        performanceThresholds: {
          prep_time_minutes: { restaurant: 10, dark_kitchen: 15, caterer: 45, cafe: 8, bakery: 8 }
        }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'order_update', 'announcement', 'inventory_alert'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_INVENTORY'],
      successMessages: ['task_completed', 'order_prepared', 'inventory_updated']
    },
    manager: {
      name: 'Manager',
      supportedMerchantTypes: ['restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery', 'parking_lot', 'accommodation_provider', 'ticket_provider'],
      description: 'Oversees operations, staff, and financial approvals.',
      responsibilities: ['approve_withdrawals', 'manage_schedules', 'resolve_disputes', 'view_analytics', 'audit_operations', 'train_staff'],
      permissions: [
        'manage_bookings', 'process_orders', 'update_inventory', 'view_analytics',
        'manage_staff', 'approve_withdrawals', 'view_wallet', 'request_withdrawal', 'resolve_disputes',
        'audit_operations', 'train_staff'
      ],
      taskTypes: {
        mtables: ['manage_bookings', 'resolve_dispute'],
        munch: ['process_orders', 'resolve_dispute', 'coordinate_supplier'],
        mevents: ['oversee_event'],
        mpark: ['monitor_parking'],
        mstays: ['manage_bookings', 'resolve_dispute'],
        mtickets: ['manage_ticket_bookings'],
        all: ['approve_withdrawal', 'manage_schedule', 'view_analytics', 'audit_operations', 'train_staff']
      },
      trainingModules: ['customer_service', 'financial_compliance', 'operational_management', 'event_management', 'supplier_management', 'audit_procedures'],
      analyticsConstants: {
        metrics: [
          'task_completion_rate', 'customer_satisfaction', 'inventory_accuracy', 'delivery_performance',
          'booking_management', 'event_setup_time', 'staff_training_completion', 'audit_completion_rate',
          'parking_compliance', 'room_cleaning_time', 'ticket_processing_time'
        ],
        performanceThresholds: {
          prep_time_minutes: {
            restaurant: 10, dark_kitchen: 15, butcher: 5, grocery: 10, caterer: 45, cafe: 8, bakery: 8,
            parking_lot: 5, accommodation_provider: 30, ticket_provider: 5
          },
          checkout_time_minutes: 3,
          event_setup_time_minutes: 90,
          parking_assist_time_minutes: 5,
          room_cleaning_time_minutes: 60,
          ticket_processing_time_minutes: 5
        }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'compliance_alert', 'announcement', 'audit_alert', 'parking_alert', 'stay_assignment', 'ticket_assignment'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_AUDIT', 'INVALID_STAY_ASSIGNMENT', 'INVALID_TICKET_ASSIGNMENT'],
      successMessages: ['task_completed', 'schedule_updated', 'dispute_resolved', 'withdrawal_approved', 'audit_completed', 'stay_assignment_completed', 'ticket_assignment_completed']
    },
    butcher: {
      name: 'Butcher',
      supportedMerchantTypes: ['butcher'],
      description: 'Prepares meat orders with dietary compliance.',
      responsibilities: ['prepare_meat', 'customize_orders', 'update_inventory', 'coordinate_suppliers'],
      permissions: ['prepare_meat', 'update_inventory', 'customize_order', 'view_wallet', 'request_withdrawal', 'coordinate_suppliers'],
      taskTypes: {
        munch: ['prepare_meat', 'update_inventory', 'customize_order', 'coordinate_supplier']
      },
      trainingModules: ['food_safety', 'meat_preparation', 'dietary_compliance', 'supplier_coordination'],
      analyticsConstants: {
        metrics: ['prep_time', 'inventory_accuracy', 'task_completion_rate', 'dietary_compliance_rate'],
        performanceThresholds: { prep_time_minutes: { butcher: 5 } }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'order_update', 'announcement', 'inventory_alert'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_INVENTORY'],
      successMessages: ['task_completed', 'meat_order_prepared', 'inventory_updated']
    },
    barista: {
      name: 'Barista',
      supportedMerchantTypes: ['cafe'],
      description: 'Prepares beverage and light food orders.',
      responsibilities: ['prepare_beverages', 'prepare_light_food', 'update_inventory', 'assist_customers'],
      permissions: ['prepare_beverage', 'prepare_food', 'update_inventory', 'view_wallet', 'request_withdrawal', 'assist_customers'],
      taskTypes: {
        munch: ['prepare_beverage', 'prepare_food', 'update_inventory', 'assist_customer']
      },
      trainingModules: ['food_safety', 'beverage_preparation', 'customer_service', 'inventory_management'],
      analyticsConstants: {
        metrics: ['prep_time', 'task_completion_rate', 'customer_satisfaction', 'inventory_accuracy'],
        performanceThresholds: { prep_time_minutes: { cafe: 8 } }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'order_update', 'announcement', 'inventory_alert'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_INVENTORY'],
      successMessages: ['task_completed', 'beverage_prepared', 'inventory_updated']
    },
    stock_clerk: {
      name: 'Stock Clerk',
      supportedMerchantTypes: ['grocery'],
      description: 'Manages inventory and shelf stocking.',
      responsibilities: ['restock_shelves', 'verify_delivery', 'update_inventory', 'coordinate_suppliers', 'report_discrepancies'],
      permissions: ['stock_shelves', 'update_inventory', 'verify_deliveries', 'view_wallet', 'request_withdrawal', 'coordinate_suppliers', 'report_discrepancies'],
      taskTypes: {
        munch: ['stock_shelves', 'update_inventory', 'verify_delivery', 'coordinate_supplier', 'report_discrepancy']
      },
      trainingModules: ['inventory_management', 'financial_compliance', 'operational_safety', 'supplier_coordination'],
      analyticsConstants: {
        metrics: ['inventory_accuracy', 'stocking_time', 'task_completion_rate', 'discrepancy_resolution_time', 'supplier_response_time'],
        performanceThresholds: { stocking_time_minutes: 20, inventory_update_time_minutes: 15 }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'restock_alert', 'announcement', 'discrepancy_alert'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_SUPPLIER'],
      successMessages: ['task_completed', 'inventory_updated', 'delivery_verified', 'discrepancy_reported']
    },
    picker: {
      name: 'Picker',
      supportedMerchantTypes: ['grocery'],
      description: 'Picks items for customer orders.',
      responsibilities: ['pick_orders', 'handle_substitutions'],
      permissions: ['pick_order', 'handle_substitutions', 'view_wallet', 'request_withdrawal'],
      taskTypes: {
        munch: ['pick_order', 'handle_substitutions']
      },
      trainingModules: ['financial_compliance', 'order_picking', 'inventory_management'],
      analyticsConstants: {
        metrics: ['task_completion_rate', 'picking_speed', 'order_accuracy'],
        performanceThresholds: { picking_time_minutes: 10 }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'order_update', 'announcement'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],
      successMessages: ['task_completed', 'order_picked']
    },
    cashier: {
      name: 'Cashier',
      supportedMerchantTypes: ['grocery', 'cafe', 'accommodation_provider', 'ticket_provider'],
      description: 'Processes sales and customer inquiries.',
      responsibilities: ['process_checkouts', 'handle_inquiries', 'resolve_disputes', 'process_refunds'],
      permissions: ['process_checkout', 'handle_inquiries', 'view_wallet', 'request_withdrawal', 'process_refunds', 'view_transactions'],
      taskTypes: {
        munch: ['process_checkout', 'resolve_dispute', 'process_refund', 'monitor_transaction'],
        mstays: ['process_checkout', 'resolve_dispute', 'process_refund'],
        mtickets: ['process_ticket_sale', 'process_refund']
      },
      trainingModules: ['customer_service', 'payment_processing', 'financial_compliance', 'refund_management', 'ticketing_operations'],
      analyticsConstants: {
        metrics: ['checkout_speed', 'customer_satisfaction', 'transaction_accuracy', 'refund_processing_time', 'ticket_processing_time'],
        performanceThresholds: { checkout_time_minutes: 3, ticket_processing_time_minutes: 5 }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'payment_update', 'announcement', 'refund_alert', 'ticket_assignment'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_REFUND', 'INVALID_TICKET_ASSIGNMENT'],
      successMessages: ['task_completed', 'checkout_processed', 'refund_processed', 'ticket_sale_processed']
    },
    driver: {
      name: 'Driver',
      supportedMerchantTypes: ['restaurant', 'dark_kitchen', 'grocery', 'caterer', 'cafe', 'bakery', 'parking_lot'],
      description: 'Handles delivery of orders, event catering, and parking coordination.',
      responsibilities: ['process_deliveries', 'verify_orders', 'coordinate_pickups', 'monitor_parking'],
      permissions: ['process_deliveries', 'verify_orders', 'view_wallet', 'request_withdrawal', 'monitor_parking'],
      taskTypes: {
        mtxi: ['process_delivery', 'verify_order', 'parking_check'],
        munch: ['delivery_handover'],
        mpark: ['parking_check'],
        mevents: ['event_delivery']
      },
      trainingModules: ['food_safety', 'delivery_operations', 'customer_interaction', 'parking_operations', 'event_delivery_training'],
      analyticsConstants: {
        metrics: ['delivery_time', 'task_completion_rate', 'order_accuracy', 'parking_compliance', 'event_delivery_time'],
        performanceThresholds: { delivery_time_minutes: 30, parking_assist_time_minutes: 5, event_delivery_time_minutes: 20 }
      },
      notificationTypes: ['delivery_assignment', 'shift_update', 'wallet_update', 'route_update', 'announcement', 'parking_alert', 'event_delivery_assignment'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_DELIVERY_ASSIGNMENT', 'INVALID_PARKING', 'INVALID_EVENT_DELIVERY'],
      successMessages: ['delivery_completed', 'order_handed_over', 'parking_checked', 'event_delivery_completed'],
      ticketIntegration: {
        enabled: false, // Primarily e-tickets; can be enabled for physical ticket delivery
        ticketTypes: ['EVENT', 'FESTIVAL', 'CONCERT', 'SPORTS', 'THEATER', 'CONFERENCE', 'EXHIBITION', 'WORKSHOP', 'SEMINAR'],
        accessMethods: ['QR_CODE', 'BARCODE', 'DIGITAL_PASS', 'NFC'],
        aiTicketAllocation: true
      }
    },
    packager: {
      name: 'Packager',
      supportedMerchantTypes: ['dark_kitchen', 'grocery', 'butcher', 'caterer'],
      description: 'Packages orders for delivery or pickup.',
      responsibilities: ['package_orders', 'ensure_labeling', 'coordinate_drivers'],
      permissions: ['package_order', 'update_inventory', 'view_wallet', 'request_withdrawal'],
      taskTypes: {
        munch: ['package_order', 'update_inventory'],
        mtxi: ['verify_driver']
      },
      trainingModules: ['food_safety', 'packaging_operations', 'inventory_management'],
      analyticsConstants: {
        metrics: ['task_completion_rate', 'packaging_speed', 'order_accuracy', 'inventory_accuracy'],
        performanceThresholds: { packaging_time_minutes: 10 }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'order_update', 'announcement'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],
      successMessages: ['task_completed', 'order_packaged']
    },
    event_staff: {
      name: 'Event Staff',
      supportedMerchantTypes: ['caterer', 'accommodation_provider', 'ticket_provider'],
      description: 'Supports event setup and service.',
      responsibilities: ['setup_events', 'serve_events', 'handle_event_inquiries'],
      permissions: ['event_setup', 'serve_event', 'view_wallet', 'request_withdrawal'],
      taskTypes: {
        mevents: ['event_setup', 'serve_event'],
        munch: ['prep_order'],
        mstays: ['event_setup', 'serve_event'],
        mtickets: ['check_ticket', 'event_setup']
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
      supportedMerchantTypes: ['caterer', 'accommodation_provider', 'ticket_provider'],
      description: 'Manages client consultations for events, stays, or tickets.',
      responsibilities: ['conduct_consultations', 'customize_menus', 'customize_stays', 'customize_tickets'],
      permissions: ['client_consultation', 'customize_menu', 'customize_stays', 'customize_tickets', 'view_wallet', 'request_withdrawal'],
      taskTypes: {
        mevents: ['client_consultation', 'customize_menu'],
        mstays: ['client_consultation', 'customize_stays'],
        mtickets: ['client_consultation', 'customize_tickets']
      },
      trainingModules: ['financial_compliance', 'event_management', 'hospitality_management', 'ticketing_operations'],
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
      supportedMerchantTypes: ['restaurant', 'cafe', 'grocery', 'parking_lot', 'accommodation_provider', 'ticket_provider'],
      description: 'Handles customer-facing tasks.',
      responsibilities: ['process_check_ins', 'manage_bookings', 'handle_orders', 'monitor_parking', 'handle_check_in_out', 'check_tickets'],
      permissions: [
        'manage_bookings', 'process_orders', 'manage_check_ins', 'handle_support_requests',
        'view_customer_data', 'coordinate_drivers', 'view_wallet', 'request_withdrawal', 'escalate_issues',
        'monitor_parking', 'handle_check_in_out', 'check_tickets'
      ],
      taskTypes: {
        mtables: ['check_in', 'booking_update', 'table_assignment', 'pre_order', 'extra_order', 'resolve_dispute'],
        munch: ['takeaway_confirm', 'resolve_dispute', 'assist_customer'],
        mtxi: ['driver_pickup'],
        mevents: ['event_check_in'],
        mpark: ['parking_check_in', 'parking_assist'],
        mstays: ['check_in_out', 'booking_update', 'resolve_dispute'],
        mtickets: ['check_ticket', 'booking_update', 'resolve_dispute']
      },
      trainingModules: ['customer_service', 'booking_management', 'financial_compliance', 'parking_operations', 'hospitality_management', 'ticketing_operations'],
      analyticsConstants: {
        metrics: ['task_completion_rate', 'customer_satisfaction', 'check_in_speed', 'booking_management', 'parking_assist_time', 'check_in_out_speed', 'ticket_processing_time'],
        performanceThresholds: { check_in_speed_minutes: 3, parking_assist_time_minutes: 5, check_in_out_speed_minutes: 5, ticket_processing_time_minutes: 5 }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'booking_update', 'announcement', 'parking_alert', 'stay_assignment', 'ticket_assignment'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_PARKING', 'INVALID_STAY_ASSIGNMENT', 'INVALID_TICKET_ASSIGNMENT'],
      successMessages: ['task_completed', 'booking_processed', 'check_in_completed', 'parking_assisted', 'check_in_out_completed', 'ticket_checked']
    },
    back_of_house: {
      name: 'Back of House',
      supportedMerchantTypes: ['restaurant', 'cafe', 'grocery', 'dark_kitchen', 'parking_lot', 'accommodation_provider', 'ticket_provider'],
      description: 'Manages operational tasks like inventory and parking.',
      responsibilities: ['monitor_supplies', 'update_inventory', 'prepare_delivery_packages', 'monitor_parking', 'manage_room_inventory', 'manage_ticket_inventory'],
      permissions: [
        'update_inventory', 'manage_supplies', 'process_delivery_packages', 'verify_driver_credentials',
        'view_restocking_alerts', 'view_wallet', 'request_withdrawal', 'coordinate_suppliers', 'monitor_parking',
        'manage_room_inventory', 'manage_ticket_inventory'
      ],
      taskTypes: {
        mtables: ['supply_monitor', 'restock_request'],
        munch: ['update_inventory', 'prepare_delivery_package', 'restock_alert', 'coordinate_supplier'],
        mtxi: ['verify_driver'],
        mpark: ['parking_check'],
        mstays: ['update_room_inventory', 'maintenance_request'],
        mtickets: ['update_ticket_inventory']
      },
      trainingModules: ['inventory_management', 'food_safety', 'delivery_operations', 'supplier_coordination', 'parking_operations'],
      analyticsConstants: {
        metrics: ['inventory_accuracy', 'task_completion_rate', 'restock_response_time', 'parking_compliance'],
        performanceThresholds: { inventory_update_time_minutes: 15, parking_assist_time_minutes: 5 }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'restock_alert', 'announcement', 'parking_alert'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_PARKING'],
      successMessages: ['task_completed', 'inventory_updated', 'delivery_package_prepared', 'parking_checked']
    },
    car_park_operative: {
      name: 'Car Park Operative',
      supportedMerchantTypes: ['parking_lot'],
      description: 'Manages parking operations and customer assistance.',
      responsibilities: ['monitor_parking', 'assist_parking', 'process_payments', 'report_issues'],
      permissions: ['monitor_parking', 'assist_parking', 'process_payments', 'view_wallet', 'request_withdrawal', 'report_issues'],
      taskTypes: {
        mpark: ['monitor_parking', 'assist_parking', 'process_payment', 'report_issue']
      },
      trainingModules: ['parking_operations', 'customer_service', 'payment_processing'],
      analyticsConstants: {
        metrics: ['parking_assist_time', 'task_completion_rate', 'customer_satisfaction', 'payment_accuracy'],
        performanceThresholds: { parking_assist_time_minutes: 5 }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'parking_alert', 'announcement'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_PARKING_ASSIGNMENT'],
      successMessages: ['task_completed', 'parking_assisted', 'payment_processed']
    },
    front_desk: {
      name: 'Front Desk',
      supportedMerchantTypes: ['accommodation_provider'],
      description: 'Handles guest check-ins, check-outs, and inquiries.',
      responsibilities: ['process_check_in_out', 'handle_inquiries', 'manage_bookings', 'resolve_disputes'],
      permissions: ['manage_bookings', 'process_check_in_out', 'handle_support_requests', 'view_customer_data', 'view_wallet', 'request_withdrawal', 'escalate_issues'],
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
      supportedMerchantTypes: ['accommodation_provider'],
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
      supportedMerchantTypes: ['accommodation_provider'],
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
    ticket_agent: {
      name: 'Ticket Agent',
      supportedMerchantTypes: ['ticket_provider'],
      description: 'Handles ticket sales and customer inquiries.',
      responsibilities: ['process_ticket_sales', 'check_tickets', 'handle_inquiries', 'process_refunds'],
      permissions: ['process_ticket_sales', 'check_tickets', 'handle_support_requests', 'view_customer_data', 'view_wallet', 'request_withdrawal', 'process_refunds'],
      taskTypes: {
        mtickets: ['process_ticket_sale', 'check_ticket', 'handle_inquiry', 'process_refund']
      },
      trainingModules: ['ticketing_operations', 'customer_service', 'refund_management'],
      analyticsConstants: {
        metrics: ['task_completion_rate', 'customer_satisfaction', 'ticket_processing_time'],
        performanceThresholds: { ticket_processing_time_minutes: 5 }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'ticket_assignment', 'announcement'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_TICKET_ASSIGNMENT'],
      successMessages: ['task_completed', 'ticket_sale_processed', 'ticket_checked']
    },
    event_coordinator: {
      name: 'Event Coordinator',
      supportedMerchantTypes: ['ticket_provider'],
      description: 'Coordinates event logistics and ticket management.',
      responsibilities: ['setup_events', 'coordinate_vendors', 'manage_ticket_bookings'],
      permissions: ['manage_ticket_bookings', 'setup_events', 'coordinate_vendors', 'view_wallet', 'request_withdrawal'],
      taskTypes: {
        mtickets: ['setup_event', 'coordinate_vendors', 'manage_ticket_bookings'],
        mevents: ['setup_event', 'coordinate_vendors']
      },
      trainingModules: ['event_management', 'customer_service', 'vendor_coordination'],
      analyticsConstants: {
        metrics: ['task_completion_rate', 'event_setup_time', 'vendor_coordination_accuracy'],
        performanceThresholds: { event_setup_time_minutes: 90 }
      },
      notificationTypes: ['task_assignment', 'shift_update', 'wallet_update', 'event_coordination_alert', 'announcement'],
      errorCodes: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH', 'INVALID_EVENT_ASSIGNMENT'],
      successMessages: ['task_completed', 'event_setup_completed']
    }
  },
  STAFF_TASK_STATUSES: ['assigned', 'in_progress', 'completed', 'delayed', 'failed', 'cancelled']
};