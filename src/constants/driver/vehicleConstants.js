'use strict';

module.exports = {
  VEHICLE_TYPES: ['car', 'motorbike', 'bicycle', 'van', 'electric_scooter'],
  VEHICLE_STATUSES: ['active', 'inactive', 'under_maintenance', 'retired'],
  VEHICLE_SETTINGS: {
    MAX_VEHICLES_PER_DRIVER: 3,
    MIN_VEHICLE_AGE_YEARS: 0,
    MAX_VEHICLE_AGE_YEARS: 10,
    REQUIRED_INSPECTIONS: ['annual_safety', 'emission_test', 'insurance_verification'],
    INSPECTION_FREQUENCY_DAYS: 365,
    FUEL_TYPES: ['petrol', 'diesel', 'electric', 'hybrid'],
    EV_CHARGING_COMPATIBILITY: ['type1', 'type2', 'chademo', 'ccs'],
    MAX_CAPACITY_PASSENGERS: 4,
    MAX_CARGO_CAPACITY_KG: 500
  },
  MAINTENANCE_SETTINGS: {
    MAINTENANCE_TYPES: ['oil_change', 'tire_rotation', 'brake_check', 'battery_check', 'full_inspection'],
    MAINTENANCE_ALERT_FREQUENCY_DAYS: 90,
    MAINTENANCE_LOG_RETENTION_DAYS: 730
  },
  SAFETY_FEATURES: {
    REQUIRED_FEATURES: ['airbags', 'abs', 'seatbelts'],
    OPTIONAL_FEATURES: ['rear_camera', 'blind_spot_monitor', 'lane_assist', 'collision_warning']
  },
  NOTIFICATION_TYPES: [
    'VEHICLE_INSPECTION_DUE',
    'MAINTENANCE_ALERT',
    'VEHICLE_STATUS_UPDATED',
    'VEHICLE_REGISTRATION_COMPLETED'
  ],
  AUDIT_TYPES: [
    'VEHICLE_ADDED',
    'VEHICLE_UPDATED',
    'VEHICLE_INSPECTION_LOGGED',
    'MAINTENANCE_LOGGED'
  ],
  EVENT_TYPES: [
    'VEHICLE_ADDED',
    'VEHICLE_UPDATED',
    'VEHICLE_INSPECTION_COMPLETED',
    'MAINTENANCE_COMPLETED'
  ],
  ERROR_CODES: [
    'INVALID_VEHICLE_TYPE',
    'VEHICLE_NOT_FOUND',
    'INSPECTION_EXPIRED',
    'INVALID_VEHICLE_STATUS',
    'MAINTENANCE_LOG_FAILED'
  ],
  SUCCESS_MESSAGES: [
    'VEHICLE_ADDED',
    'VEHICLE_UPDATED',
    'VEHICLE_INSPECTION_COMPLETED',
    'MAINTENANCE_COMPLETED'
  ]
};