'use strict';

const Joi = require('joi');

/**
 * Validates input for social content-related endpoints.
 */
module.exports = {
  createPost: Joi.object({
    content: Joi.string().max(500).required(),
    media: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('image', 'video').required(),
        url: Joi.string().uri().required(),
      })
    ).optional(),
    visibility: Joi.string().valid('public', 'friends', 'private').default('public'),
  }),

  managePostReactions: Joi.object({
    postId: Joi.number().integer().positive().required(),
    reaction: Joi.string().valid('like', 'love', 'laugh', 'sad', 'angry').required(),
  }),

  shareStory: Joi.object({
    media: Joi.object({
      type: Joi.string().valid('image', 'video').required(),
      url: Joi.string().uri().required(),
    }).required(),
    caption: Joi.string().max(200).optional(),
    duration: Joi.number().integer().min(1).max(24).default(24), // Duration in hours
  }),

  inviteFriendToService: Joi.object({
    friendId: Joi.number().integer().positive().required(),
    serviceType: Joi.string().valid('event', 'table', 'deal').required(),
    serviceId: Joi.number().integer().positive().required(),
  }),
};