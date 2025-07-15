'use strict';

const { body } = require('express-validator');
const localizationConstants = require('@constants/common/localizationConstants');
const { formatMessage } = require('@utils/localization');

/**
 * Subscription validation middleware
 */
module.exports = {
  enrollSubscription: [
    body('planId').isString().withMessage((_, { req }) => 
      formatMessage('customer', 'subscription', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_plan_id')),
    body('serviceType').isString().withMessage((_, { req }) => 
      formatMessage('customer', 'subscription', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_service_type')),
  ],
  manageSubscription: [
    body('subscriptionId').isInt().withMessage((_, { req }) => 
      formatMessage('customer', 'subscription', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_subscription_id')),
    body('action').isString().isIn(['UPGRADE', 'DOWNGRADE']).withMessage((_, { req }) => 
      formatMessage('customer', 'subscription', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_action')),
    body('newPlanId').optional().isString().withMessage((_, { req }) => 
      formatMessage('customer', 'subscription', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_plan_id')),
  ],
  cancelSubscription: [
    body('subscriptionId').isInt().withMessage((_, { req }) => 
      formatMessage('customer', 'subscription', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_subscription_id')),
  ],
};