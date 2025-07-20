'use strict';

module.exports = {
  STAFF_PERMISSION_MAPPING: {
    // Permissions available for each staff type, based on staffProfileConstants.js
    server: {
      staffType: 'server',
      supportedMerchantTypes: ['restaurant'],
      permissions: [
        'serve_table',
        'process_orders',
        'manage_check_ins',
        'handle_support_requests',
        'view_customer_data',
        'view_wallet',
        'request_withdrawal',
        'escalate_issues'
      ]
    },
    host: {
      staffType: 'host',
      supportedMerchantTypes: ['restaurant'],
      permissions: [
        'manage_bookings',
        'manage_check_ins',
        'table_assignment',
        'handle_support_requests',
        'view_customer_data',
        'view_wallet',
        'request_withdrawal',
        'escalate_issues'
      ]
    },
    chef: {
      staffType: 'chef',
      supportedMerchantTypes: ['restaurant', 'dark_kitchen', 'caterer', 'cafe', 'bakery'],
      permissions: [
        'view_orders',
        'update_order_statuses',
        'prepare_food',
        'view_wallet',
        'request_withdrawal',
        'view_kitchen_inventory'
      ]
    },
    manager: {
      staffType: 'manager',
      supportedMerchantTypes: [
        'restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery',
        'parking_lot', 'accommodation_provider', 'ticket_provider'
      ],
      permissions: [
        'manage_bookings',
        'process_orders',
        'update_inventory',
        'view_analytics',
        'manage_staff',
        'approve_withdrawals',
        'view_wallet',
        'request_withdrawal',
        'resolve_disputes',
        'audit_operations',
        'train_staff'
      ]
    },
    butcher: {
      staffType: 'butcher',
      supportedMerchantTypes: ['butcher'],
      permissions: [
        'prepare_meat',
        'update_inventory',
        'customize_order',
        'view_wallet',
        'request_withdrawal',
        'coordinate_suppliers'
      ]
    },
    barista: {
      staffType: 'barista',
      supportedMerchantTypes: ['cafe'],
      permissions: [
        'prepare_beverage',
        'prepare_food',
        'update_inventory',
        'view_wallet',
        'request_withdrawal',
        'assist_customers'
      ]
    },
    stock_clerk: {
      staffType: 'stock_clerk',
      supportedMerchantTypes: ['grocery'],
      permissions: [
        'stock_shelves',
        'update_inventory',
        'verify_deliveries',
        'view_wallet',
        'request_withdrawal',
        'coordinate_suppliers',
        'report_discrepancies'
      ]
    },
    picker: {
      staffType: 'picker',
      supportedMerchantTypes: ['grocery'],
      permissions: [
        'pick_order',
        'handle_substitutions',
        'view_wallet',
        'request_withdrawal'
      ]
    },
    cashier: {
      staffType: 'cashier',
      supportedMerchantTypes: ['grocery', 'cafe', 'accommodation_provider', 'ticket_provider'],
      permissions: [
        'process_checkout',
        'handle_inquiries',
        'view_wallet',
        'request_withdrawal',
        'process_refunds',
        'view_transactions'
      ]
    },
    driver: {
      staffType: 'driver',
      supportedMerchantTypes: ['restaurant', 'dark_kitchen', 'grocery', 'caterer', 'cafe', 'bakery', 'parking_lot'],
      permissions: [
        'process_deliveries',
        'verify_orders',
        'view_wallet',
        'request_withdrawal',
        'monitor_parking'
      ]
    },
    packager: {
      staffType: 'packager',
      supportedMerchantTypes: ['dark_kitchen', 'grocery', 'butcher', 'caterer'],
      permissions: [
        'package_order',
        'update_inventory',
        'view_wallet',
        'request_withdrawal'
      ]
    },
    event_staff: {
      staffType: 'event_staff',
      supportedMerchantTypes: ['caterer', 'accommodation_provider', 'ticket_provider'],
      permissions: [
        'event_setup',
        'serve_event',
        'view_wallet',
        'request_withdrawal'
      ]
    },
    consultant: {
      staffType: 'consultant',
      supportedMerchantTypes: ['caterer', 'accommodation_provider', 'ticket_provider'],
      permissions: [
        'client_consultation',
        'customize_menu',
        'customize_stays',
        'customize_tickets',
        'view_wallet',
        'request_withdrawal'
      ]
    },
    front_of_house: {
      staffType: 'front_of_house',
      supportedMerchantTypes: ['restaurant', 'cafe', 'grocery', 'parking_lot', 'accommodation_provider', 'ticket_provider'],
      permissions: [
        'manage_bookings',
        'process_orders',
        'manage_check_ins',
        'handle_support_requests',
        'view_customer_data',
        'coordinate_drivers',
        'view_wallet',
        'request_withdrawal',
        'escalate_issues',
        'monitor_parking',
        'handle_check_in_out',
        'check_tickets'
      ]
    },
    back_of_house: {
      staffType: 'back_of_house',
      supportedMerchantTypes: ['restaurant', 'cafe', 'grocery', 'dark_kitchen', 'parking_lot', 'accommodation_provider', 'ticket_provider'],
      permissions: [
        'update_inventory',
        'manage_supplies',
        'process_delivery_packages',
        'verify_driver_credentials',
        'view_restocking_alerts',
        'view_wallet',
        'request_withdrawal',
        'coordinate_suppliers',
        'monitor_parking',
        'manage_room_inventory',
        'manage_ticket_inventory'
      ]
    },
    car_park_operative: {
      staffType: 'car_park_operative',
      supportedMerchantTypes: ['parking_lot'],
      permissions: [
        'monitor_parking',
        'assist_parking',
        'process_payments',
        'view_wallet',
        'request_withdrawal',
        'report_issues'
      ]
    },
    front_desk: {
      staffType: 'front_desk',
      supportedMerchantTypes: ['accommodation_provider'],
      permissions: [
        'manage_bookings',
        'process_check_in_out',
        'handle_support_requests',
        'view_customer_data',
        'view_wallet',
        'request_withdrawal',
        'escalate_issues'
      ]
    },
    housekeeping: {
      staffType: 'housekeeping',
      supportedMerchantTypes: ['accommodation_provider'],
      permissions: [
        'clean_rooms',
        'report_maintenance',
        'update_room_status',
        'view_wallet',
        'request_withdrawal'
      ]
    },
    concierge: {
      staffType: 'concierge',
      supportedMerchantTypes: ['accommodation_provider'],
      permissions: [
        'handle_inquiries',
        'provide_recommendations',
        'coordinate_services',
        'view_wallet',
        'request_withdrawal'
      ]
    },
    ticket_agent: {
      staffType: 'ticket_agent',
      supportedMerchantTypes: ['ticket_provider'],
      permissions: [
        'process_ticket_sales',
        'check_tickets',
        'handle_support_requests',
        'view_customer_data',
        'view_wallet',
        'request_withdrawal',
        'process_refunds'
      ]
    },
    event_coordinator: {
      staffType: 'event_coordinator',
      supportedMerchantTypes: ['ticket_provider'],
      permissions: [
        'manage_ticket_bookings',
        'setup_events',
        'coordinate_vendors',
        'view_wallet',
        'request_withdrawal'
      ]
    }
  },
  STAFF_PERMISSION_MANAGEMENT: {
    // Rules for assigning/removing permissions
    ALLOW_MULTIPLE_STAFF_TYPES: true, // Allows a staff member to have multiple staff types
    PERMISSION_ASSIGNMENT_RULES: {
      requireCertification: true, // Enforce required certifications from staffProfileConstants.js
      merchantTypeValidation: true, // Validate permissions against supported merchant types
      maxPermissionsPerStaff: 50, // Arbitrary limit to prevent excessive permission assignments
      permissionDependencies: {
        // Permissions that require others to be assigned first
        approve_withdrawals: ['view_analytics', 'manage_staff'],
        audit_operations: ['view_analytics'],
        process_refunds: ['view_transactions'],
        manage_ticket_bookings: ['process_ticket_sales'],
        coordinate_drivers: ['process_deliveries'],
        manage_room_inventory: ['update_room_status']
      }
    },
    PERMISSION_REMOVAL_RULES: {
      restrictCriticalPermissions: ['manage_staff', 'approve_withdrawals', 'audit_operations'], // Permissions that require admin approval to remove
      cascadeRemoval: true, // Removing a permission also removes dependent permissions
      notifyOnChange: true, // Send notification to staff on permission change
      notificationType: 'permission_update', // Notification type for permission changes
      auditLog: true, // Log permission changes to audit trail
      auditAction: 'staff_permission_update' // Specific audit action for permission updates
    }
  },
  STAFF_PERMISSION_VALIDATION: {
    // Validation rules for permissions during staff creation/management
    REQUIRED_FIELDS: [
      'staffType', // At least one staff type must be specified
      'merchantType' // Must match supportedMerchantTypes for the selected staff types
    ],
    VALIDATION_RULES: {
      uniquePermissions: true, // Prevent duplicate permissions for a staff member
      merchantTypeCompatibility: true, // Ensure permissions align with merchant type
      certificationCheck: true, // Verify required certifications for permissions
      permissionConflictCheck: false // No explicit conflicts defined; can be extended if needed
    }
  }
};