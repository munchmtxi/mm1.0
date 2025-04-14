'use strict';

module.exports = {
  // Client-to-server events (merchant actions)
  UPDATE_PROFILE: 'merchant:profile:update',
  UPDATE_NOTIFICATIONS: 'merchant:profile:notifications:update',
  CHANGE_PASSWORD: 'merchant:profile:password:change',
  UPDATE_GEOLOCATION: 'merchant:profile:geolocation:update',
  UPDATE_MEDIA: 'merchant:profile:media:update',
  CREATE_BRANCH: 'merchant:branch:create',
  UPDATE_BRANCH: 'merchant:branch:update',
  DELETE_BRANCH: 'merchant:branch:delete',
  BULK_UPDATE_BRANCHES: 'merchant:branches:bulk:update',
  GET_PLACE_DETAILS: 'merchant:place:details',
  GET_ADDRESS_PREDICTIONS: 'merchant:place:predictions',

  // Server-to-client events (notifications)
  PROFILE_UPDATED: 'merchant:profile:updated',
  NOTIFICATIONS_UPDATED: 'merchant:profile:notifications:updated',
  PASSWORD_CHANGED: 'merchant:profile:password:changed',
  GEOLOCATION_UPDATED: 'merchant:profile:geolocation:updated',
  MEDIA_UPDATED: 'merchant:profile:media:updated',
  BRANCH_CREATED: 'merchant:branch:created',
  BRANCH_UPDATED: 'merchant:branch:updated',
  BRANCH_DELETED: 'merchant:branch:deleted',
  BRANCHES_BULK_UPDATED: 'merchant:branches:bulk:updated',
  PLACE_DETAILS_RECEIVED: 'merchant:place:details:received',
  ADDRESS_PREDICTIONS_RECEIVED: 'merchant:place:predictions:received',
  ERROR: 'merchant:profile:error',
};