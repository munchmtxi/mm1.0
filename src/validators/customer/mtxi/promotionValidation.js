'use strict';

const { body, query } = require('express-validator');
const tipConstants = require('@constants/customer/tipConstants');
const { validate } = require('@utils/validation');

const validateRedeemPromotion = [
  body('promotionId').isInt(),
  body('serviceType').isIn(tipConstants.TIP_SETTINGS.SERVICE_TYPES),
  body('groupCustomerIds').optional().isArray(),
  body('groupCustomerIds.*').optional().isInt(),
  validate,
];

const validateGetAvailablePromotions = [
  query('serviceType').isIn(tipConstants.TIP_SETTINGS.SERVICE_TYPES),
  validate,
];

const validateCancelPromotionRedemption = [
  body('promotionId').isInt(),
  validate,
];

module.exports = {
  validateRedeemPromotion,
  validateGetAvailablePromotions,
  validateCancelPromotionRedemption,
};