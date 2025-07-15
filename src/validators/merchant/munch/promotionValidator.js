'use strict';

const Joi = require('joi');
const munchConstants = require('@constants/common/munchConstants');
const { AppError } = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const createPromotionSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
  details: Joi.object({
    name: Joi.string().trim().min(1).required(),
    type: Joi.string().valid(...munchConstants.PROMOTION_TYPES).required(),
    description: Joi.string().allow('').optional(),
    value: Joi.number().positive().optional(),
    code: Joi.string().trim().optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().greater(Joi.ref('start_date')).optional(),
    min_purchase_amount: Joi.number().min(0).optional(),
    usage_limit: Joi.number().integer().positive().optional(),
    customer_eligibility: Joi.string().valid('all', 'new', 'loyalty').optional(),
    menuItems: Joi.array().items(Joi.number().integer().positive()).optional(),
    rules: Joi.array()
      .items(
        Joi.object({
          rule_type: Joi.string().required(),
          conditions: Joi.object().required(),
          priority: Joi.number().integer().min(1).optional(),
        }),
      )
      .optional(),
  }).required(),
});

const manageLoyaltyProgramSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
  tiers: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().trim().min(1).required(),
        pointsRequired: Joi.number().integer().positive().required(),
        rewards: Joi.object().required(),
        rewardId: Joi.number().integer().positive().required(),
      }),
    )
    .min(1)
    .required(),
});

const redeemPointsSchema = Joi.object({
  customerId: Joi.number().integer().positive().required(),
  rewardId: Joi.number().integer().positive().required(),
});

const validateCreatePromotion = (req, res, next) => {
  const { error } = createPromotionSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

const validateManageLoyaltyProgram = (req, res, next) => {
  const { error } = manageLoyaltyProgramSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

const validateRedeemPoints = (req, res, next) => {
  const { error } = redeemPointsSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

module.exports = {
  validateCreatePromotion,
  validateManageLoyaltyProgram,
  validateRedeemPoints,
};