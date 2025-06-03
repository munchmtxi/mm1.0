'use strict';

const Joi = require('joi');
const reviewConstants = require('@constants/customer/review/reviewConstants');

const submitReviewSchema = Joi.object({
  serviceId: Joi.number().integer().positive().required(),
  serviceType: Joi.string().valid('order', 'in_dining_order', 'booking', 'ride').required(),
  rating: Joi.number().integer().min(reviewConstants.REVIEW_SETTINGS.RATING_MIN_INT).max(reviewConstants.REVIEW_SETTINGS.RATING_MAX_INT).required(),
  comment: Joi.string().max(reviewConstants.REVIEW_SETTINGS.MAX_COMMENT_LENGTH).optional().allow(''),
  title: Joi.string().max(reviewConstants.REVIEW_SETTINGS.MAX_TITLE_LENGTH).optional().allow(''),
  photos: Joi.array().items(Joi.string().uri()).max(reviewConstants.REVIEW_SETTINGS.MAX_PHOTOS).optional(),
  anonymous: Joi.boolean().optional(),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(reviewConstants.REVIEW_SETTINGS.RATING_MIN_INT).max(reviewConstants.REVIEW_SETTINGS.RATING_MAX_INT).optional(),
  comment: Joi.string().max(reviewConstants.REVIEW_SETTINGS.MAX_COMMENT_LENGTH).optional().allow(''),
  title: Joi.string().max(reviewConstants.REVIEW_SETTINGS.MAX_TITLE_LENGTH).optional().allow(''),
  photos: Joi.array().items(Joi.string().uri()).max(reviewConstants.REVIEW_SETTINGS.MAX_PHOTOS).optional(),
  anonymous: Joi.boolean().optional(),
}).min(1);

const manageInteractionSchema = Joi.object({
  action: Joi.string().valid(...reviewConstants.REVIEW_SETTINGS.ALLOWED_INTERACTION_TYPES).required(),
  comment: Joi.string().when('action', { is: 'comment', then: Joi.required(), otherwise: Joi.optional().allow(null) }),
});

module.exports = { submitReviewSchema, updateReviewSchema, manageInteractionSchema };