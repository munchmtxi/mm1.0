'use strict';

module.exports = {
  ROLES: {
    ADMIN: 'admin',
    CUSTOMER: 'customer',
    DRIVER: 'driver',
    STAFF: 'staff',
    MERCHANT: 'merchant',
  },
  AUTH: {
    TOKEN_TYPES: {
      ACCESS: 'access',
      REFRESH: 'refresh',
    },
    DEFAULT_ROLE: 'customer',
    PROTECTED_ROLES: ['admin', 'staff'],
    STATUS: {
      ACTIVE: 'active',
      INACTIVE: 'inactive',
      SUSPENDED: 'suspended',
    },
  },
  VALID_COUNTRIES: ['malawi', 'zambia', 'mozambique', 'tanzania'],
  MERCHANT_TYPES: ['grocery', 'restaurant'],
};