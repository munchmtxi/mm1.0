'use strict';

module.exports = {
  // User Statuses (from User model)
  USER_STATUSES: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
  },

  // Admin Availability Statuses (from adminProfileService)
  AVAILABILITY_STATUSES: {
    AVAILABLE: 'available',
    BUSY: 'busy',
    OFFLINE: 'offline',
  },

  // Allowed Countries (from User model)
  ALLOWED_COUNTRIES: [
    'malawi',
    'zambia',
    'mozambique',
    'tanzania',
  ],

  // Error Codes (used in AppError)
  ERROR_CODES: {
    PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_PHONE: 'INVALID_PHONE',
    DUPLICATE_PHONE: 'DUPLICATE_PHONE',
    INVALID_PASSWORD: 'INVALID_PASSWORD',
    INVALID_NEW_PASSWORD: 'INVALID_NEW_PASSWORD',
    PASSWORD_UNAVAILABLE: 'PASSWORD_UNAVAILABLE',
    NO_FILE_UPLOADED: 'NO_FILE_UPLOADED',
    PICTURE_UPLOAD_FAILED: 'PICTURE_UPLOAD_FAILED',
    NO_PROFILE_PICTURE: 'NO_PROFILE_PICTURE',
    PICTURE_DELETE_FAILED: 'PICTURE_DELETE_FAILED',
    PROFILE_UPDATE_FAILED: 'PROFILE_UPDATE_FAILED',
    PASSWORD_CHANGE_FAILED: 'PASSWORD_CHANGE_FAILED',
    INVALID_STATUS: 'INVALID_STATUS',
    STATUS_UPDATE_FAILED: 'STATUS_UPDATE_FAILED',
    INVALID_COUNTRY: 'INVALID_COUNTRY',
  },
};