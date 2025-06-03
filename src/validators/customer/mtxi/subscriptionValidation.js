'use strict';

const { body } = require('express-validator');
const customerConstants = require('@constants/customer/customerConstants');
const { validate } = require('@utils/validation');

const validateEnrollSubscription = [
  body('planId').isIn(['BASIC', 'PREMIUM']),
  body('serviceType').isIn(['mtxi', 'munch', 'mtables']),
  body('paymentMethodId').isInt(),
  validate,
];

const validateManageSubscription = [
  body('subscriptionId').isInt(),
  body('action').isIn(['UPGRADE', 'PAUSE']),
  body('newPlanId').optional().isIn(['BASIC', 'PREMIUM']),
  body('paymentMethodId').optional().isInt(),
  validate,
];

const validateCancelSubscription = [
  body('subscriptionId').isInt(),
  validate,
];

module.exports = {
  validateEnrollSubscription,
  validateManageSubscription,
  validateCancelSubscription,
};