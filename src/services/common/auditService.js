'use strict';

/**
 * Audit Service
 * Logs actions for admins, merchants, customers, staff, and drivers for compliance and audit trails.
 * Admins can audit all user actions; merchants can audit staff and customer actions.
 * Used across all service files for consistent logging.
 * Last Updated: June 25, 2025
 */

const { AuditLog, User } = require('@models');
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

/**
 * Logs an action to the audit log.
 * @param {Object} auditData - Audit data.
 * @param {string} auditData.userId - User ID performing the action.
 * @param {string} auditData.role - Role ('admin', 'merchant', 'customer', 'staff', 'driver').
 * @param {string} auditData.action - Action type from respective constants.
 * @param {Object} [auditData.details] - Action details.
 * @param {string} auditData.ipAddress - IP address of the request.
 * @param {Object} [auditData.metadata] - Optional metadata (e.g., session ID, device info).
 * @param {Object} [transaction] - Optional Sequelize transaction.
 * @returns {Promise<Object>} Audit log record.
 */
async function logAction(auditData, transaction = null) {
  try {
    const { userId, role, action, details = {}, ipAddress, metadata = {} } = auditData;

    // Validate inputs
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new AppError('Invalid user ID', 400, getErrorCode(role), null, { userId });
    }

    const validRoles = ['admin', 'merchant', 'customer', 'staff', 'driver'];
    if (!role || !validRoles.includes(role)) {
      throw new AppError('Invalid role', 400, getErrorCode(role), null, { role });
    }

    // Validate action against role-specific constants
    const validActions = getValidActions(role);
    if (!action || !Object.values(validActions).includes(action)) {
      throw new AppError('Invalid action', 400, getErrorCode(role), null, { action });
    }

    if (!ipAddress || !isValidIpAddress(ipAddress)) {
      throw new AppError('Invalid IP address', 400, getErrorCode(role), null, { ipAddress });
    }

    // Validate user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404, getErrorCode(role), null, { userId });
    }

    // Sanitize details and metadata
    const sanitizedDetails = sanitize(JSON.stringify(details), {
      allowedTags: [],
      allowedAttributes: {},
    });
    const sanitizedMetadata = sanitize(JSON.stringify(metadata), {
      allowedTags: [],
      allowedAttributes: {},
    });

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
  } catch (error) {
    logger.error('Audit logging failed', { error: error.message, auditData });
    throw error instanceof AppError
      ? error
      : new AppError(
          `Audit logging failed: ${error.message}`,
          500,
          getErrorCode(auditData.role),
          null,
          { auditData }
        );
  }
}

/**
 * Retrieves audit logs based on role and permissions.
 * @param {Object} query - Query parameters.
 * @param {string} query.requesterId - ID of the user requesting logs.
 * @param {string} query.requesterRole - Role of the requester ('admin', 'merchant').
 * @param {string} [query.targetUserId] - Optional user ID to filter logs.
 * @param {string} [query.targetRole] - Optional role to filter logs.
 * @param {string} [query.action] - Optional action type to filter logs.
 * @param {Date} [query.startDate] - Optional start date for logs.
 * @param {Date} [query.endDate] - Optional end date for logs.
 * @param {number} [query.limit=50] - Number of logs to return.
 * @param {number} [query.offset=0] - Offset for pagination.
 * @returns {Promise<Object>} Audit logs and metadata.
 */
async function getAuditLogs(query) {
  try {
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
      allowedRoles = ['staff', 'customer'];
    }

    // Validate target role if provided
    if (targetRole && !allowedRoles.includes(targetRole)) {
      throw new AppError(
        'Unauthorized role access',
        403,
        getErrorCode(requesterRole),
        null,
        { targetRole }
      );
    }

    // Build query conditions
    const where = {};
    if (targetUserId) where.user_id = targetUserId;
    if (targetRole) where.role = targetRole;
    if (action) where.log_type = action;
    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
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
  } catch (error) {
    logger.error('Audit log retrieval failed', { error: error.message, query });
    throw error instanceof AppError
      ? error
      : new AppError(
          `Audit log retrieval failed: ${error.message}`,
          500,
          getErrorCode(query.requesterRole),
          null,
          { query }
        );
  }
}

/**
 * Gets valid actions for a role.
 * @param {string} role - User role.
 * @returns {Object} Valid actions for the role.
 */
function getValidActions(role) {
  switch (role) {
    case 'admin':
      return adminCoreConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.reduce((acc, action) => {
        acc[action] = action;
        return acc;
      }, {});
    case 'merchant':
      return merchantConstants.STAFF_CONSTANTS.DEFAULT_TASK_TYPES.reduce((acc, action) => {
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

/**
 * Gets error code based on role.
 * @param {string} role - User role.
 * @returns {string} Error code.
 */
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

/**
 * Validates IP address.
 * @param {string} ipAddress - IP address to validate.
 * @returns {boolean} True if valid.
 */
function isValidIpAddress(ipAddress) {
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ipAddress) || ipv6Regex.test(ipAddress);
}

module.exports = {
  logAction,
  getAuditLogs,
};