'use strict';

/**
 * Audit Service
 * Admins track all user actions; merchants track staff/customer actions.
 * Last Updated: July 17, 2025
 */

const { AuditLog, User, Merchant, Staff, Customer, Driver, Admin } = require('@models');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const customerConstants = require('@constants/customer/customerConstants');
const staffConstants = require('@constants/staff/staffConstants');
const driverConstants = require('@constants/driver/driverConstants');
const { sanitize } = require('sanitize-html');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const NodeCache = require('node-cache');
const { Op } = require('sequelize');

// Initialize cache for audit queries
const auditCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });


async function logAction(auditData, transaction = null) {
  const { userId, role, action, details = {}, ipAddress, metadata = {} } = auditData;

  // Validate inputs
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new AppError('Invalid user ID', 400, getErrorCode(role), null, { userId });
  }

  const validRoles = ['admin', 'merchant', 'customer', 'staff', 'driver'];
  if (!role || !validRoles.includes(role)) {
    throw new AppError('Invalid role', 400, getErrorCode(role), null, { role });
  }

  // Validate action
  const validActions = getValidActions(role);
  if (!action || !Object.values(validActions).includes(action)) {
    throw new AppError('Invalid action', 400, getErrorCode(role), null, { action });
  }

  if (!ipAddress || !isValidIpAddress(ipAddress)) {
    throw new AppError('Invalid IP address', 400, getErrorCode(role), null, { ipAddress });
  }

  // Validate user exists
  const user = await User.findByPk(userId, { transaction });
  if (!user) {
    throw new AppError('User not found', 404, getErrorCode(role), null, { userId });
  }

  // Sanitize details and metadata
  const sanitizedDetails = sanitize(JSON.stringify(details), { allowedTags: [], allowedAttributes: {} });
  const sanitizedMetadata = sanitize(JSON.stringify(metadata), { allowedTags: [], allowedAttributes: {} });

  // Create audit log
  const auditRecord = await AuditLog.create(
    {
      user_id: userId.trim(),
      role,
      log_type: action,
      details: JSON.parse(sanitizedDetails),
      ip_address: ipAddress,
      metadata: JSON.parse(sanitizedMetadata),
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  logger.info('Audit log created', { auditId: auditRecord.id, userId, role, action });
  return auditRecord;
}


async function getAuditLogs(query) {
  const {
    requesterId,
    requesterRole,
    targetUserId,
    targetRole,
    action,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = query;

  // Validate requester
  if (!requesterId || typeof requesterId !== 'string' || requesterId.trim() === '') {
    throw new AppError('Invalid requester ID', 400, getErrorCode(requesterRole));
  }

  if (!['admin', 'merchant'].includes(requesterRole)) {
    throw new AppError('Invalid requester role', 400, getErrorCode(requesterRole));
  }

  const requester = await User.findByPk(requesterId);
  if (!requester) {
    throw new AppError('Requester not found', 404, getErrorCode(requesterRole));
  }

  // Role-based access control
  let allowedRoles = [];
  if (requesterRole === 'admin') {
    allowedRoles = ['admin', 'merchant', 'customer', 'staff', 'driver'];
  } else if (requesterRole === 'merchant') {
    const merchant = await Merchant.findOne({ where: { user_id: requesterId } });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, getErrorCode(requesterRole));
    }
    allowedRoles = ['staff', 'customer'];
  }

  // Validate target role
  if (targetRole && !allowedRoles.includes(targetRole)) {
    throw new AppError('Unauthorized role access', 403, getErrorCode(requesterRole), null, { targetRole });
  }

  // Validate merchant access to staff/customer
  if (requesterRole === 'merchant' && targetUserId) {
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      throw new AppError('Target user not found', 404, getErrorCode(requesterRole));
    }

    if (targetRole === 'staff') {
      const staff = await Staff.findOne({ where: { user_id: targetUserId, merchant_id: (await Merchant.findOne({ where: { user_id: requesterId } })).id } });
      if (!staff) {
        throw new AppError('Staff not associated with merchant', 403, getErrorCode(requesterRole));
      }
    } else if (targetRole === 'customer') {
      const customer = await Customer.findOne({ where: { user_id: targetUserId } });
      if (!customer) {
        throw new AppError('Customer not found', 404, getErrorCode(requesterRole));
      }
      // Check if customer interacted with merchant (e.g., orders/bookings)
      const hasInteraction = await sequelize.models.Order.findOne({
        where: { customer_id: customer.id, merchant_id: (await Merchant.findOne({ where: { user_id: requesterId } })).id },
      }) || await sequelize.models.Booking.findOne({
        where: { customer_id: customer.id, merchant_id: (await Merchant.findOne({ where: { user_id: requesterId } })).id },
      });
      if (!hasInteraction) {
        throw new AppError('No interaction with customer', 403, getErrorCode(requesterRole));
      }
    }
  }

  // Build query conditions
  const where = {};
  if (targetUserId) where.user_id = targetUserId;
  if (targetRole) where.role = targetRole;
  if (action) where.log_type = action;
  if (startDate && endDate) {
    where.created_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }

  // Check cache
  const cacheKey = `audit_${JSON.stringify({ ...query, limit, offset })}`;
  const cachedResult = auditCache.get(cacheKey);
  if (cachedResult) {
    logger.info('Audit logs retrieved from cache', { cacheKey });
    return cachedResult;
  }

  // Query database
  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }],
    limit,
    offset,
    order: [['created_at', 'DESC']],
  });

  const result = {
    logs: rows,
    total: count,
    limit,
    offset,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(count / limit),
  };

  // Cache result
  auditCache.set(cacheKey, result);
  logger.info('Audit logs retrieved', { requesterId, count, role: requesterRole });

  return result;
}

function getValidActions(role) {
  switch (role) {
    case 'admin':
      return adminCoreConstants.COMPLIANCE_OPERATIONS.AUDIT_TYPES.reduce((acc, action) => {
        acc[action] = action;
        return acc;
      }, {});
    case 'merchant':
      return merchantConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.reduce((acc, action) => {
        acc[action] = action;
        return acc;
      }, {});
    case 'customer':
      return customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.reduce((acc, action) => {
        acc[action] = action;
        return acc;
      }, {});
    case 'staff':
      return staffConstants.STAFF_AUDIT_ACTIONS.reduce((acc, action) => {
        acc[action] = action;
        return acc;
      }, {});
    case 'driver':
      return driverConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.reduce((acc, action) => {
        acc[action] = action;
        return acc;
      }, {});
    default:
      return {};
  }
}


function getErrorCode(role) {
  switch (role) {
    case 'admin':
      return adminCoreConstants.ERROR_CODES.find((code) => code === 'PERMISSION_DENIED') || 'PERMISSION_DENIED';
    case 'merchant':
      return merchantConstants.ERROR_CODES.find((code) => code === 'PERMISSION_DENIED') || 'PERMISSION_DENIED';
    case 'customer':
      return customerConstants.ERROR_CODES.find((code) => code === 'PERMISSION_DENIED') || 'PERMISSION_DENIED';
    case 'staff':
      return staffConstants.STAFF_ERROR_CODES.find((code) => code === 'PERMISSION_DENIED') || 'PERMISSION_DENIED';
    case 'driver':
      return driverConstants.ERROR_CODES.find((code) => code === 'PERMISSION_DENIED') || 'PERMISSION_DENIED';
    default:
      return 'UNKNOWN_ERROR';
  }
}

function isValidIpAddress(ipAddress) {
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ipAddress) || ipv6Regex.test(ipAddress);
}

module.exports = {
  logAction,
  getAuditLogs,
  isValidIpAddress,
};