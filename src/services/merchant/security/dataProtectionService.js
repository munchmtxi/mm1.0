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
 * Encrypts sensitive merchant data
 * @param {Object} data - Data to encrypt
 * @returns {string} Encrypted data
 */
const encryptMerchantData = async (data) => {
  const { createCipheriv, randomBytes } = require('crypto');
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = randomBytes(16);
  const cipher = createCipheriv(staffConstants.STAFF_SECURITY_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Manages merchant data access permissions
 * @param {number} userId - User ID
 * @param {Object} permissions - Share permissions
 * @returns {Object} Updated DataAccess
 */
const manageDataAccess = async (userId, permissions) => {
  const dataAccess = await DataAccess.findOrCreate({
    where: { user_id: userId },
    defaults: {
      shareWithMerchants: permissions.shareWithMerchants || false,
      shareWithThirdParties: permissions.shareWithThirdParties || false,
    },
  });

  if (!dataAccess[1]) {
    await dataAccess[0].update(permissions);
  }

  return dataAccess[0];
};

/**
 * Validates merchant data compliance
 * @param {number} merchantId - Merchant ID
 * @returns {boolean} Compliance status
 */
const validateDataCompliance = async (merchantId) => {
  const merchant = await Merchant.findByPk(merchantId, {
    include: [
      { model: MerchantBranch, as: 'branches' },
      { model: Staff, as: 'staff' },
    ],
  });

  if (!merchant) throw new Error(merchantConstants.ERROR_CODES[1]);

  const required = merchantConstants.COMPLIANCE_CONSTANTS.REGULATORY_REQUIREMENTS;
  const details = merchant.business_type_details || {};
  const staffCompliance = merchant.staff.every(s => 
    s.certifications?.every(c => 
      staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS.includes(c)
    )
  );
  return required.every(req => details[req]) && staffCompliance;
};

/**
 * Audits staff data access across branches
 * @param {number} staffId - Staff ID
 * @param {string} action - Audit action
 * @returns {Object} Audit log
 */
const auditStaffDataAccess = async (staffId, action) => {
  const staff = await Staff.findByPk(staffId, {
    include: [
      { model: Merchant, as: 'merchant' },
      { model: MerchantBranch, as: 'branch' },
      { model: Permission, as: 'permissions' },
    ],
  });

  if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES[1]);
  if (!staffConstants.STAFF_AUDIT_ACTIONS.includes(action)) {
    throw new Error(staffConstants.STAFF_ERROR_CODES[2]);
  }

  const log = {
    staff_id: staffId,
    merchant_id: staff.merchant_id,
    branch_id: staff.branch_id,
    permissions: staff.permissions.map(p => p.name),
    action,
    timestamp: new Date(),
  };

  return log;
};

/**
 * Generates merchant data analytics
 * @param {number} merchantId - Merchant ID
 * @returns {Object} Analytics report
 */
const generateDataAnalytics = async (merchantId) => {
  const merchant = await Merchant.findByPk(merchantId, {
    include: [
      { model: Payment, as: 'payments' },
      { model: Staff, as: 'staff' },
      { model: MerchantBranch, as: 'branches' },
    ],
  });

  if (!merchant) throw new Error(merchantConstants.ERROR_CODES[1]);

  const metrics = merchantConstants.ANALYTICS_CONSTANTS.METRICS;
  const report = {
    merchant_id: merchantId,
    order_volume: merchant.payments.length,
    revenue: merchant.payments.reduce((sum, p) => sum + p.amount, 0),
    customer_retention: await calculateRetentionRate(merchantId),
    staff_performance: merchant.staff.map(s => ({
      id: s.id,
      metrics: s.performance_metrics || {},
    })),
    branch_count: merchant.branches.length,
    timestamp: new Date(),
    format: merchantConstants.ANALYTICS_CONSTANTS.REPORT_FORMATS[2], // json
  };

  return metrics.reduce((acc, metric) => ({ ...acc, [metric]: report[metric] || 0 }), {});
};

/**
 * Calculates customer retention rate
 * @param {number} merchantId - Merchant ID
 * @returns {number} Retention rate
 */
const calculateRetentionRate = async (merchantId) => {
  const payments = await Payment.findAll({
    where: { merchant_id: merchantId },
    attributes: ['customer_id'],
    group: ['customer_id'],
    having: sequelize.where(sequelize.fn('COUNT', sequelize.col('customer_id')), '>=', 2),
  });

  return (payments.length / await Customer.count()) * 100 || 0;
};

/**
 * Manages merchant branch data permissions
 * @param {number} branchId - Branch ID
 * @param {Object} permissions - Branch permissions
 * @returns {Object} Updated branch
 */
const manageBranchDataPermissions = async (branchId, permissions) => {
  const branch = await MerchantBranch.findByPk(branchId);
  if (!branch) throw new Error(staffConstants.STAFF_ERROR_CODES[14]);

  const validPermissions = permissions.filter(p => 
    staffConstants.STAFF_PERMISSIONS[branch.staff_types?.[0] || 'manager'].includes(p)
  );
  await branch.update({ payment_methods: { ...branch.payment_methods, data_permissions: validPermissions } });

  return branch;
};

module.exports = {
  encryptMerchantData,
  manageDataAccess,
  validateDataCompliance,
  auditStaffDataAccess,
  generateDataAnalytics,
  manageBranchDataPermissions,
};