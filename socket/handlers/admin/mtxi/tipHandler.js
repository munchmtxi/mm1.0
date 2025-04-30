'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const catchAsyncSocket = require('@utils/catchAsyncSocket');
const adminTipService = require('@services/admin/mtxi/adminTipService');

const handleTipDetailsRequest = catchAsyncSocket(async (socket, data, callback) => {
  const { paymentId } = data;
  logger.info('Handling tip details request', { paymentId, userId: socket.user.id });

  if (!socket.user || socket.user.role.name !== 'admin') {
    logger.warn('Unauthorized tip details request', { userId: socket.user?.id });
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  if (!Number.isInteger(paymentId) || paymentId < 1) {
    logger.warn('Invalid payment ID', { paymentId });
    throw new AppError('Invalid payment ID', 400, 'INVALID_INPUT');
  }

  const tip = await adminTipService.getTipDetails(paymentId);
  callback({ status: 'success', data: { tip } });
});

const handleTipDisputeRequest = catchAsyncSocket(async (socket, data, callback) => {
  const { paymentId, action, reason } = data;
  logger.info('Handling tip dispute request', { paymentId, action, userId: socket.user.id });

  if (!socket.user || socket.user.role.name !== 'admin') {
    logger.warn('Unauthorized tip dispute request', { userId: socket.user?.id });
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  if (!Number.isInteger(paymentId) || paymentId < 1) {
    logger.warn('Invalid payment ID', { paymentId });
    throw new AppError('Invalid payment ID', 400, 'INVALID_INPUT');
  }
  if (!['refund', 'confirm', 'ignore'].includes(action)) {
    logger.warn('Invalid action', { action });
    throw new AppError('Action must be refund, confirm, or ignore', 400, 'INVALID_INPUT');
  }
  if (!reason || typeof reason !== 'string' || reason.trim() === '') {
    logger.warn('Invalid reason', { reason });
    throw new AppError('Reason is required', 400, 'INVALID_INPUT');
  }

  const resolution = await adminTipService.handleTipDispute(paymentId, { action, reason });
  callback({ status: 'success', data: { resolution } });
});

module.exports = {
  handleTipDetailsRequest,
  handleTipDisputeRequest,
};