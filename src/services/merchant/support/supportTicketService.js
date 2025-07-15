'use strict';

const { SupportTicket, User, Table, Staff, ParkingBooking, Order, Merchant, MerchantBranch, InDiningOrder, Driver, Customer, Booking } = require('../models');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');
const { formatMessage, getDefaultLanguage } = require('@utils/localization');
const { formatDate, getStartOfDay, getEndOfDay } = require('@utils/dateTimeUtils');
const staffConstants = require('@constants/staff/staffConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const mparkConstants = require('@constants/common/mparkConstants');

async function getTickets({ merchantId, branchId, role, status, serviceType, limit = 10, offset = 0, languageCode = getDefaultLanguage() }) {
  const functionName = 'getTickets';
  try {
    // Validate inputs
    if (merchantId && !Number.isInteger(Number(merchantId))) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.invalid_merchant_id', { merchantId }),
        400,
        merchantConstants.ERROR_CODES.includes('INVALID_MERCHANT_TYPE') ? 'INVALID_MERCHANT_TYPE' : 'INVALID_INPUT',
        { merchantId }
      );
    }
    if (branchId && !Number.isInteger(Number(branchId))) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.invalid_branch_id', { branchId }),
        400,
        'INVALID_BRANCH',
        { branchId }
      );
    }
    if (role && !staffConstants.STAFF_ROLES[role]) {
      throw new AppError(
        formatMessage('staff', 'support', languageCode, 'errors.invalid_role', { role }),
        400,
        staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'INVALID_INPUT',
        { role }
      );
    }
    if (status && !mtablesConstants.SUPPORT_SETTINGS.TICKET_STATUSES.includes(status.toUpperCase())) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.invalid_ticket_status', { status }),
        400,
        mtablesConstants.ERROR_TYPES.includes('INVALID_INPUT') ? 'INVALID_INPUT' : 'INVALID_TICKET_STATUS',
        { status }
      );
    }
    if (serviceType && !['mtables', 'munch', 'mpark'].includes(serviceType)) {
      throw new AppError(
        formatMessage('customer', 'support', languageCode, 'errors.invalid_service_type', { serviceType }),
        400,
        'INVALID_SERVICE_TYPE',
        { serviceType }
      );
    }

    // Check max tickets per day
    const today = formatDate(new Date(), 'yyyy-MM-dd');
    const ticketCount = await SupportTicket.count({
      where: { created_at: { [Op.gte]: getStartOfDay(today), [Op.lte]: getEndOfDay(today) } },
    });
    if (ticketCount >= merchantConstants.SUPPORT_CONSTANTS.MAX_TICKETS_PER_DAY) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.max_tickets_exceeded'),
        429,
        'MAX_TICKETS_EXCEEDED',
        { limit: merchantConstants.SUPPORT_CONSTANTS.MAX_TICKETS_PER_DAY }
      );
    }

    const where = { deleted_at: null };
    if (merchantId) where['$merchant.id$'] = merchantId;
    if (branchId) where['$branch.id$'] = branchId;
    if (status) where.status = status.toUpperCase();
    if (serviceType) where.service_type = serviceType;

    const include = [
      { model: Customer, as: 'user', include: [{ model: User, as: 'user' }] },
      { model: Driver, as: 'user', include: [{ model: User, as: 'user' }] },
      { model: Staff, as: 'assignedTo' },
      {
        model: Order,
        as: 'deliveryOrder',
        include: [{ model: Merchant, as: 'merchant' }, { model: MerchantBranch, as: 'branch' }],
      },
      {
        model: Booking,
        as: 'booking',
        include: [{ model: Merchant, as: 'merchant' }, { model: MerchantBranch, as: 'branch' }, { model: Table, as: 'table' }],
      },
      {
        model: InDiningOrder,
        as: 'inDiningOrder',
        include: [{ model: MerchantBranch, as: 'branch' }, { model: Table, as: 'table' }],
      },
      {
        model: ParkingBooking,
        as: 'parkingBooking',
        include: [{ model: MerchantBranch, as: 'branch' }],
      },
    ];

    if (role) {
      if (!staffConstants.STAFF_ROLES[role]) {
        throw new AppError(
          formatMessage('staff', 'support', languageCode, 'errors.invalid_role', { role }),
          400,
          staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'INVALID_INPUT',
          { role }
        );
      }
      include.push({
        model: Staff,
        as: 'assignedTo',
        where: { staff_types: { [Op.contains]: [role] } },
      });
    }

    const result = await SupportTicket.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    logger.logApiEvent(
      formatMessage('merchant', 'support', languageCode, 'success.tickets_retrieved', { count: result.count }),
      { functionName, merchantId, branchId, role, status, serviceType, limit, offset }
    );

    return {
      tickets: result.rows,
      total: result.count,
      message: formatMessage('merchant', 'support', languageCode, 'success.tickets_retrieved', { count: result.count }),
    };
  } catch (error) {
    const formattedError = handleServiceError(functionName, error, error.errorCode || 'SYSTEM_ERROR');
    logger.logErrorEvent(formattedError.message, { errorCode: formattedError.code, functionName, merchantId, branchId });
    throw new AppError(formattedError.message, error.statusCode || 500, formattedError.code, error.details, error.meta);
  }
}

