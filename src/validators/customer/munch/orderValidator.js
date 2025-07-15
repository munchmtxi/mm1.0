'use strict';

const { body, param } = require('express-validator');
const localizationConstants = require('@constants/common/localizationConstants');
const customerConstants = require('@constants/customer/customerConstants');

/**
 * Validates customer order-related requests
 */
module.exports = {
  browseMerchants: [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('radiusKm').isFloat({ min: 0.1, max: 100 }).withMessage('Invalid radius'),
    body('filters').optional().isObject().withMessage('Filters must be an object'),
  ],
  addToCart: [
    body('itemId').isInt({ min: 1 }).withMessage('Invalid item ID'),
    body('quantity').isInt({ min: 1 }).withMessage('Invalid quantity'),
    body('customizations').optional().isObject().withMessage('Customizations must be an object'),
  ],
  updateCart: [
    body('cartId').isInt({ min: 1 }).withMessage('Invalid cart ID'),
    body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
    body('items.*.itemId').isInt({ min: 1 }).withMessage('Invalid item ID'),
    body('items.*.quantity').isInt({ min: 0 }).withMessage('Invalid quantity'),
    body('items.*.customizations').optional().isObject().withMessage('Customizations must be an object'),
  ],
  placeOrder: [
    body('cartId').isInt({ min: 1 }).withMessage('Invalid cart ID'),
    body('branchId').isInt({ min: 1 }).withMessage('Invalid branch ID'),
    body('deliveryLocation').isObject().withMessage('Invalid delivery location'),
    body('deliveryLocation.latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('deliveryLocation.longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  ],
  updateOrder: [
    body('orderId').isInt({ min: 1 }).withMessage('Invalid order ID'),
    body('updates').isObject().withMessage('Updates must be an object'),
  ],
  cancelOrder: [
    param('orderId').isInt({ min: 1 }).withMessage('Invalid order ID'),
  ],
};