'use strict';

const { body, query } = require('express-validator');
const customerConstants = require('@constants/customer/customerConstants');

module.exports = {
  createInDiningOrder: [
    body('customerId').isUUID().withMessage(customerConstants.ERROR_TYPES[10]), // INVALID_CUSTOMER_ID
    body('branchId').isUUID().withMessage(customerConstants.ERROR_TYPES[21]), // INVALID_BRANCH_ID
    body('tableId').isUUID().withMessage(customerConstants.ERROR_TYPES[6]), // TABLE_NOT_AVAILABLE
    body('cartId').isUUID().withMessage(customerConstants.ERROR_TYPES[22]), // INVALID_CART
    body('notes').optional().isString().trim().isLength({ max: 500 }).withMessage(customerConstants.ERROR_TYPES[0]), // INVALID_INPUT
  ],
  updateInDiningOrder: [
    body('orderId').isUUID().withMessage(customerConstants.ERROR_TYPES[24]), // ORDER_NOT_FOUND
    body('status').optional().isIn(customerConstants.ORDER_STATUSES).withMessage(customerConstants.ERROR_TYPES[0]), // INVALID_INPUT
    body('preparationStatus').optional().isIn(['pending', 'in_progress', 'completed']).withMessage(customerConstants.ERROR_TYPES[0]), // INVALID_INPUT
    body('notes').optional().isString().trim().isLength({ max: 500 }).withMessage(customerConstants.ERROR_TYPES[0]), // INVALID_INPUT
  ],
  submitOrderFeedback: [
    body('orderId').isUUID().withMessage(customerConstants.ERROR_TYPES[24]), // ORDER_NOT_FOUND
    body('rating').isInt({ min: customerConstants.FEEDBACK_SETTINGS.MIN_RATING, max: customerConstants.FEEDBACK_SETTINGS.MAX_RATING }).withMessage(customerConstants.ERROR_TYPES[15]), // INVALID_FEEDBACK_RATING
    body('comment').optional().isString().trim().isLength({ max: 1000 }).withMessage(customerConstants.ERROR_TYPES[0]), // INVALID_INPUT
  ],
  getInDiningOrderHistory: [
    query('customerId').optional().isUUID().withMessage(customerConstants.ERROR_TYPES[10]), // INVALID_CUSTOMER_ID
    query('branchId').optional().isUUID().withMessage(customerConstants.ERROR_TYPES[21]), // INVALID_BRANCH_ID
  ],
};