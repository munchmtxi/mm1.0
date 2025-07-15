// payoutMiddleware.js
// Middleware for validating payout-related requests.

'use strict';

const { configurePayoutSettingsSchema, processPayoutSchema, verifyPayoutMethodSchema, getPayoutHistorySchema } = require('@validators/merchant/wallet/payoutValidator');

async function validateConfigurePayoutSettings(req, res, next) {
  try {
    await configurePayoutSettingsSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateProcessPayout(req, res, next) {
  try {
    await processPayoutSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateVerifyPayoutMethod(req, res, next) {
  try {
    await verifyPayoutMethodSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateGetPayoutHistory(req, res, next) {
  try {
    await getPayoutHistorySchema.validateAsync(req.query);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateConfigurePayoutSettings,
  validateProcessPayout,
  validateVerifyPayoutMethod,
  validateGetPayoutHistory,
};