'use strict';

const { Op } = require('sequelize');
const { Dispute, Booking, Customer, MerchantBranch, InDiningOrder } = require('@models');
const disputeConstants = require('@constants/disputeConstants');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');
const { AppError } = require('@utils/AppError');

async function resolveBookingDisputes(bookingId, resolution, { pointService }) {
  try {
    if (!bookingId || !resolution?.type) {
      throw new AppError(
        formatMessage('error.invalid_issue'),
        400,
        disputeConstants.ERROR_CODES.INVALID_ISSUE
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: MerchantBranch, as: 'branch' }, { model: Customer, as: 'customer' }],
    });
    if (!booking) {
      throw new AppError(
        formatMessage('error.booking_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const dispute = await Dispute.findOne({
      where: {
        service_id: bookingId,
        service_type: 'mtables',
        status: { [Op.in]: [disputeConstants.DISPUTE_STATUSES.PENDING, disputeConstants.DISPUTE_STATUSES.IN_REVIEW] },
      },
    });
    if (!dispute) {
      throw new AppError(
        formatMessage('error.dispute_not_found'),
        404,
        disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND
      );
    }

    if (!Object.values(disputeConstants.RESOLUTION_TYPES).includes(resolution.type)) {
      throw new AppError(
        formatMessage('error.invalid_resolution_type'),
        400,
        disputeConstants.ERROR_CODES.INVALID_ISSUE
      );
    }

    await dispute.update({
      status: disputeConstants.DISPUTE_STATUSES.RESOLVED,
      resolution: resolution.description || 'Issue resolved',
      resolution_type: resolution.type,
    });

    const actionConfig = disputeConstants.GAMIFICATION_ACTIONS.DISPUTE_RESOLVED;
    if (actionConfig && actionConfig.roles.includes('customer')) {
      await pointService.awardPoints({
        userId: booking.customer.user_id.toString(),
        role: 'customer',
        action: actionConfig.action,
        points: actionConfig.points,
        metadata: { disputeId: dispute.id, bookingId },
        expiresAt: new Date(Date.now() + mtablesConstants.GAMIFICATION_CONSTANTS.POINT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      });
    }

    logger.info('Booking dispute resolved', { disputeId: dispute.id, bookingId });
    return {
      disputeId: dispute.id,
      bookingId,
      status: dispute.status,
      resolution: dispute.resolution,
      resolutionType: dispute.resolution_type,
    };
  } catch (error) {
    logger.logErrorEvent(`resolveBookingDisputes failed: ${error.message}`, { bookingId });
    throw error;
  }
}

async function resolvePreOrderDisputes(bookingId, resolution, { pointService }) {
  try {
    if (!bookingId || !resolution?.type) {
      throw new AppError(
        formatMessage('error.invalid_issue'),
        400,
        disputeConstants.ERROR_CODES.INVALID_ISSUE
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: MerchantBranch, as: 'branch' }, { model: Customer, as: 'customer' }],
    });
    if (!booking) {
      throw new AppError(
        formatMessage('error.booking_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const inDiningOrder = await InDiningOrder.findOne({
      where: { customer_id: booking.customer_id, table_id: booking.table_id },
    });
    if (!inDiningOrder) {
      throw new AppError(
        formatMessage('error.no_pre_order'),
        404,
        disputeConstants.ERROR_CODES.INVALID_SERVICE
      );
    }

    const dispute = await Dispute.findOne({
      where: {
        service_id: bookingId,
        service_type: 'mtables',
        status: { [Op.in]: [disputeConstants.DISPUTE_STATUSES.PENDING, disputeConstants.DISPUTE_STATUSES.IN_REVIEW] },
      },
    });
    if (!dispute) {
      throw new AppError(
        formatMessage('error.dispute_not_found'),
        404,
        disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND
      );
    }

    if (!Object.values(disputeConstants.RESOLUTION_TYPES).includes(resolution.type)) {
      throw new AppError(
        formatMessage('error.invalid_resolution_type'),
        400,
        disputeConstants.ERROR_CODES.INVALID_ISSUE
      );
    }

    await dispute.update({
      status: disputeConstants.DISPUTE_STATUSES.RESOLVED,
      resolution: resolution.description || 'Pre-order issue resolved',
      resolution_type: resolution.type,
    });

    const actionConfig = disputeConstants.GAMIFICATION_ACTIONS.DISPUTE_RESOLVED;
    if (actionConfig && actionConfig.roles.includes('customer')) {
      await pointService.awardPoints({
        userId: booking.customer.user_id.toString(),
        role: 'customer',
        action: actionConfig.action,
        points: actionConfig.points,
        metadata: { disputeId: dispute.id, bookingId, orderId: inDiningOrder.id },
        expiresAt: new Date(Date.now() + mtablesConstants.GAMIFICATION_CONSTANTS.POINT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      });
    }

    logger.info('Pre-order dispute resolved', { disputeId: dispute.id, bookingId, orderId: inDiningOrder.id });
    return {
      disputeId: dispute.id,
      bookingId,
      orderId: inDiningOrder.id,
      status: dispute.status,
      resolution: dispute.resolution,
      resolutionType: dispute.resolution_type,
    };
  } catch (error) {
    logger.logErrorEvent(`resolvePreOrderDisputes failed: ${error.message}`, { bookingId });
    throw error;
  }
}

