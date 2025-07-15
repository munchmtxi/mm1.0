'use strict';

const { body, query } = require('express-validator');

/**
 * Validation for fetching customer services
 */
const validateGetCustomerServices = [
  query('languageCode')
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Invalid language code'),
];

/**
 * Validation for cancelling a service
 */
const validateCancelService = [
  body('serviceType')
    .notEmpty()
    .isIn(['mtables', 'munch', 'in_dining', 'mtxi', 'mpark'])
    .withMessage('Invalid service type'),
  body('serviceId')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Invalid service ID'),
  body('languageCode')
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Invalid language code'),
];

module.exports = {
  validateGetCustomerServices,
  validateCancelService,
};