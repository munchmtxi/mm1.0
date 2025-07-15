'use strict';

const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const munchConstants = require('@constants/customer/munch/munchConstants');
const socketConstants = require('@constants/common/socketConstants');
const localizationConstants = require('@constants/common/localizationConstants');

/**
 * Socket.IO handlers for delivery-related events.
 */
module.exports = (io, socket) => {
  const userId = socket.user?.userId;
  const role = socket.user?.role;
  const languageCode = socket.user?.languageCode || localizationConstants.DEFAULT_LANGUAGE;

  socket.on(socketConstants.SOCKET_EVENT_TYPES.ORDER_CANCELLED, async (data) => {
    if (role !== 'customer') return;
    await socketService.handleEvent(io, socket, socketConstants.SOCKET_EVENT_TYPES.ORDER_CANCELLED, data, `driver:${data.driverId}`, {
      userId,
      role,
      auditAction: munchConstants.AUDIT_TYPES.RESOLVE_ORDER_DISPUTE,
    });
    await auditService.logAction({
      userId,
      role,
      action: munchConstants.AUDIT_TYPES.RESOLVE_ORDER_DISPUTE,
      details: data,
    });
  });

  socket.on(socketConstants.SOCKET_EVENT_TYPES.DRIVER_COMMUNICATION, async (data) => {
    if (role !== 'customer') return;
    await socketService.handleEvent(io, socket, socketConstants.SOCKET_EVENT_TYPES.DRIVER_COMMUNICATION, data, `driver:${data.driverId}`, {
      userId,
      role,
      auditAction: munchConstants.AUDIT_TYPES.COMMUNICATE_WITH_DRIVER,
    });
    await auditService.logAction({
      userId,
      role,
      action: munchConstants.AUDIT_TYPES.COMMUNICATE_WITH_DRIVER,
      details: { orderId: data.orderId, messageLength: data.message?.length },
    });
  });

  socket.on(socketConstants.SOCKET_EVENT_TYPES.FEEDBACK_REQUESTED, async (data) => {
    if (role !== 'customer') return;
    await socketService.handleEvent(io, socket, socketConstants.SOCKET_EVENT_TYPES.FEEDBACK_REQUESTED, data, 'admin', {
      userId,
      role,
      auditAction: munchConstants.AUDIT_TYPES.HANDLE_ORDER_INQUIRY,
    });
    await auditService.logAction({
      userId,
      role,
      action: munchConstants.AUDIT_TYPES.HANDLE_ORDER_INQUIRY,
      details: { orderId: data.orderId, action: 'feedback_requested' },
    });
  });

  socket.on(socketConstants.SOCKET_EVENT_TYPES.DELIVERY_STATUS_UPDATED, async (data) => {
    if (role !== 'driver') return;
    await socketService.handleEvent(io, socket, socketConstants.SOCKET_EVENT_TYPES.DELIVERY_STATUS_UPDATED, data, `customer:${data.customerId}`, {
      userId,
      role,
      auditAction: munchConstants.AUDIT_TYPES.UPDATE_ORDER_STATUS,
    });
    await auditService.logAction({
      userId,
      role,
      action: munchConstants.AUDIT_TYPES.UPDATE_ORDER_STATUS,
      details: { orderId: data.orderId, status: data.status },
    });
  });

  socket.on(socketConstants.SOCKET_EVENT_TYPES.EARNINGS_PROCESSED, async (data) => {
    if (role !== 'driver') return;
    await socketService.handleEvent(io, socket, socketConstants.SOCKET_EVENT_TYPES.EARNINGS_PROCESSED, data, `driver:${userId}`, {
      userId,
      role,
      auditAction: munchConstants.AUDIT_TYPES.PROCESS_EARNINGS,
    });
    await auditService.logAction({
      userId,
      role,
      action: munchConstants.AUDIT_TYPES.PROCESS_EARNINGS,
      details: { orderId: data.orderId, earningAmount: data.earningAmount },
    });
  });

  socket.on(socketConstants.SOCKET_EVENT_TYPES.DELIVERY_LOCATION_UPDATED, async (data) => {
    if (role !== 'customer') return;
    await socketService.handleEvent(io, socket, socketConstants.SOCKET_EVENT_TYPES.DELIVERY_LOCATION_UPDATED, data, `driver:${data.driverId}`, {
      userId,
      role,
      auditAction: munchConstants.AUDIT_TYPES.HANDLE_ORDER_INQUIRY,
    });
    await auditService.logAction({
      userId,
      role,
      action: munchConstants.AUDIT_TYPES.HANDLE_ORDER_INQUIRY,
      details: { orderId: data.orderId, placeId: data.location?.placeId },
    });
  });
};