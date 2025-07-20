'use strict';

module.exports = {
  DRIVER_AUTH_CONSTANTS: {
    REGISTRATION_FIELDS: {
      MANDATORY: [
        'first_name',
        'last_name',
        'phone_number',
        'email',
        'password',
        'license_number',
        'vehicle_info',
        'country',
      ],
      OPTIONAL: [
        'google_location',
        'detected_location',
        'manual_location',
        'location_source',
        'profile_picture_url',
        'license_picture_url',
        'preferred_language',
        'preferred_currency',
        'avatar_url',
        'notification_preferences',
        'privacy_settings',
        'google_id',
      ],
    },
    VALIDATION_RULES: {
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
      license_number: {
        type: 'STRING',
        validate: {
          notEmpty: true,
          unique: true,
        },
      },
      vehicle_info: {
        type: 'JSON',
        validate: {
          notEmpty: true,
          isValidVehicle: (value) => {
            const validTypes = ['bicycle', 'motorbike', 'car', 'van', 'truck'];
            if (!value || !value.type || !validTypes.includes(value.type)) {
              throw new Error('Invalid vehicle type');
            }
            if (!value.capacity || value.capacity < 1) {
              throw new Error('Vehicle capacity must be at least 1');
            }
          },
       
        },
      },
      country: {
        validate: {
          isIn: ['US', 'GB', 'EU', 'CA', 'AU', 'MW', 'TZ', 'KE', 'MZ', 'ZA', 'IN', 'CM', 'GH', 'MX', 'ER'],
          notEmpty: { msg: 'Country is required' },
        },
        defaultValue: 'MW',
      },
      google_location: { type: 'JSON', allowNull: true },
      detected_location: { type: 'JSONB', allowNull: true },
      manual_location: { type: 'JSONB', allowNull: true },
      location_source: { type: 'ENUM', values: ['ip', 'gps', 'manual'], allowNull: true },
      profile_picture_url: { type: 'STRING', allowNull: true },
      license_picture_url: { type: 'STRING', allowNull: true },
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
                throw new Error('Invalid location visibility setting');
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
    },
    SECURITY: {
      MFA_METHODS: ['SMS', 'EMAIL', 'AUTH_APP', 'BIOMETRIC'],
      TOKEN_EXPIRY_MINUTES: 30,
      MAX_ACTIVE_TOKENS: 3,
      KYC_REQUIREMENTS: ['drivers_license', 'vehicle_insurance', 'background_check'],
      ENCRYPTION_ALGORITHM: 'AES-256-GCM',
      SALT_ROUNDS: 10,
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
        BANNED: 'banned',
      },
      ROLES: {
        DRIVER: 'driver',
      },
    },
  },
};