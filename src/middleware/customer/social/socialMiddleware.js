'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');

module.exports = {
  manageFriendList: [authenticate, restrictTo('customer'), checkPermissions('manage_friends')],
  setFriendPermissions: [authenticate, restrictTo('customer'), checkPermissions('manage_friends')],
  facilitateGroupChat: [authenticate, restrictTo('customer'), checkPermissions('manage_chats')],
  createPost: [authenticate, restrictTo('customer'), checkPermissions('social_post')],
  managePostReactions: [authenticate, restrictTo('customer'), checkPermissions('social_react')],
  shareStory: [authenticate, restrictTo('customer'), checkPermissions('social_post')],
  inviteFriendToService: [authenticate, restrictTo('customer'), checkPermissions('invite_friends')],
  splitBill: [authenticate, restrictTo('customer'), checkPermissions('split_payment')],
};