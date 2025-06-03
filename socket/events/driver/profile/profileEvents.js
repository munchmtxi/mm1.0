'use strict';

/**
 * Driver Profile Socket Events
 * Defines socket event names for real-time driver profile operations, including updates,
 * certification uploads, profile retrieval, and verification. Provides a mapping of event
 * properties to their string identifiers for use in handlers and other system components.
 *
 * Last Updated: May 15, 2025
 */

module.exports = {
  PROFILE_UPDATE: 'profile:update',
  CERTIFICATION_UPLOAD: 'profile:uploadCertification',
  PROFILE_GET: 'profile:get',
  PROFILE_VERIFY: 'profile:verify',
  PROFILE_UPDATED: 'profile:updated',
  CERTIFICATION_UPDATED: 'profile:certification_updated',
  PROFILE_VERIFIED: 'profile:verified',
};