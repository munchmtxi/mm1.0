'use strict';

const { PaymentMethod, BankAccount, Service, Reward } = require('@models');
const AppError = require('@utils/AppError');
const paymentConstants = require('@constants/common/paymentConstants');
const customerConstants = require('@constants/customer/customerConstants');

async function verifyPaymentMethod(req, res, next) {
  const { paymentMethod } = req.body;
  const method = await PaymentMethod.findByPk(paymentMethod.id);
  if (!method || method.type !== paymentMethod.type.toUpperCase()) {
    return next(new AppError('Invalid payment method', 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD));
  }
  next();
}

async function verifyDestination(req, res, next) {
  const { destination } = req.body;
  const account = await BankAccount.findByPk(destination.id);
  if (!account || account.account_number !== destination.accountNumber || account.bank_name !== destination.bankName) {
    return next(new AppError('Invalid destination', 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD));
  }
  next();
}

async function verifyService(req, res, next) {
  const { serviceId } = req.body;
  const service = await Service.findByPk(serviceId);
  if (!service) {
    return next(new AppError('Service not found', 404, customerConstants.ERROR_CODES.SERVICE_NOT_FOUND));
  }
  next();
}

async function verifyReward(req, res, next) {
  const { rewardId } = req.body;
  const reward = await Reward.findByPk(rewardId);
  if (!reward) {
    return next(new AppError('Reward not found', 404, customerConstants.ERROR_CODES.INVALID_REWARD));
  }
  next();
}

module.exports = {
  verifyPaymentMethod,
  verifyDestination,
  verifyService,
  verifyReward,
};