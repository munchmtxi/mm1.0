'use strict';

const { 
  Staff, 
  Wallet, 
  WalletTransaction, 
  Payment, 
  Merchant, 
  MerchantBranch, 
  Driver, 
  Customer, 
  DataAccess 
} = require('../models');
const staffConstants = require('@constants/staff/staffConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const driverConstants = require('@constants/driver/driverConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/localizationConstants');

/**
 * Processes secure payment for merchant
 * @param {Object} paymentData - Payment details
 * @returns {Object} Payment record
 */
const processSecurePayment = async (paymentData) => {
  const { customer_id, merchant_id, branch_id, amount, payment_method, order_id, driver_id } = paymentData;

  const [customer, merchant, branch] = await Promise.all([
    Customer.findByPk(customer_id, { include: [{ model: DataAccess, as: 'user' }] }),
    Merchant.findByPk(merchant_id),
    MerchantBranch.findByPk(branch_id),
  ]);

  if (!customer) throw new Error(customerConstants.ERROR_CODES[1]);
  if (!merchant) throw new Error(merchantConstants.ERROR_CODES[1]);
  if (branch_id && !branch) throw new Error(staffConstants.STAFF_ERROR_CODES[14]);

  if (!merchantConstants.WALLET_CONSTANTS.PAYMENT_METHODS.includes(payment_method)) {
    throw new Error(merchantConstants.ERROR_CODES[2]);
  }

  const payment = await Payment.create({
    customer_id,
    merchant_id,
    branch_id,
    order_id,
    driver_id,
    amount,
    payment_method,
    status: merchantConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[0], // pending
    currency: merchant.currency || localizationConstants.DEFAULT_CURRENCY,
    transaction_id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    risk_score: calculateRiskScore(paymentData),
    provider: customerConstants.WALLET_CONSTANTS.SECURITY_SETTINGS.TOKENIZATION_PROVIDER,
    verification_attempts: 0,
  });

  if (payment.status === 'completed') {
    await updateWalletBalances(customer_id, merchant_id, branch_id, amount, payment.currency, driver_id);
  }

  return payment;
};

/**
 * Calculates payment risk score
 * @param {Object} paymentData - Payment details
 * @returns {number} Risk score
 */
const calculateRiskScore = (paymentData) => {
  const { amount, customer_id, merchant_id } = paymentData;
  let score = 0;

  if (amount > merchantConstants.WALLET_CONSTANTS.PAYOUT_SETTINGS.MAX_PAYOUT_AMOUNT) score += 30;

  return Math.min(score, 100);
};

/**
 * Updates wallet balances for all parties
 * @param {number} customerId - Customer ID
 * @param {number} merchantId - Merchant ID
 * @param {number} branchId - Branch ID
 * @param {number} amount - Transaction amount
 * @param {string} currency - Currency
 * @param {number} driverId - Driver ID
 */
const updateWalletBalances = async (customerId, merchantId, branchId, amount, currency, driverId) => {
  const [customerWallet, merchantWallet, driverWallet] = await Promise.all([
    Wallet.findOne({ where: { user_id: customerId } }),
    Wallet.findOne({ where: { merchant_id: merchantId } }),
    driverId ? Wallet.findOne({ where: { user_id: driverId } }) : null,
  ]);

  if (!customerWallet || customerWallet.balance < amount) {
    throw new Error(customerConstants.ERROR_CODES[3]);
  }

  await customerWallet.update({ balance: customerWallet.balance - amount });
  await merchantWallet.update({ balance: merchantWallet.balance + amount * 0.9 }); // 90% to merchant
  if (driverWallet) await driverWallet.update({ balance: driverWallet.balance + amount * 0.1 }); // 10% to driver

  await Promise.all([
    WalletTransaction.create({
      wallet_id: customerWallet.id,
      type: customerConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[2], // order_payment
      amount,
      currency,
      status: customerConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1], // completed
    }),
    WalletTransaction.create({
      wallet_id: merchantWallet.id,
      type: merchantConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1], // completed
      amount: amount * 0.9,
      currency,
      status: merchantConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1], // completed
    }),
    driverWallet && WalletTransaction.create({
      wallet_id: driverWallet.id,
      type: driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[1], // delivery_earning
      amount: amount * 0.1,
      currency,
      status: driverConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1], // completed
    }),
  ]);
};

/**
 * Processes secure refund
 * @param {number} paymentId - Payment ID
 * @param {Object} refundData - Refund details
 * @returns {Object} Refund details
 */
const processSecureRefund = async (paymentId, refundData) => {
  const payment = await Payment.findByPk(paymentId, {
    include: [
      { model: Customer, as: 'customer' },
      { model: Merchant, as: 'merchant' },
      { model: Driver, as: 'driver' },
    ],
  });

  if (!payment) throw new Error(customerConstants.ERROR_CODES[4]);
  if (payment.status !== 'completed') throw new Error('Payment not eligible for refund');

  await payment.update({
    status: merchantConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[3], // refunded
    refund_status: merchantConstants.COMPLIANCE_CONSTANTS.CERTIFICATION_STATUSES[1], // approved
    refund_details: { 
      reason: refundData.reason || 'Merchant-initiated refund', 
      timestamp: new Date(),
      approver: refundData.approver_id,
    },
  });

  await updateWalletBalances(
    payment.customer_id, 
    payment.merchant_id, 
    payment.branch_id, 
    -payment.amount, 
    payment.currency, 
    payment.driver_id
  );

  return { payment_id: paymentId, status: 'refunded', reason: refundData.reason };
};

/**
 * Logs secure transaction for auditing
 * @param {number} paymentId - Payment ID
 * @returns {Object} Transaction log
 */
const logSecureTransaction = async (paymentId) => {
  const payment = await Payment.findByPk(paymentId, {
    include: [
      { model: Customer, as: 'customer' },
      { model: Merchant, as: 'merchant' },
      { model: MerchantBranch, as: 'branch' },
      { model: Driver, as: 'driver' },
    ],
  });

  if (!payment) throw new Error(customerConstants.ERROR_CODES[4]);

  const log = {
    payment_id: paymentId,
    customer_id: payment.customer_id,
    merchant_id: payment.merchant_id,
    branch_id: payment.branch_id,
    driver_id: payment.driver_id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    action: merchantConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[1], // payment_processed
    timestamp: new Date(),
  };

  return log;
};

/**
 * Verifies staff payment permissions
 * @param {number} staffId - Staff ID
 * @param {string} action - Payment action
 * @returns {boolean} Permission status
 */
const verifyStaffPaymentPermissions = async (staffId, action) => {
  const staff = await Staff.findByPk(staffId, {
    include: [{ model: Permission, as: 'permissions' }],
  });

  if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES[1]);
  return staff.permissions.some(p => p.name === action && staffConstants.STAFF_PERMISSIONS[staff.staff_types[0]].includes(action));
};

module.exports = {
  processSecurePayment,
  calculateRiskScore,
  updateWalletBalances,
  processSecureRefund,
  logSecureTransaction,
  verifyStaffPaymentPermissions,
};