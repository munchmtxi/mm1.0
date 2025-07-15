// supportService.js
// Manages support operations for munch staff. Handles order inquiries, issue resolution, and dispute escalation.
// Last Updated: May 25, 2025

'use strict';

const { Op } = require('sequelize');
const { SupportTicket, Order, Dispute, Staff } = require('@models');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

async function handleOrderInquiry(orderId, issue, staffId) {
  try {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error(munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const ticketNumber = `SUP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ticket = await SupportTicket.create({
      user_id: order.customer_id,
      delivery_order_id: orderId,
      ticket_number: ticketNumber,
      service_type: 'munch',
      issue_type: issue.issue_type,
      description: issue.description,
      status: munchConstants.SUPPORT_STATUSES[0], // 'open'
      priority: 'medium',
      assigned_role_id: staffId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return ticket;
  } catch (error) {
    logger.error('Error handling order inquiry', { error: error.message, orderId });
    throw error;
  }
}

async function resolveOrderIssue(orderId, resolution, staffId) {
  try {
    const ticket = await SupportTicket.findOne({
      where: { delivery_order_id: orderId, status: { [Op.ne]: munchConstants.SUPPORT_STATUSES[2] } }, // 'closed'
    });
    if (!ticket) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    await ticket.update({
      status: munchConstants.SUPPORT_STATUSES[1], // 'resolved'
      resolution_details: resolution,
      updated_at: new Date(),
    });

    return ticket;
  } catch (error) {
    logger.error('Error resolving order issue', { error: error.message, orderId });
    throw error;
  }
}

async function escalateOrderDispute(orderId, staffId) {
  try {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error(munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const ticket = await SupportTicket.findOne({
      where: { delivery_order_id: orderId, status: { [Op.ne]: munchConstants.SUPPORT_STATUSES[2] } }, // 'closed'
    });
    if (!ticket) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const dispute = await Dispute.create({
      customer_id: order.customer_id,
      service_id: orderId,
      service_type: 'munch',
      issue: ticket.description,
      issue_type: ticket.issue_type,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await ticket.update({
      status: munchConstants.SUPPORT_STATUSES[3], // 'escalated'
      updated_at: new Date(),
    });

    return { dispute, ticket };
  } catch (error) {
    logger.error('Error escalating order dispute', { error: error.message, orderId });
    throw error;
  }
}

module.exports = {
  handleOrderInquiry,
  resolveOrderIssue,
  escalateOrderDispute,
};