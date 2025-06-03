'use strict';

module.exports = {
  SOCIAL_SETTINGS: {
    FRIEND_ACTIONS: ['add', 'remove', 'accept', 'reject', 'block'],
    PERMISSION_TYPES: ['view_profile', 'view_posts', 'view_stories', 'send_messages', 'view_bookings', 'view_orders', 'view_rides', 'view_events', 'split_payment'],
    POST_TYPES: ['text', 'image', 'video', 'booking', 'order', 'ride', 'event'],
    POST_PRIVACY: ['public', 'friends', 'private'],
    REACTION_TYPES: ['like', 'love', 'yum', 'wow', 'fun'],
    STORY_TYPES: ['image', 'video'],
    STORY_DURATION_HOURS: 24,
    GROUP_CHAT_SETTINGS: {
      MAX_PARTICIPANTS: 50,
      MAX_MESSAGES_PER_HOUR: 100,
      ROLES: ['admin', 'member'],
      MAX_MEDIA_SIZE_MB: 50,
    },
    INVITE_METHODS: ['app', 'sms', 'email'],
    BILL_SPLIT_TYPES: ['equal', 'custom', 'itemized'],
    MAX_SPLIT_PARTICIPANTS: 10,
    MAX_POST_LENGTH: 1000,
    MAX_MEDIA_FILES: 5,
  },
  ERROR_CODES: [
    'INVALID_CUSTOMER', 'INVALID_FRIEND', 'INVALID_ACTION', 'PENDING_REQUEST',
    'NOT_FRIEND', 'INVALID_PERMISSIONS', 'INVALID_CHAT', 'NOT_CHAT_MEMBER',
    'SOCIAL_ACTION_FAILED', 'INVALID_POST', 'INVALID_REACTION', 'INVALID_STORY',
    'CHAT_LIMIT_EXCEEDED', 'UNAUTHORIZED', 'ALREADY_REACTED', 'INVALID_INVITE',
    'MAX_FRIENDS_EXCEEDED', 'INVALID_BILL_SPLIT', 'INVALID_SERVICE'
  ],
};