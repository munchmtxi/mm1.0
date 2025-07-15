// orderMiddleware.js
// Middleware for validating staff mtables order requests.

'use strict';

const { processExtraOrderSchema, prepareDineInOrderSchema, logOrderMetricsSchema } = require('@validators/staff/mtables/orderValidator');

async function validateProcessExtraOrder(req, res, next) {
  try {
    await processExtraOrderSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validatePrepareDineInOrder(req, res, next) {
  try {
    await prepareDineInOrderSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateLogOrderMetrics(req, res, next) {
  try {
    await logOrderMetricsSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateProcessExtraOrder,
  validatePrepareDineInOrder,
  validateLogOrderMetrics,
};