async function getTicketById({ ticketId, merchantId, languageCode = getDefaultLanguage() }) {
  const functionName = 'getTicketById';
  try {
    if (!Number.isInteger(Number(ticketId))) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.invalid_ticket_id', { ticketId }),
        400,
        mtablesConstants.ERROR_TYPES.includes('INVALID_INPUT') ? 'INVALID_INPUT' : 'INVALID_TICKET_ID',
        { ticketId }
      );
    }
    if (merchantId && !Number.isInteger(Number(merchantId))) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.invalid_merchant_id', { merchantId }),
        400,
        merchantConstants.ERROR_CODES.includes('INVALID_MERCHANT_TYPE') ? 'INVALID_MERCHANT_TYPE' : 'INVALID_INPUT',
        { merchantId }
      );
    }

    const where = { id: ticketId, deleted_at: null };
    if (merchantId) where['$merchant.id$'] = merchantId;

    const ticket = await SupportTicket.findOne({
      where,
      include: [
        { model: Customer, as: 'user', include: [{ model: User, as: 'user' }] },
        { model: Driver, as: 'user', include: [{ model: User, as: 'user' }] },
        { model: Staff, as: 'assignedTo' },
        {
          model: Order,
          as: 'deliveryOrder',
          include: [{ model: Merchant, as: 'merchant' }, { model: MerchantBranch, as: 'branch' }],
        },
        {
          model: Booking,
          as: 'booking',
          include: [{ model: Merchant, as: 'merchant' }, { model: MerchantBranch, as: 'branch' }, { model: Table, as: 'table' }],
        },
        {
          model: InDiningOrder,
          as: 'inDiningOrder',
          include: [{ model: MerchantBranch, as: 'branch' }, { model: Table, as: 'table' }],
        },
        {
          model: ParkingBooking,
          as: 'parkingBooking',
          include: [{ model: MerchantBranch, as: 'branch' }],
        },
      ],
    });

    if (!ticket) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.ticket_not_found', { ticketId }),
        404,
        mtablesConstants.ERROR_TYPES.includes('BOOKING_NOT_FOUND') ? 'BOOKING_NOT_FOUND' : 'TICKET_NOT_FOUND',
        { ticketId }
      );
    }

    logger.logApiEvent(
      formatMessage('merchant', 'support', languageCode, 'success.ticket_retrieved', { ticketId }),
      { functionName, ticketId, merchantId }
    );

    return {
      ticket,
      message: formatMessage('merchant', 'support', languageCode, 'success.ticket_retrieved', { ticketId }),
    };
  } catch (error) {
    const formattedError = handleServiceError(functionName, error, error.errorCode || 'SYSTEM_ERROR');
    logger.logErrorEvent(formattedError.message, { errorCode: formattedError.code, functionName, ticketId, merchantId });
    throw new AppError(formattedError.message, error.statusCode || 500, formattedError.code, error.details, error.meta);
  }
}

