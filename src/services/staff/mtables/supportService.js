// supportService.js
// Manages support operations for mtables staff. Handles support inquiries, issue escalation, and resolution logging.
// Last Updated: May 25, 2025

'use strict';

const { Op } = require('sequelize');
const { SupportTicket, Booking, Staff } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

async function handleSupportRequest(bookingId, issue, staffId) {
  try {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const ticketNumber = `SUP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ticket = await SupportTicket.create({
      user_id: booking.customer_id,
      booking_id: bookingId,
      ticket_number: ticketNumber,
      service_type: 'mtables',
      issue_type: issue.issue_type,
      description: issue.description,
      status: mtablesConstants.SUPPORT_STATUSES[0], // 'open'
      priority: 'medium',
      assigned_role_id: staffId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return ticket;
  } catch (error) {
    logger.error('Error handling support request', { error: error.message, bookingId });
    throw error;
  }
}

async function escalateIssue(bookingId, staffId) {
  try {
    const ticket = await SupportTicket.findOne({
      where: { booking_id: bookingId, status: { [Op.ne]: mtablesConstants.SUPPORT_STATUSES[3] } }, // 'closed'
    );
    if (!ticket) throw new Error(mtablesConstants.ERROR_CODES.TICKET_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    await ticket.update({ status: mtablesConstants.SUPPORT_STATUSES[2], updated_at: new Date() }); // 'escalated'

    return ticket;
  } catch (error) {
    logger.error('Error escalating issue', { error: error.message, bookingId });
    throw error;
  }
}

async function logSupportResolution(bookingId, resolutionDetails, staffId) {
  try {
    const ticket = await SupportTicket.findOne({
      where: { booking_id: bookingId, status: { [Op.ne]: mtablesConstants.SUPPORT_STATUSES[3] } }, // 'closed'
    );
    if (!ticket) throw new Error(mtablesConstants.ERROR_CODES.TICKET_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOTALLOWED);

    await ticket.update({
      status: mtablesConstants.SUPPORT_STATUSES.SUCCESS, // Updated to use SUCCESS constant
      resolution_details: resolutionDetails,
      updated_at: new Date(),
    });

    return ticket;
  } catch (error) {
    logger.error('Error logging support resolution', { error: error.message, bookingId });
    throw error;
  }
}

module.exports = {
  handleSupportRequest,
  escalateIssue,
  logSupportResolution,
};