'use strict';

module.exports = {
  CUSTOMER_AUTH_CONSTANTS: {
    REGISTRATION_FIELDS: {
      MANDATORY: [
        'first_name',
        'last_name',
        'phone_number',
        'country',
        'address',
        'preferred_language',
        'preferred_currency',
        'email',
        'password',
      ],
      OPTIONAL: [
        'google_location',
        'detected_location',
        'manual_location',
        'location_source',
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
        defaultValue: 'Default Address',
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
      TOKEN_EXPIRY_MINUTES: 60,
      MAX_ACTIVE_TOKENS: 5,
      KYC_REQUIREMENTS: ['ID_DOCUMENT', 'ADDRESS_PROOF'],
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
    LOCALIZATION: {
      SUPPORTED_CITIES: {
        US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'San Francisco'],
        GB: ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Edinburgh'],
        EU: ['Berlin', 'Paris', 'Amsterdam', 'Rome', 'Madrid'],
        CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
        AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
        MW: ['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba'],
        TZ: ['Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza'],
        KE: ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret'],
        MZ: ['Maputo', 'Beira', 'Nampula', 'Matola'],
        ZA: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
        IN: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad'],
        CM: ['Douala', 'Yaoundé'],
        GH: ['Accra', 'Kumasi'],
        MX: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla'],
        ER: ['Asmara', 'Keren', 'Massawa'],
      },
      SUPPORTED_MAP_PROVIDERS: {
        US: 'google_maps', GB: 'google_maps', EU: 'openstreetmap', CA: 'google_maps', AU: 'google_maps',
        MW: 'openstreetmap', TZ: 'openstreetmap', KE: 'openstreetmap', MZ: 'openstreetmap',
        ZA: 'openstreetmap', IN: 'google_maps', CM: 'openstreetmap', GH: 'openstreetmap',
        MX: 'google_maps', ER: 'openstreetmap',
      },
      DATE_FORMATS: {
        US: 'MM/DD/YYYY', GB: 'DD/MM/YYYY', EU: 'DD/MM/YYYY', CA: 'MM/DD/YYYY', AU: 'DD/MM/YYYY',
        MW: 'DD/MM/YYYY', TZ: 'DD/MM/YYYY', KE: 'DD/MM/YYYY', MZ: 'DD/MM/YYYY', ZA: 'DD/MM/YYYY',
        IN: 'DD/MM/YYYY', CM: 'DD/MM/YYYY', GH: 'DD/MM/YYYY', MX: 'DD/MM/YYYY', ER: 'DD/MM/YYYY',
      },
      TIME_FORMATS: {
        US: '12h', GB: '24h', EU: '24h', CA: '12h', AU: '24h',
        MW: '24h', TZ: '24h', KE: '24h', MZ: '24h', ZA: '24h',
        IN: '24h', CM: '24h', GH: '24h', MX: '24h', ER: '24h',
      },
      NUMBER_FORMATS: {
        DECIMAL_SEPARATOR: { US: '.', CA: '.', AU: '.', others: ',' },
        THOUSAND_SEPARATOR: { US: ',', CA: ',', AU: ',', others: '.' },
      },
      LANGUAGE_FALLBACK: 'en',
      RTL_LANGUAGES: ['am', 'ti'],
      AI_LOCALIZATION: {
        AUTO_TRANSLATE: true,
        SUGGESTED_LANGUAGES: true,
        DYNAMIC_CURRENCY_CONVERSION: true,
      },
    },
    SOCIAL_EXPERIENCE: {
      INVITE_METHODS: ['APP', 'SMS', 'EMAIL', 'WHATSAPP', 'TELEGRAM'],
      BILL_SPLIT_TYPES: ['EQUAL', 'CUSTOM', 'ITEMIZED', 'PERCENTAGE', 'SPONSOR_CONTRIBUTION'],
      POST_TYPES: ['TEXT', 'IMAGE', 'VIDEO', 'BOOKING', 'ORDER', 'RIDE', 'EVENT', 'PARKING', 'LIVE_EVENT'],
      REACTION_TYPES: ['LIKE', 'LOVE', 'YUM', 'WOW', 'FUN'],
    },
    AUTH: {
      STATUS: {
        ACTIVE: 'active',
        INACTIVE: 'inactive',
      },
      ROLES: {
        CUSTOMER: 'customer',
      },
    },
  },
};