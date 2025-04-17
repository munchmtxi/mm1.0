'use strict';

const PROFILE = {
  ERRORS: {
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
    PASSWORD_UNAVAILABLE: 'PASSWORD_UNAVAILABLE',
    INVALID_PASSWORD: 'INVALID_PASSWORD',
    INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
    INVALID_ACTION: 'INVALID_ACTION',
    FRIEND_NOT_FOUND: 'FRIEND_NOT_FOUND',
    FRIENDSHIP_EXISTS: 'FRIENDSHIP_EXISTS',
    REQUEST_PENDING: 'REQUEST_PENDING',
    REQUEST_NOT_FOUND: 'REQUEST_NOT_FOUND',
    FRIENDSHIP_NOT_FOUND: 'FRIENDSHIP_NOT_FOUND',
    ADDRESS_RESOLUTION_FAILED: 'ADDRESS_RESOLUTION_FAILED',
    ADDRESS_NOT_FOUND: 'ADDRESS_NOT_FOUND',
    NO_FILE_PROVIDED: 'NO_FILE_PROVIDED',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    NO_PROFILE_PICTURE: 'NO_PROFILE_PICTURE',
    INVALID_ROLE: 'INVALID_ROLE',
    ADDRESS_UNAUTHORIZED: 'ADDRESS_UNAUTHORIZED',
  },
  ACTIONS: {
    FRIEND: {
      ADD: 'add',
      ACCEPT: 'accept',
      REMOVE: 'remove',
      BLOCK: 'block',
      REJECT: 'reject', 
    },
    ADDRESS: {
      ADD: 'add',
      REMOVE: 'remove',
      SET_DEFAULT: 'setDefault',
    },
    PAYMENT: {
      ADD: 'add',
      REMOVE: 'remove',
      SET_DEFAULT: 'setDefault',
    },
  },
  VISIBILITY: {
    PUBLIC: 'public',
    FRIENDS: 'friends',
    PRIVATE: 'private',
  },
  FRIEND_REQUEST_STATUS: {
    OPEN: 'open',
    RESTRICTED: 'restricted',
    CLOSED: 'closed',
  },
  CONNECTION_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    BLOCKED: 'blocked',
  },
  SOCKET_EVENTS: {
    PROFILE_UPDATED: 'profile:updated',
    FRIEND_REQUEST_SENT: 'friend:request_sent',
    FRIEND_REQUEST_ACCEPTED: 'friend:request_accepted',
    FRIEND_REQUEST_REJECTED: 'friend:request_rejected',
    FRIEND_REMOVED: 'friend:removed',
    FRIEND_BLOCKED: 'friend:blocked',
    ADDRESS_UPDATED: 'address:updated',
    PROFILE_PICTURE_UPDATED: 'profile_picture:updated',
    PROFILE_PICTURE_DELETED: 'profile_picture:deleted',
  },
};

module.exports = { PROFILE };