async function respondToTicket({ ticketId, merchantId, staffId, response, status, priority, languageCode = getDefaultLanguage() }) {
  const functionName = 'respondToTicket';
  try {
    if (!Number.isInteger(Number(ticketId))) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.invalid_ticket_id', { ticketId }),
        400,
        mtablesConstants.ERROR_TYPES.includes('INVALID_INPUT') ? 'INVALID_INPUT' : 'INVALID_TICKET_ID',
        { ticketId }
      );
    }
    if (!Number.isInteger(Number(merchantId))) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.invalid_merchant_id', { merchantId }),
        400,
        merchantConstants.ERROR_CODES.includes('INVALID_MERCHANT_TYPE') ? 'INVALID_MERCHANT_TYPE' : 'INVALID_INPUT',
        { merchantId }
      );
    }
    if (staffId && !Number.isInteger(Number(staffId))) {
      throw new AppError(
        formatMessage('staff', 'support', languageCode, 'errors.invalid_staff_id', { staffId }),
        400,
        staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'INVALID_INPUT',
        { staffId }
      );
    }
    if (status && !mtablesConstants.SUPPORT_SETTINGS.TICKET_STATUSES.includes(status.toUpperCase())) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.invalid_ticket_status', { status }),
        400,
        mtablesConstants.ERROR_TYPES.includes('INVALID_INPUT') ? 'INVALID_INPUT' : 'INVALID_TICKET_STATUS',
        { status }
      );
    }
    if (priority && !mtablesConstants.SUPPORT_SETTINGS.PRIORITIES.includes(priority.toUpperCase())) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.invalid_priority', { priority }),
        400,
        'INVALID_PRIORITY',
        { priority }
      );
    }
    if (response && response.length > mtablesConstants.SUPPORT_SETTINGS.MAX_TICKET_DESCRIPTION_LENGTH) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.max_description_length_exceeded', {
          maxLength: mtablesConstants.SUPPORT_SETTINGS.MAX_TICKET_DESCRIPTION_LENGTH,
        }),
        400,
        'INVALID_INPUT',
        { maxLength: mtablesConstants.SUPPORT_SETTINGS.MAX_TICKET_DESCRIPTION_LENGTH }
      );
    }

    const ticket = await SupportTicket.findOne({
      where: { id: ticketId, deleted_at: null, '$merchant.id$': merchantId },
      include: [{ model: Order, as: 'deliveryOrder', include: [{ model: Merchant, as: 'merchant' }] }],
    });

    if (!ticket) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.ticket_not_found', { ticketId }),
        404,
        mtablesConstants.ERROR_TYPES.includes('BOOKING_NOT_FOUND') ? 'BOOKING_NOT_FOUND' : 'TICKET_NOT_FOUND',
        { ticketId }
      );
    }

    const updates = {};
    if (response) updates.resolution_details = response;
    if (status) updates.status = status.toUpperCase();
    if (priority) updates.priority = priority.toUpperCase();
    if (staffId) updates.assigned_role_id = staffId;
    updates.updated_at = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss');

    await ticket.update(updates);

    logger.logApiEvent(
      formatMessage('merchant', 'support', languageCode, 'success.ticket_updated', { ticketId }),
      { functionName, ticketId, merchantId, staffId, status, priority }
    );

    return {
      ticket,
      message: formatMessage('merchant', 'support', languageCode, 'success.ticket_updated', { ticketId }),
    };
  } catch (error) {
    const formattedError = handleServiceError(functionName, error, error.errorCode || 'SYSTEM_ERROR');
    logger.logErrorEvent(formattedError.message, { errorCode: formattedError.code, functionName, ticketId, merchantId });
    throw new AppError(formattedError.message, error.statusCode || 500, formattedError.code, error.details, error.meta);
  }
}

