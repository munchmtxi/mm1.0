'use strict';

/**
 * Merchant Profile Events
 * Defines WebSocket event constants for merchant profile operations, including business details,
 * country settings, localization, gamification, media management, and branch operations. Supports
 * real-time communication for the Merchant Role System.
 *
 * Last Updated: May 14, 2025
 */

module.exports = {
  // Client-to-server events (merchant actions)
  UPDATE_BUSINESS_DETAILS: 'merchant:profile:business:update',
  SET_COUNTRY_SETTINGS: 'merchant:profile:country:set',
  MANAGE_LOCALIZATION: 'merchant:profile:localization:manage',
  TRACK_PROFILE_GAMIFICATION: 'merchant:profile:gamification:track',
  UPLOAD_MENU_PHOTOS: 'merchant:media:menu:upload',
  MANAGE_PROMOTIONAL_MEDIA: 'merchant:media:promotional:manage',
  UPDATE_MEDIA_METADATA: 'merchant:media:metadata:update',
  DELETE_MEDIA: 'merchant:media:delete',
  UPDATE_BRANCH_DETAILS: 'merchant:branch:details:update',
  CONFIGURE_BRANCH_SETTINGS: 'merchant:branch:settings:configure',
  MANAGE_BRANCH_MEDIA: 'merchant:branch:media:manage',
  SYNC_BRANCH_PROFILES: 'merchant:branch:profiles:sync',

  // Server-to-client events (notifications)
  BUSINESS_DETAILS_UPDATED: 'merchant:profile:business:updated',
  COUNTRY_SETTINGS_UPDATED: 'merchant:profile:country:updated',
  LOCALIZATION_UPDATED: 'merchant:profile:localization:updated',
  GAMIFICATION_POINTS_AWARDED: 'merchant:profile:gamification:awarded',
  MENU_PHOTOS_UPLOADED: 'merchant:media:menu:uploaded',
  PROMOTIONAL_MEDIA_UPDATED: 'merchant:media:promotional:updated',
  MEDIA_METADATA_UPDATED: 'merchant:media:metadata:updated',
  MEDIA_DELETED: 'merchant:media:deleted',
  BRANCH_DETAILS_UPDATED: 'merchant:branch:details:updated',
  BRANCH_SETTINGS_CONFIGURED: 'merchant:branch:settings:configured',
  BRANCH_MEDIA_UPDATED: 'merchant:branch:media:updated',
  BRANCH_PROFILES_SYNCED: 'merchant:branch:profiles:synced',
  ERROR: 'merchant:profile:error',
};