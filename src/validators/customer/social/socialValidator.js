'use strict';

const Joi = require('joi');
const socialConstants = require('@constants/customer/social/socialConstants');

const manageFriendSchema = Joi.object({
  friendId: Joi.number().integer().positive().required(),
  action: Joi.string().valid(...socialConstants.SOCIAL_SETTINGS.FRIEND_ACTIONS).required(),
});

const setFriendPermissionsSchema = Joi.object({
  friendId: Joi.number().integer().positive().required(),
  permissions: Joi.object(
    socialConstants.SOCIAL_SETTINGS.PERMISSION_TYPES.reduce((acc, perm) => ({
      ...acc,
      [perm]: Joi.boolean().optional(),
    }), {})
  ).required(),
});

const facilitateGroupChatSchema = Joi.object({
  message: Joi.string().max(1000).optional(),
  media: Joi.object({
    type: Joi.string().valid('image', 'video').required(),
    url: Joi.string().uri().required(),
  }).optional(),
  pinned: Joi.boolean().optional(),
  serviceType: Joi.string().valid('booking', 'order', 'ride', 'event').optional(),
  serviceId: Joi.number().integer().positive().when('serviceType', { is: Joi.exist(), then: Joi.required() }),
}).xor('message', 'media');

const createPostSchema = Joi.object({
  content: Joi.string().max(socialConstants.SOCIAL_SETTINGS.MAX_POST_LENGTH).optional(),
  media: Joi.object({
    type: Joi.string().valid('image', 'video').required(),
    urls: Joi.array().items(Joi.string().uri()).max(socialConstants.SOCIAL_SETTINGS.MAX_MEDIA_FILES).required(),
  }).optional(),
  privacy: Joi.string().valid(...socialConstants.SOCIAL_SETTINGS.POST_PRIVACY).required(),
  serviceType: Joi.string().valid('booking', 'order', 'ride', 'event').optional(),
  serviceId: Joi.number().integer().positive().when('serviceType', { is: Joi.exist(), then: Joi.required() }),
}).or('content', 'media');

const managePostReactionsSchema = Joi.object({
  reaction: Joi.string().valid(...socialConstants.SOCIAL_SETTINGS.REACTION_TYPES).required(),
});

const shareStorySchema = Joi.object({
  media: Joi.object({
    type: Joi.string().valid(...socialConstants.SOCIAL_SETTINGS.STORY_TYPES).required(),
    url: Joi.string().uri().required(),
  }).required(),
  serviceType: Joi.string().valid('booking', 'order', 'ride', 'event').optional(),
  serviceId: Joi.number().integer().positive().when('serviceType', { is: Joi.exist(), then: Joi.required() }),
});

const inviteFriendToServiceSchema = Joi.object({
  friendId: Joi.number().integer().positive().required(),
  serviceType: Joi.string().valid('booking', 'order', 'ride', 'event').required(),
  serviceId: Joi.number().integer().positive().required(),
  method: Joi.string().valid(...socialConstants.SOCIAL_SETTINGS.INVITE_METHODS).required(),
});

const splitBillSchema = Joi.object({
  serviceType: Joi.string().valid('booking', 'order', 'ride', 'event').required(),
  serviceId: Joi.number().integer().positive().required(),
  splitType: Joi.string().valid(...socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES).required(),
  participants: Joi.array().items(Joi.number().integer().positive()).min(1).max(socialConstants.SOCIAL_SETTINGS.MAX_SPLIT_PARTICIPANTS).required(),
  amounts: Joi.object().when('splitType', {
    is: Joi.string().valid('custom', 'itemized'),
    then: Joi.object().pattern(Joi.number().integer().positive(), Joi.number().positive()).required(),
    otherwise: Joi.forbidden(),
  }),
});

module.exports = {
  manageFriendSchema,
  setFriendPermissionsSchema,
  facilitateGroupChatSchema,
  createPostSchema,
  managePostReactionsSchema,
  shareStorySchema,
  inviteFriendToServiceSchema,
  splitBillSchema,
};