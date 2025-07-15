// preOrderMiddleware.js
// Middleware for validating staff mtables pre-order requests.

'use strict';

const { processPreOrderSchema, preparePreOrderedFoodSchema, notifyPreOrderStatusSchema } = require('@validators/staff/mtables/preOrderValidator');

async function validateProcessPreOrder(req, res, next) {
  try {
    await processPreOrderSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validatePreparePreOrderedFood(req, res, next) {
  try {
    await preparePreOrderedFoodSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateNotifyPreOrderStatus(req, res, next) {
  try {
    await notifyPreOrderStatusSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateProcessPreOrder,
  validatePreparePreOrderedFood,
  validateNotifyPreOrderStatus,
};