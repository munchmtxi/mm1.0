'use strict';

const { param, body } = require('express-validator');
const { formatMessage } = require('@utils/localization');

const validateCreateMenu = [
  param('restaurantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidRestaurantId')),
  body('items')
    .isArray()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidItems')),
  body('items.*.name')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidItemName')),
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidPrice')),
  body('categories')
    .isArray()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidCategories')),
  body('categories.*.name')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidCategoryName')),
];

const validateUpdateMenu = [
  param('menuId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidMenuId')),
  body('name')
    .optional()
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidItemName')),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidPrice')),
  body('categoryId')
    .optional()
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidCategoryId')),
];

const validateApplyDynamicPricing = [
  param('menuId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidMenuId')),
  body('type')
    .isString()
    .isIn(['percentage', 'fixed_amount', 'buy_x_get_y', 'bundle', 'loyalty', 'flash_sale'])
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidPromotionType')),
  body('value')
    .isFloat({ min: 0 })
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidPromotionValue')),
  body('startDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidStartDate')),
  body('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage(formatMessage('merchant', 'menu', 'en', 'menu.errors.invalidEndDate')),
];

module.exports = { validateCreateMenu, validateUpdateMenu, validateApplyDynamicPricing };