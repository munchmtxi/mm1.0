// inventoryMiddleware.js
// Middleware for validating staff munch inventory requests.

'use strict';

const { trackInventoryQuantity, processRestockAlert, validateUpdateInventory } = require('@validators/staff/munch/inventoryValidator');

async function validateTrackInventory(req, res, next) {
  try {
    await trackInventoryQuantitySchema.validateAsync({ restaurantId: req.params.restaurantId });
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateProcessRestockAlert(req, res, next) {
  try {
    await processRestockAlertSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateUpdateInventory(req, res, next) {
  try {
    await updateInventorySchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateTrackInventory,
  validateProcessRestockAlert,
  validateUpdateInventory,
};