/**
 * authConstants.js
 *
 * Defines core constants for the Authentication System, governing user authentication and authorization.
 * Aligns with customerConstants.js, munchConstants.js, mtablesConstants.js, meventsConstants.js, and rideConstants.js.
 *
 * Last Updated: May 27, 2025
 */

'use strict';

module.exports = {
  AUTH_SETTINGS: {
    DEFAULT_ROLE: 'customer',
    SUPPORTED_ROLES: ['admin', 'customer', 'driver', 'merchant', 'staff'],
    PROTECTED_ROLES: ['admin', 'staff']
  },
  USER_STATUSES: ['active', 'inactive', 'pending_verification', 'suspended', 'terminated', 'banned'],
  RBAC_CONSTANTS: {
    PERMISSION_LEVELS: ['read', 'write', 'delete', 'approve', 'configure', 'audit', 'escalate', 'restricted'],
    ROLE_PERMISSIONS: {
      customer: {
        manageProfile: ['read', 'write'],
        manageBookings: ['read', 'write', 'cancel'],
        manageOrders: ['read', 'write', 'cancel'],
        manageRides: ['read', 'write', 'cancel'],
        manageWallet: ['read', 'write'],
        viewAnalytics: ['read'],
        manageSocial: ['read', 'write'],
        manageSupport: ['read', 'write']
      }
    }
  },
  MFA_CONSTANTS: {
    MFA_METHODS: ['sms', 'email', 'auth_app', 'biometric'],
    MFA_STATUSES: ['enabled', 'disabled', 'pending'],
    MFA_ATTEMPT_LIMIT: 3,
    MFA_LOCKOUT_DURATION_MINUTES: 15
  },
  SESSION_CONSTANTS: {
    MAX_SESSIONS_PER_USER: { customer: 5 },
    SESSION_TIMEOUT_MINUTES: { customer: 60 },
    SESSION_STATUSES: ['active', 'expired', 'terminated'],
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30
  },
  ERROR_CODES: [
    'INVALID_CREDENTIALS', 'TOKEN_EXPIRED', 'TOKEN_INVALID', 'MFA_FAILED',
    'ACCOUNT_LOCKED', 'PERMISSION_DENIED', 'USER_NOT_FOUND', 'VERIFICATION_FAILED',
    'SESSION_EXPIRED'
  ],
  SUCCESS_MESSAGES: [
    'User logged in', 'Token refreshed', 'MFA enabled', 'Password reset',
    'User verified', 'Session terminated'
  ]
};