async function trackDisputeStatus(disputeId) {
  try {
    if (!disputeId) {
      throw new AppError(
        formatMessage('error.dispute_not_found'),
        400,
        disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND
      );
    }

    const dispute = await Dispute.findByPk(disputeId, {
      include: [
        { model: Booking, as: 'booking', include: [{ model: MerchantBranch, as: 'branch' }, { model: Customer, as: 'customer' }] },
      ],
    });
    if (!dispute || dispute.service_type !== 'mtables') {
      throw new AppError(
        formatMessage('error.dispute_not_found'),
        404,
        disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND
      );
    }

    logger.info('Dispute status tracked', { disputeId });
    return {
      disputeId,
      serviceId: dispute.service_id,
      serviceType: dispute.service_type,
      status: dispute.status,
      issueType: dispute.issue_type,
      resolution: dispute.resolution,
      resolutionType: dispute.resolution_type,
    };
  } catch (error) {
    logger.logErrorEvent(`trackDisputeStatus failed: ${error.message}`, { disputeId });
    throw error;
  }
}

async function escalateDisputes(disputeId) {
  try {
    if (!disputeId) {
      throw new AppError(
        formatMessage('error.dispute_not_found'),
        400,
        disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND
      );
    }

    const dispute = await Dispute.findByPk(disputeId, {
      include: [
        { model: Booking, as: 'booking', include: [{ model: MerchantBranch, as: 'branch' }, { model: Customer, as: 'customer' }] },
      ],
    });
    if (!dispute || dispute.service_type !== 'mtables') {
      throw new AppError(
        formatMessage('error.dispute_not_found'),
        404,
        disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND
      );
    }

    if (dispute.status === disputeConstants.DISPUTE_STATUSES.RESOLVED || dispute.status === disputeConstants.DISPUTE_STATUSES.CLOSED) {
      throw new AppError(
        formatMessage('error.dispute_already_resolved'),
        400,
        disputeConstants.ERROR_CODES.DISPUTE_ALREADY_RESOLVED
      );
    }

    await dispute.update({
      status: disputeConstants.DISPUTE_STATUSES.IN_REVIEW,
    });

    logger.info('Dispute escalated', { disputeId });
    return {
      disputeId,
      status: dispute.status,
      serviceId: dispute.service_id,
      escalatedTo: 'super_admin',
    };
  } catch (error) {
    logger.logErrorEvent(`escalateDisputes failed: ${error.message}`, { disputeId });
    throw error;
  }
}

module.exports = {
  resolveBookingDisputes,
  resolvePreOrderDisputes,
  trackDisputeStatus,
  escalateDisputes,
};