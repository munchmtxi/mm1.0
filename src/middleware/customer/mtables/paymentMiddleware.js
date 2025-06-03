'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/auth/authMiddleware');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const mtablesConstants = require('@constants/mtablesConstants');
const paymentConstants = require('@constants/paymentConstants');
const { Wallet, Payment } = require('@models');

const checkPaymentAccess = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { walletId, transactionId } = req.body;

  logger.info('Validating payment access', { customerId, walletId, transactionId });

  if (walletId) {
    const wallet = await Wallet.findByPk(walletId);
    if (!wallet || wallet.customer_id !== customerId) {
      throw new AppError('Wallet not found', 400, mtablesConstants.ERROR_CODES.find(c => c === 'WALLET_NOT_FOUND') || 'WALLET_NOT_FOUND');
    }
  }

  if (transactionId) {
    const payment = await Payment.findOne({ where: { transaction_id: transactionId } });
    if (!payment || payment.customer_id !== customerId) {
      throw new AppError('Invalid transaction', 400, mtablesConstants.ERROR_CODES.find(c => c === 'INVALID_TRANSACTION') || 'INVALID_TRANSACTION');
    }
  }

  next();
});

module.exports = {
  authenticate,
  restrictTo,
  checkPermissions,
  checkPaymentAccess,
};