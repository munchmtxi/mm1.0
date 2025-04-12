'use strict';

const BUSINESS_TYPES = {
  CAFE: {
    code: 'cafe',
    name: 'Cafe',
    requiredFields: ['cuisine_type', 'seating_capacity', 'service_types'],
    allowedServiceTypes: ['dine_in', 'takeaway', 'delivery'],
    requiredLicenses: ['food_service', 'health_safety'],
    validationRules: {
      minimum_seating: 1,
      requires_menu: true,
      serves_beverages: true,
    },
    cuisine_type: {
      type: 'array',
      options: ['coffee', 'italian', 'bakery', 'desserts', 'continental'],
      min: 1,
    },
  },
  RESTAURANT: {
    code: 'restaurant',
    name: 'Restaurant',
    requiredFields: ['cuisine_type', 'seating_capacity', 'service_types'],
    allowedServiceTypes: ['dine_in', 'takeaway', 'delivery'],
    requiredLicenses: ['food_service', 'health_safety'],
    validationRules: {
      minimum_seating: 2,
      requires_menu: true,
    },
    cuisine_type: {
      type: 'array',
      options: ['italian', 'continental', 'african', 'french'],
      min: 1,
    },
  },
  BUTCHER: {
    code: 'butcher',
    name: 'Butcher',
    requiredFields: ['meat_types', 'service_types'],
    allowedServiceTypes: ['in_store', 'delivery', 'pickup'],
    requiredLicenses: ['meat_processing', 'health_safety'],
    validationRules: {
      requires_cold_storage: true,
    },
    meat_types: {
      type: 'array',
      options: ['beef', 'chicken', 'lamb', 'goat'],
      min: 1,
    },
  },
  GENERAL: {
    code: 'general',
    name: 'General Business',
    requiredFields: ['description'],
    allowedServiceTypes: ['in_store', 'pickup'],
    requiredLicenses: [],
    validationRules: {
      description_required: true,
    },
  },
};

module.exports = {
  TYPES: BUSINESS_TYPES,
  CODES: Object.values(BUSINESS_TYPES).map((type) => type.code),
};