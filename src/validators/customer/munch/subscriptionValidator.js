'use strict';

const Joi = require('joi');
const munchConstants = require('@constants/customer/munch/munchConstants');

const enrollSubscriptionSchema = Joi.object({
  planId: Joi.string().valid(...Object.keys(munchConstants.SUBSCRIPTION_CONSTANTS.PLANS)).required(),
});

const manageSubscriptionSchema = Joi.object({
  action: Joi.string().valid(...munchConstants.SUBSCRIPTION_CONSTANTS.ACTIONS).required(),
  newPlanId: Joi.string().valid(...Object.keys(munchConstants.SUBSCRIPTION_CONSTANTS.PLANS)).when('action', {
    is: Joi.string().valid(munchConstants.SUBSCRIPTION_CONSTANTS.ACTIONS[0], munchConstants.SUBSCRIPTION_CONSTANTS.ACTIONS[1]),
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  pauseDurationDays: Joi.number().integer().min(1).max(munchConstants.SUBSCRIPTION_CONSTANTS.MAX_PAUSE_DAYS).when('action', {
    is: munchConstants.SUBSCRIPTION_CONSTANTS.ACTIONS[2],
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
});

const trackSubscriptionTiersSchema = Joi.object({});

module.exports = { enrollSubscriptionSchema, manageSubscriptionSchema, trackSubscriptionTiersSchema };