async function assignTicket({ ticketId, merchantId, staffId, languageCode = getDefaultLanguage() }) {
  const functionName = 'assignTicket';
  try {
    if (!Number.isInteger(Number(ticketId))) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.invalid_ticket_id', { ticketId }),
        400,
        mtablesConstants.ERROR_TYPES.includes('INVALID_INPUT') ? 'INVALID_INPUT' : 'INVALID_TICKET_ID',
        { ticketId }
      );
    }
    if (!Number.isInteger(Number(merchantId))) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.invalid_merchant_id', { merchantId }),
        400,
        merchantConstants.ERROR_CODES.includes('INVALID_MERCHANT_TYPE') ? 'INVALID_MERCHANT_TYPE' : 'INVALID_INPUT',
        { merchantId }
      );
    }
    if (!Number.isInteger(Number(staffId))) {
      throw new AppError(
        formatMessage('staff', 'support', languageCode, 'errors.invalid_staff_id', { staffId }),
        400,
        staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'INVALID_INPUT',
        { staffId }
      );
    }

    const ticket = await SupportTicket.findOne({
      where: { id: ticketId, deleted_at: null, '$merchant.id$': merchantId },
      include: [{ model: Order, as: 'deliveryOrder', include: [{ model: Merchant, as: 'merchant' }] }],
    });

    if (!ticket) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.ticket_not_found', { ticketId }),
        404,
        mtablesConstants.ERROR_TYPES.includes('BOOKING_NOT_FOUND') ? 'BOOKING_NOT_FOUND' : 'TICKET_NOT_FOUND',
        { ticketId }
      );
    }

    const staff = await Staff.findOne({ where: { id: staffId, deleted_at: null } });
    if (!staff) {
      throw new AppError(
        formatMessage('staff', 'support', languageCode, 'errors.staff_not_found', { staffId }),
        404,
        staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'INVALID_INPUT',
        { staffId }
      );
    }

    await ticket.update({ assigned_role_id: staffId, updated_at: formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss') });

    logger.logApiEvent(
      formatMessage('merchant', 'support', languageCode, 'success.ticket_assigned', { ticketId, staffId }),
      { functionName, ticketId, merchantId, staffId }
    );

    return {
      ticket,
      message: formatMessage('merchant', 'support', languageCode, 'success.ticket_assigned', { ticketId, staffId }),
    };
  } catch (error) {
    const formattedError = handleServiceError(functionName, error, error.errorCode || 'SYSTEM_ERROR');
    logger.logErrorEvent(formattedError.message, { errorCode: formattedError.code, functionName, ticketId, merchantId, staffId });
    throw new AppError(formattedError.message, error.statusCode || 500, formattedError.code, error.details, error.meta);
  }
}

async function getStaffForAssignment({ merchantId, branchId, role, languageCode = getDefaultLanguage() }) {
  const functionName = 'getStaffForAssignment';
  try {
    if (!Number.isInteger(Number(merchantId))) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.invalid_merchant_id', { merchantId }),
        400,
        merchantConstants.ERROR_CODES.includes('INVALID_MERCHANT_TYPE') ? 'INVALID_MERCHANT_TYPE' : 'INVALID_INPUT',
        { merchantId }
      );
    }
    if (branchId && !Number.isInteger(Number(branchId))) {
      throw new AppError(
        formatMessage('merchant', 'support', languageCode, 'errors.invalid_branch_id', { branchId }),
        400,
        'INVALID_BRANCH',
        { branchId }
      );
    }
    if (role && !staffConstants.STAFF_ROLES[role]) {
      throw new AppError(
        formatMessage('staff', 'support', languageCode, 'errors.invalid_role', { role }),
        400,
        staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'INVALID_INPUT',
        { role }
      );
    }

    const where = { merchant_id: merchantId, deleted_at: null };
    if (branchId) where.branch_id = branchId;
    if (role) where.staff_types = { [Op.contains]: [role] };

    const staff = await Staff.findAll({
      where,
      include: [{ model: User, as: 'user' }, { model: MerchantBranch, as: 'branch' }],
    });

    logger.logApiEvent(
      formatMessage('merchant', 'support', languageCode, 'success.staff_retrieved', { count: staff.length }),
      { functionName, merchantId, branchId, role }
    );

    return {
      staff,
      message: formatMessage('merchant', 'support', languageCode, 'success.staff_retrieved', { count: staff.length }),
    };
  } catch (error) {
    const formattedError = handleServiceError(functionName, error, error.errorCode || 'SYSTEM_ERROR');
    logger.logErrorEvent(formattedError.message, { errorCode: formattedError.code, functionName, merchantId, branchId, role });
    throw new AppError(formattedError.message, error.statusCode || 500, formattedError.code, error.details, error.meta);
  }
}

module.exports = {
  getTickets,
  getTicketById,
  respondToTicket,
  assignTicket,
  getStaffForAssignment
};