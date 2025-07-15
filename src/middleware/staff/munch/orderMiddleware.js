// orderMiddleware.js
// Middleware for validating staff munch order requests.

'use strict';

const { confirmTakeawayOrderSchema, prepareDeliveryFoodSchema, logOrderCompletionSchema } = require('@validators/staff/munch/orderValidator');

async function validateConfirmTakeawayOrder(req, res, next) {
  try {
    await confirmTakeawayOrderSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validatePrepareDeliveryFood(req, res, next) {
  try {
    await prepareDeliveryFoodSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateLogOrderCompletion(req, res, next) {
  try {
    await logOrderCompletionSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateConfirmTakeawayOrder,
  validatePrepareDeliveryFood,
  validateLogOrderCompletion,
};