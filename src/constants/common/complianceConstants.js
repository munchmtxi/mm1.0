'use strict';

/**
 * complianceConstants.js
 *
 * Defines compliance-related constants for regulatory and data protection services.
 * Consolidates rules from merchantConstants.js, mparkConstants.js, mtablesConstants.js,
 * mtxiConstants.js, and munchConstants.js, with AI compliance analysis as a paid feature.
 *
 * Last Updated: July 10, 2025
 */

module.exports = {
  REGULATORY_REQUIREMENTS: {
    BUSINESS_LICENSE: 'business_license',
    PARKING_PERMIT: 'parking_permit', // mparkConstants
    FIRE_SAFETY: 'fire_safety', // mparkConstants
    ACCESSIBILITY: 'accessibility', // mparkConstants
    FOOD_SAFETY: 'food_safety', // munchConstants
    DRIVER_LICENSE: 'driver_license', // mtxiConstants
    VEHICLE_INSPECTION: 'vehicle_inspection', // mtxiConstants
    HEALTH_PERMIT: 'health_permit', // munchConstants
  },
  CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired'],
  CERTIFICATION_EXPIRY_DAYS: {
    DEFAULT: 365,
    PARKING_PERMIT: 180, // mparkConstants
    FOOD_SAFETY: 180, // munchConstants
    DRIVER_LICENSE: 730, // mtxiConstants
  },
  DATA_PROTECTION_STANDARDS: [
    'GDPR', // merchantConstants, mparkConstants
    'CCPA', // merchantConstants, mparkConstants
    'LGPD', // mparkConstants
    'PIPA', // mparkConstants
  ],
  ENCRYPTION_ALGORITHM: 'aes-256-cbc', // dataProtectionService
  PERMISSION_LEVELS: {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete',
    ADMIN: 'admin',
  },
  AUDIT_FREQUENCY_DAYS: {
    DEFAULT: 180, // merchantConstants
    PARKING: 90, // mparkConstants
    FOOD: 90, // munchConstants
    RIDE: 90, // mtxiConstants
    TABLE: 90, // mtablesConstants
  },
  AUDIT_TYPES: {
    // merchantConstants
    ORDER_PROCESSED: 'order_processed',
    PAYMENT_PROCESSED: 'payment_processed',
    // mparkConstants
    BOOKING_CREATED: 'booking_created',
    BOOKING_UPDATED: 'booking_updated',
    BOOKING_CANCELLED: 'booking_cancelled',
    CHECK_IN_PROCESSED: 'check_in_processed',
    REFUND_PROCESSED: 'refund_processed',
    DISPUTE_RESOLVED: 'dispute_resolved',
    EVENT_PARKING: 'event_parking',
    // mtablesConstants
    TABLE_ASSIGNED: 'table_assigned',
    TABLE_ADJUSTED: 'table_adjusted',
    TABLE_AVAILABILITY_UPDATED: 'table_availability_updated',
    PRE_ORDER_CREATED: 'pre_order_created',
    BILL_SPLIT_PROCESSED: 'bill_split_processed',
    FRIEND_INVITED: 'friend_invited',
    SOCIAL_MEDIA_INTERACTION: 'social_media_interaction',
    // mtxiConstants
    RIDE_CREATED: 'ride_created',
    RIDE_UPDATED: 'ride_updated',
    RIDE_CANCELLED: 'ride_cancelled',
    // munchConstants
    PROCESS_ORDER: 'process_order',
    APPLY_DIETARY_PREFERENCES: 'apply_dietary_preferences',
    UPDATE_ORDER_STATUS: 'update_order_status',
    PAY_ORDER_WITH_WALLET: 'pay_order_with_wallet',
    CREATE_PROMOTION: 'create_promotion',
    MANAGE_LOYALTY_PROGRAM: 'manage_loyalty_program',
    REDEEM_POINTS: 'redeem_points',
    HANDLE_ORDER_INQUIRY: 'handle_order_inquiry',
    RESOLVE_ORDER_DISPUTE: 'resolve_order_dispute',
    SHARE_ORDER_POLICIES: 'share_order_policies',
  },
  COMPLIANCE_ERRORS: {
    INVALID_CERT_DATA: 'invalid_cert_data',
    MERCHANT_NOT_FOUND: 'merchant_not_found',
    INVALID_CERT_TYPE: 'invalid_cert_type',
    INVALID_STAFF_ID: 'invalid_staff_id',
    STAFF_NOT_FOUND: 'staff_not_found',
    INVALID_DRIVER_ID: 'invalid_driver_id',
    DRIVER_NOT_FOUND: 'driver_not_found',
    INVALID_MERCHANT_ID: 'invalid_merchant_id',
    INVALID_INPUT: 'invalid_input',
    INVALID_ROLE: 'invalid_role',
    INVALID_ACCESS_DATA: 'invalid_access_data',
    INVALID_PERMISSIONS: 'invalid_permissions',
    SYSTEM_ERROR: 'system_error',
  },
  AI_COMPLIANCE_ANALYSIS: {
    ENABLED: false, // Paid feature
  },
};