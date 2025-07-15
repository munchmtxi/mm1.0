// walletMiddleware.js
// Middleware for validating wallet-related requests.

'use strict';

const { createWalletSchema, processPaymentSchema, processPayoutSchema, getBalanceSchema, getHistorySchema } = require('@validators/merchant/wallet/walletValidator');

async function validateCreateWallet(req, res, next) {
  try {
    await createWalletSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateProcessPayment(req, res, next) {
  try {
    await processPaymentSchema.validateAsync(req.body);
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

async function validateGetBalance(req, res, next) {
  try {
    await getBalanceSchema.validateAsync(req.query);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateGetHistory(req, res, next) {
  try {
    await getHistorySchema.validateAsync(req.query);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateCreateWallet,
  validateProcessPayment,
  validateProcessPayout,
  validateGetBalance,
  validateGetHistory,
};