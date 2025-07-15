// deliveryMiddleware.js
// Middleware for validating staff munch delivery requests.

'use strict';

const { assignDriverSchema, prepareDeliveryPackageSchema, trackDriverStatusSchema } = require('@validators/staff/munch/deliveryValidator');

async function validateAssignDriver(req, res, next) {
  try {
    await assignDriverSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validatePrepareDeliveryPackage(req, res, next) {
  try {
    await prepareDeliveryPackageSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateTrackDriverStatus(req, res, next) {
  try {
    await trackDriverStatusSchema.validateAsync({ orderId: req.params.orderId });
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateAssignDriver,
  validatePrepareDeliveryPackage,
  validateTrackDriverStatus,
};