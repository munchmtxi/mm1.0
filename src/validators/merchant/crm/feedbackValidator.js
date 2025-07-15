'use strict';

const { param, body } = require('express-validator');
const { formatMessage } = require('@utils/localization');
const merchantConstants = require('@constants/merchantConstants');

const validateCollectReviews = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidMerchantId')),
  body('reviewData.customerId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidCustomerId')),
  body('reviewData.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidRating')),
  body('reviewData.serviceType')
    .isIn(merchantConstants.CRM_CONSTANTS.FEEDBACK_CONSTANTS.VALID_SERVICE_TYPES)
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidServiceType')),
  body('reviewData.serviceId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidReviewData')),
  body('reviewData.comment')
    .isString()
    .optional()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidReviewData')),
];

const validateManageCommunityInteractions = [
  param('reviewId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidReviewId')),
  body('action.customerId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidCustomerId')),
  body('action.type')
    .isIn(merchantConstants.CRM_CONSTANTS.FEEDBACK_CONSTANTS.VALID_INTERACTION_TYPES)
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidActionType')),
  body('action.comment')
    .isString()
    .if(body('action.type').equals('comment'))
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidInteractionData')),
];

const validateRespondToFeedback = [
  param('reviewId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidReviewId')),
  body('response.merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidMerchantId')),
  body('response.content')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidResponseData')),
];

module.exports = { validateCollectReviews, validateManageCommunityInteractions, validateRespondToFeedback };