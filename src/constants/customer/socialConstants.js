'use strict';

module.exports = {
  SOCIAL_SETTINGS: {
    FRIEND_ACTIONS: ['ADD', 'REMOVE', 'ACCEPT', 'REJECT', 'BLOCK'],
    PERMISSION_TYPES: [
      'VIEW_PROFILE',
      'VIEW_BOOKINGS',
      'VIEW_ORDERS',
      'VIEW_RIDES',
      'VIEW_EVENTS',
      'VIEW_PARKING',
      'VIEW_STAYS',
      'VIEW_TICKETS',
      'SPLIT_PAYMENT',
      'SEND_INVITES',
      'SHARE_POSTS'
    ],
    POST_TYPES: ['TEXT', 'IMAGE', 'VIDEO', 'BOOKING', 'ORDER', 'RIDE', 'EVENT', 'PARKING', 'STAY', 'TICKET', 'LIVE_EVENT'],
    POST_PRIVACY: ['PUBLIC', 'FRIENDS', 'PRIVATE'],
    REACTION_TYPES: ['LIKE', 'LOVE', 'YUM', 'WOW', 'FUN'],
    STORY_TYPES: ['IMAGE', 'VIDEO', 'LIVE'],
    STORY_DURATION_HOURS: 24,
    GROUP_CHAT_SETTINGS: {
      MAX_PARTICIPANTS: 100,
      MAX_MESSAGES_PER_HOUR: 200,
      ROLES: ['ADMIN', 'MEMBER'],
      MAX_MEDIA_SIZE_MB: 100,
      SUPPORTED_PLATFORMS: ['in_app', 'whatsapp', 'telegram', 'facebook', 'instagram', 'x', 'snapchat', 'tiktok']
    },
    INVITE_METHODS: ['APP', 'SMS', 'EMAIL', 'WHATSAPP', 'TELEGRAM'],
    BILL_SPLIT_TYPES: ['EQUAL', 'CUSTOM', 'ITEMIZED', 'PERCENTAGE', 'SPONSOR_CONTRIBUTION', 'CROWDFUNDED'],
    MAX_SPLIT_PARTICIPANTS: 100,
    MAX_POST_LENGTH: 2000,
    MAX_MEDIA_FILES: 10
  },
  ERROR_CODES: [
    'INVALID_CUSTOMER',
    'INVALID_FRIEND',
    'INVALID_ACTION',
    'PENDING_REQUEST',
    'NOT_FRIEND',
    'INVALID_PERMISSIONS',
    'INVALID_CHAT',
    'NOT_CHAT_MEMBER',
    'SOCIAL_ACTION_FAILED',
    'INVALID_POST',
    'INVALID_REACTION',
    'INVALID_STORY',
    'CHAT_LIMIT_EXCEEDED',
    'UNAUTHORIZED',
    'ALREADY_REACTED',
    'INVALID_INVITE',
    'MAX_FRIENDS_EXCEEDED',
    'INVALID_BILL_SPLIT'
  ],
  SUCCESS_MESSAGES: [
    'FRIEND_ADDED',
    'POST_CREATED',
    'STORY_SHARED',
    'CHAT_MESSAGE_SENT',
    'BILL_SPLIT_COMPLETED',
    'INVITE_SENT',
    'STAY_SHARED',
    'TICKET_SHARED'
  ]
};