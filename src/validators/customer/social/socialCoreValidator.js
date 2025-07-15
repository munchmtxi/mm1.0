'use strict';

const Joi = require('joi');

/**
 * Validates input for social core-related endpoints.
 */
module.exports = {
  manageFriendList: Joi.object({
    friendId: Joi.number().integer().positive().required(),
    action: Joi.string().valid('add', 'remove', 'accept', 'reject').required(),
  }),

  setFriendPermissions: Joi.object({
    friendId: Joi.number().integer().positive().required(),
    permissions: Joi.object({
      viewPosts: Joi.boolean().default(true),
      viewStories: Joi.boolean().default(true),
      sendMessages: Joi.boolean().default(true),
    }).required(),
  }),

  facilitateGroupChat: Joi.object({
    chatId: Joi.number().integer().positive().required(),
    message: Joi.string().max(1000).optional(),
    media: Joi.object({
      type: Joi.string().valid('image', 'video').optional(),
      url: Joi.string().uri().optional(),
    }).optional(),
  }).or('message', 'media'),
};