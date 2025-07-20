'use strict';

module.exports = {
  MERCHANT_AUTH_CONSTANTS: {
    REGISTRATION_FIELDS: {
      MANDATORY: [
        'business_name',
        'first_name',
        'last_name',
        'email',
        'password',
        'phone_number',
        'business_type',
        'country',
        'address',
      ],
      OPTIONAL: [
        'website',
        'preferred_language',
        'preferred_currency',
        'google_location',
        'detected_location',
        'manual_location',
        'location_source',
        'avatar_url',
        'notification_preferences',
        'privacy_settings',
        'google_id',
        'business_logo_url',
        'parking_spaces',
        'staff_members',
      ],
    },
    VALIDATION_RULES: {
      business_name: {
        type: 'STRING',
        validate: {
          notEmpty: true,
        },
      },
      first_name: {
        type: 'STRING',
        allowNull: false,
        validate: {
          notEmpty: { msg: 'First name is required' },
          len: { args: [2, 50], msg: 'First name must be between 2 and 50 characters' },
        },
      },
      last_name: {
        type: 'STRING',
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Last name is required' },
          len: { args: [2, 50], msg: 'Last name must be between 2 and 50 characters' },
        },
      },
      email: {
        type: 'STRING',
        allowNull: false,
        validate: {
          isEmail: { msg: 'Must be a valid email address' },
          notEmpty: { msg: 'Email is required' },
          unique: { msg: 'Email address already in use!' },
        },
      },
      password: {
        type: 'STRING',
        allowNull: false,
        validate: {
          isValidPassword(value) {
            const passwordValidator = require('password-validator');
            const schema = new passwordValidator();
            schema
              .is().min(8)
              .is().max(100)
              .has().uppercase(1)
              .has().lowercase(1)
              .has().digits(1)
              .has().symbols(1);
            if (!schema.validate(value)) {
              throw new Error('Password does not meet complexity requirements');
            }
          },
        },
      },
      phone_number: {
        validate: {
          isValidPhone: (value) => {
            const libphonenumber = require('google-libphonenumber');
            const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
            try {
              const number = phoneUtil.parse(value);
              return phoneUtil.isValidNumber(number);
            } catch (error) {
              throw new Error('Invalid phone number format');
            }
          },
          unique: true,
        },
      },
      business_type: {
        type: 'ARRAY',
        validate: {
          notEmpty: { msg: 'At least one business type is required' },
          isValidBusinessType(value) {
            const validTypes = ['restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery', 'venue', 'parking_lot'];
            if (!Array.isArray(value) || value.length === 0 || !value.every(type => validTypes.includes(type))) {
              throw new Error('Invalid business type(s) selected');
            }
          },
        },
      },
      country: {
        validate: {
          isIn: ['US', 'GB', 'EU', 'CA', 'AU', 'MW', 'TZ', 'KE', 'MZ', 'ZA', 'IN', 'CM', 'GH', 'MX', 'ER'],
          notEmpty: { msg: 'Country is required' },
        },
        defaultValue: 'MW',
      },
      address: {
        validate: {
          notEmpty: true,
        },
      },
      website: {
        type: 'STRING',
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      preferred_language: {
        validate: {
          isIn: ['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'zu', 'xh', 'am', 'ti'],
        },
        defaultValue: 'en',
      },
      preferred_currency: {
        validate: {
          isIn: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'],
        },
        defaultValue: (country) => {
          const COUNTRY_CURRENCY_MAP = {
            US: 'USD', GB: 'GBP', EU: 'EUR', CA: 'CAD', AU: 'AUD', MW: 'MWK', TZ: 'TZS', KE: 'KES', MZ: 'MZN',
            ZA: 'ZAR', IN: 'INR', CM: 'XAF', GH: 'GHS', MX: 'MXN', ER: 'ERN'
          };
          return COUNTRY_CURRENCY_MAP[country] || 'USD';
        },
      },
      google_location: { type: 'JSON', allowNull: true },
      detected_location: { type: 'JSONB', allowNull: true },
      manual_location: { type: 'JSONB', allowNull: true },
      location_source: { type: 'ENUM', values: ['ip', 'gps', 'manual'], allowNull: true },
      avatar_url: { type: 'STRING', allowNull: true },
      notification_preferences: {
        type: 'JSONB',
        allowNull: true,
        defaultValue: { email: true, sms: false, push: false, whatsapp: false },
        validate: {
          isValidPreferences(value) {
            const allowed = ['email', 'sms', 'push', 'whatsapp'];
            if (value && Object.keys(value).some(key => !allowed.includes(key))) {
              throw new Error('Invalid notification preference');
            }
          },
        },
      },
      privacy_settings: {
        type: 'JSONB',
        allowNull: true,
        defaultValue: { location_visibility: 'app_only', data_sharing: 'analytics' },
        validate: {
          isValidPrivacySettings(value) {
            const allowedLocation = ['app_only', 'anonymized', 'none'];
            const allowedDataSharing = ['analytics', 'marketing', 'none'];
            if (value) {
              if (!allowedLocation.includes(value.location_visibility)) {
                throw new Error fama'Invalid location visibility setting');
              }
              if (!allowedDataSharing.includes(value.data_sharing)) {
                throw new Error('Invalid data sharing setting');
              }
            }
          },
        },
      },
      google_id: {
        type: 'STRING',
        allowNull: true,
        unique: true,
      },
      business_logo_url: {
        type: 'STRING',
        allowNull: true,
      },
      parking_spaces: {
        type: 'JSONB',
        allowNull: true,
        defaultValue: [],
        validate: {
          isValidParkingSpaces(value) {
            if (value && Array.isArray(value)) {
              value.forEach(space => {
                const validTypes = ['STANDARD', 'ACCESSIBLE', 'EV_CHARGING', 'OVERSIZED', 'PREMIUM', 'PRIVATE', 'MOTORBIKE'];
                const validSecurity = ['CCTV', 'GUARDED', 'GATED', 'LIGHTING', 'PATROLLED', 'BIOMETRIC', 'NONE'];
                const validAccess = ['KEYPAD', 'TICKET', 'APP', 'MANUAL', 'LICENSE_PLATE', 'NFC'];
                const validEgress = ['AUTOMATIC', 'MANUAL', 'OPEN'];
                if (!validTypes.includes(space.space_type)) {
                  throw new Error('Invalid parking space type');
                }
                if (space.security_features && !space.security_features.every(f => validSecurity.includes(f))) {
                  throw new Error('Invalid security features');
                }
                if (!validAccess.includes(space.access_type)) {
                  throw new Error('Invalid access type');
                }
                if (!validEgress.includes(space.egress_type)) {
                  throw new Error('Invalid egress type');
                }
                if (!space.location || typeof space.location !== 'object') {
                  throw new Error('Parking space location is required and must be an object');
                }
              });
            }
          },
        },
      },
      staff_members: {
        type: 'JSONB',
        allowNull: true,
        defaultValue: [],
        validate: {
          isValidStaffMembers(value) {
            if (value && Array.isArray(value)) {
              const allowedTypes = [
                'server', 'host', 'chef', 'manager', 'butcher', 'barista', 'stock_clerk', 'picker',
                'cashier', 'driver', 'packager', 'event_staff', 'consultant', 'front_of_house',
                'back_of_house', 'car_park_operative'
              ];
              value.forEach(staff => {
                if (!Array.isArray(staff.staff_types) || !staff.staff_types.every(type => allowedTypes.includes(type))) {
                  throw new Error('Invalid staff type(s) for staff member');
                }
                if (staff.certifications && !staff.certifications.every(cert => [
                  'food_safety', 'financial_compliance', 'halal_certification', 'kosher_certification',
                  'drivers_license', 'food_safety_driver', 'parking_operations', 'inventory_management',
                  'payment_processing', 'meat_preparation', 'beverage_preparation', 'operational_management'
                ].includes(cert))) {
                  throw new Error('Invalid certifications for staff member');
                }
              });
            }
          },
        },
      },
    },
    SECURITY: {
      MFA_METHODS: ['EMAIL', 'SMS', 'AUTH_APP', 'BIOMETRIC'],
      TOKEN_EXPIRY_MINUTES: 15,
      MAX_ACTIVE_TOKENS: 3,
      KYC_REQUIREMENTS: ['business_license', 'address_proof', 'national_id'],
      ENCRYPTION_ALGORITHM: 'AES-256-GCM',
      SALT_ROUNDS: 12,
      JWT: {
        SECRET: process.env.JWT_SECRET || null,
        EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
        ALGORITHM: process.env.JWT_ALGORITHM || 'HS256',
        REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || null,
        REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      },
    },
    AUTH: {
      STATUS: {
        PENDING_APPROVAL: 'pending_approval',
        ACTIVE: 'active',
        INACTIVE: 'inactive',
        SUSPENDED: 'suspended',
        TERMINATED: 'terminated',
      },
      ROLES: {
        MERCHANT: 'merchant',
      },
    },
  },
};