'use strict';

const express = require('express');
const router = express.Router();
const {
  manageFriendListAction,
  setFriendPermissionsAction,
  facilitateGroupChatAction,
  createPostAction,
  managePostReactionsAction,
  shareStoryAction,
  inviteFriendToServiceAction,
  splitBillAction,
} = require('@controllers/customer/social/socialController');
const {
  manageFriendSchema,
  setFriendPermissionsSchema,
  facilitateGroupChatSchema,
  createPostSchema,
  managePostReactionsSchema,
  shareStorySchema,
  inviteFriendToServiceSchema,
  splitBillSchema,
} = require('@validators/customer/social/socialValidator');
const {
  manageFriendList,
  setFriendPermissions,
  facilitateGroupChat,
  createPost,
  managePostReactions,
  shareStory,
  inviteFriendToService,
  splitBill,
} = require('@middleware/customer/social/socialMiddleware');
const { validate } = require('@middleware/common');

router.post('/friends', manageFriendList, validate(manageFriendSchema), manageFriendListAction);
router.post('/permissions', setFriendPermissions, validate(setFriendPermissionsSchema), setFriendPermissionsAction);
router.post('/chat/:chatId', facilitateGroupChat, validate(facilitateGroupChatSchema), facilitateGroupChatAction);
router.post('/post', createPost, validate(createPostSchema), createPostAction);
router.post('/post/:postId/reaction', managePostReactions, validate(managePostReactionsSchema), managePostReactionsAction);
router.post('/story', shareStory, validate(shareStorySchema), shareStoryAction);
router.post('/invite', inviteFriendToService, validate(inviteFriendToServiceSchema), inviteFriendToServiceAction);
router.post('/bill-split', splitBill, validate(splitBillSchema), splitBillAction);

module.exports = router;