'use strict';

const { param, body } = require('express-validator');
const { formatMessage } = require('@utils/localization');

const validateAmendBranchMenu = [
  param('branchId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'branchMenu.errors.invalidBranchId')),
  body('addItems')
    .optional()
    .isArray()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'branchMenu.errors.invalidAddItems')),
  body('addItems.*.name')
    .optional()
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'branchMenu.errors.invalidItemName')),
  body('addItems.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage(formatMessage('merchant', 'menu', 'en', 'branchMenu.errors.invalidPrice')),
  body('addItems.*.categoryId')
    .optional()
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'branchMenu.errors.invalidCategoryId')),
  body('updateItems')
    .optional()
    .isArray()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'branchMenu.errors.invalidUpdateItems')),
  body('updateItems.*.id')
    .optional()
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'branchMenu.errors.invalidItemId')),
  body('removeItemIds')
    .optional()
    .isArray()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'branchMenu.errors.invalidRemoveItemIds')),
  body('removeItemIds.*')
    .optional()
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'branchMenu.errors.invalidItemId')),
  body('images')
    .optional()
    .isArray()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'branchMenu.errors.invalidImages')),
  body('images.*.url')
    .optional()
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'branchMenu.errors.invalidImageUrl')),
];

const validateViewBranchMenu = [
  param('branchId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'branchMenu.errors.invalidBranchId')),
];

module.exports = { validateAmendBranchMenu, validateViewBranchMenu };