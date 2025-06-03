'use strict';

/**
 * Security Constants
 * Centralized security configurations for all roles (admin, customer, driver, staff, merchant).
 * Defines MFA methods, encryption settings, and token policies.
 */

module.exports = {
  SECURITY_CONSTANTS: {
    ROLES: {
      ADMIN: {
        MFA_METHODS: ['EMAIL', 'APP'],
        TOKEN_EXPIRY_MINUTES: 15,
        ENCRYPTION_ALGORITHM: 'aes-256-cbc',
        SALT_ROUNDS: 12,
        MAX_ACTIVE_TOKENS: 3,
        ERROR_CODES: {
          SECURITY_INCIDENT: 'SEC_001',
          INVALID_MFA_METHOD: 'SEC_002',
          TOKEN_LIMIT_EXCEEDED: 'SEC_003',
        },
      },
      CUSTOMER: {
        MFA_METHODS: ['SMS', 'EMAIL'],
        TOKEN_EXPIRY_MINUTES: 10,
        ENCRYPTION_ALGORITHM: 'aes-256-cbc',
        SALT_ROUNDS: 10,
        MAX_ACTIVE_TOKENS: 2,
        ERROR_CODES: {
          SECURITY_INCIDENT: 'SEC_001',
          INVALID_MFA_METHOD: 'SEC_002',
          TOKEN_LIMIT_EXCEEDED: 'SEC_003',
        },
      },
      DRIVER: {
        MFA_METHODS: ['SMS', 'APP'],
        TOKEN_EXPIRY_MINUTES: 10,
        ENCRYPTION_ALGORITHM: 'aes-256-cbc',
        SALT_ROUNDS: 10,
        MAX_ACTIVE_TOKENS: 2,
        ERROR_CODES: {
          SECURITY_INCIDENT: 'SEC_001',
          INVALID_MFA_METHOD: 'SEC_002',
          TOKEN_LIMIT_EXCEEDED: 'SEC_003',
        },
      },
      STAFF: {
        MFA_METHODS: ['EMAIL', 'APP'],
        TOKEN_EXPIRY_MINUTES: 15,
        ENCRYPTION_ALGORITHM: 'aes-256-cbc',
        SALT_ROUNDS: 12,
        MAX_ACTIVE_TOKENS: 3,
        ERROR_CODES: {
          SECURITY_INCIDENT: 'SEC_001',
          INVALID_MFA_METHOD: 'SEC_002',
          TOKEN_LIMIT_EXCEEDED: 'SEC_003',
        },
      },
      MERCHANT: {
        MFA_METHODS: ['EMAIL', 'SMS'],
        TOKEN_EXPIRY_MINUTES: 15,
        ENCRYPTION_ALGORITHM: 'aes-256-cbc',
        SALT_ROUNDS: 12,
        MAX_ACTIVE_TOKENS: 3,
        ERROR_CODES: {
          SECURITY_INCIDENT: 'SEC_001',
          INVALID_MFA_METHOD: 'SEC_002',
          TOKEN_LIMIT_EXCEEDED: 'SEC_003',
        },
      },
    },
    // Common encryption key length (bytes)
    ENCRYPTION_KEY_LENGTH: 32,
    // Common IV length for AES-256-CBC (bytes)
    IV_LENGTH: 16,
  },
};