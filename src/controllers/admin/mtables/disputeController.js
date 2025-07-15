'use strict';

const disputeService = require('@services/admin/mtables/disputeService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const disputeConstants = require('@constants/disputeConstants');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');

async function resolveBookingDisputes(req, res, next) {
  try {
    const { bookingId } = req.params;
    const resolution = req.body;
    const result = await disputeService.resolveBookingDisputes(bookingId, resolution, { pointService });

    await notificationService.sendNotification({
      userId: result.customer_id ? result.customer_id.toString() : req.user.id,
      notificationType: disputeConstants.NOTIFICATION_TYPES.DISPUTE_RESOLVED,
      messageKey: 'dispute.resolved',
      messageParams: { disputeId: result.disputeId, resolutionType: resolution.type },
      role: 'customer',
      module: 'mtables',
    });

    await socketService.emit(null, 'dispute:resolved', {
      userId: result.customer_id ? result.customer_id.toString() : req.user.id,
      role: 'customer',
      disputeId: result.disputeId,
      bookingId,
      resolutionType: resolution.type,
    });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: disputeConstants.AUDIT_TYPES.DISPUTE_RESOLVED,
      details: { disputeId: result.disputeId, bookingId, resolution },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.dispute_resolved'),
    });
  } catch (error) {
    next(error);
  }
}

async function resolvePreOrderDisputes(req, res, next) {
  try {
    const { bookingId } = req.params;
    const resolution = req.body;
    const result = await disputeService.resolvePreOrderDisputes(bookingId, resolution, { pointService });

    await notificationService.sendNotification({
      userId: result.customer_id ? result.customer_id.toString() : req.user.id,
      notificationType: disputeConstants.NOTIFICATION_TYPES.DISPUTE_RESOLVED,
      messageKey: 'dispute.pre_order_resolved',
      messageParams: { disputeId: result.disputeId, resolutionType: resolution.type },
      role: 'customer',
      module: 'mtables',
    });

    await socketService.emit(null, 'dispute:pre_order_resolved', {
      userId: result.customer_id ? result.customer_id.toString() : req.user.id,
      role: 'customer',
      disputeId: result.disputeId,
      bookingId,
      orderId: result.orderId,
      resolutionType: resolution.type,
    });

    await auditService.logAction({
      userId: req.user.id,
      role: 'merchant',
      action: disputeConstants.AUDIT_TYPES.DISPUTE_RESOLVED,
      details: { disputeId: result.disputeId, bookingId, orderId: result.orderId, resolution },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.pre_order_dispute_resolved'),
    });
  } catch (error) {
    next(error);
  }
}

async function trackDisputeStatus(req, res, next) {
  try {
    const { disputeId } = req.params;
    const result = await disputeService.trackDisputeStatus(disputeId);

    await notificationService.sendNotification({
      userId: result.customer_id ? result.customer_id.toString() : req.user.id,
      notificationType: disputeConstants.NOTIFICATION_TYPES.DISPUTE_UPDATED,
      messageKey: 'dispute.status_updated',
      messageParams: { disputeId, status: result.status },
      role: 'customer',
      module: 'mtables',
    });

    await socketService.emit(null, 'dispute:status_updated', {
      userId: result.customer_id ? result.customer_id.toString() : req.user.id,
      role: 'customer',
      disputeId,
      status: result.status,
    });

    await auditService.logAction({
      userId: req.user.id,
      role: 'customer',
      action: disputeConstants.AUDIT_TYPES.DISPUTE_UPDATED,
      details: { disputeId, status: result.status },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.dispute_status_tracked'),
    });
  } catch (error) {
    next(error);
  }
}

async function escalateDisputes(req, res, next) {
  try {
    const { disputeId } = req.params;
    const result = await disputeService.escalateDisputes(disputeId);

    await notificationService.sendNotification({
      userId: result.customer_id ? result.customer_id.toString() : req.user.id,
      notificationType: disputeConstants.NOTIFICATION_TYPES.DISPUTE_UPDATED,
      messageKey: 'dispute.escalated',
      messageParams: { disputeId },
      role: 'customer',
      module: 'mtables',
    });

    await notificationService.sendNotification({
      userId: null,
      notificationType: disputeConstants.NOTIFICATION_TYPES.DISPUTE_UPDATED,
      messageKey: 'dispute.escalated_admin',
      messageParams: { disputeId, serviceId: result.serviceId },
      role: 'admin',
      module: 'mtables',
    });

    await socketService.emit(null, 'dispute:escalated', {
      userId: result.customer_id ? result.customer_id.toString() : req.user.id,
      role: 'customer',
      disputeId,
      adminRole: 'super_admin',
    });

    await auditService.logAction({
      userId: req.user.id,
      role: 'customer',
      action: disputeConstants.AUDIT_TYPES.DISPUTE_UPDATED,
      details: { disputeId, status: 'escalated' },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.dispute_escalated'),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  resolveBookingDisputes,
  resolvePreOrderDisputes,
  trackDisputeStatus,
  escalateDisputes,
};