// supplyMiddleware.js
// Middleware for validating staff mtables supply requests.

'use strict';

const { monitorSuppliesSchema, requestRestockSchema, logSupplyReadinessSchema } = require('@validators/staff/mtables/supplyValidator');

async function validateMonitorSupplies(req, res, next) {
  try {
    await monitorSuppliesSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateRequestRestock(req, res, next) {
  try {
    await requestRestockSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateLogSupplyReadiness(req, res, next) {
  try {
    await logSupplyReadinessSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateMonitorSupplies,
  validateRequestRestock,
  validateLogSupplyReadiness,
};