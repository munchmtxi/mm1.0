'use strict';

const { Payment, Customer, Driver } = require('@models');
const { Sequelize } = require('sequelize');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const getTipDetails = async (paymentId) => {
  const payment = await Payment.findByPk(parseInt(paymentId), {
    include: [
      { model: Customer, as: 'customer' },
      { model: Driver, as: 'driver' },
    ],
    where: {
      type: 'TIP',
      tip_amount: { [Sequelize.Op.gt]: 0 },
    },
  });

  if (!payment) {
    logger.error('Tip not found', { paymentId });
    throw new AppError('Tip not found', 404, 'NOT_FOUND');
  }

  logger.info('Tip details retrieved', { paymentId });
  return payment;
};

const handleTipDispute = async (paymentId, resolution) => {
  const transaction = await sequelize.transaction();
  try {
    const payment = await Payment.findByPk(parseInt(paymentId), {
      include: [
        { model: Driver, as: 'driver' },
        { model: Customer, as: 'customer' },
      ],
      where: {
        type: 'TIP',
        tip_amount: { [Sequelize.Op.gt]: 0 },
      },
      transaction,
    });
    if (!payment) {
      logger.error('Tip not found', { paymentId });
      throw new AppError('Tip not found', 404, 'NOT_FOUND');
    }

    if (!['completed', 'verified', 'pending'].includes(payment.status)) {
      logger.warn('Tip not in disputable state', { paymentId, status: payment.status });
      throw new AppError('Tip cannot be disputed', 400, 'INVALID_STATUS');
    }

    const { action, reason } = resolution;
    let updatedTipAllocation = payment.tip_allocation || {};
    if (action === 'refund') {
      payment.status = 'refunded';
      payment.refund_status = 'processed';
      payment.refund_details = { ...payment.refund_details, reason, refunded_at: new Date() };
      updatedTipAllocation = {
        ...updatedTipAllocation,
        status: 'refunded',
        refund_reason: reason,
        refunded_at: new Date(),
      };
    } else if (action === 'confirm') {
      payment.status = 'verified';
      updatedTipAllocation = {
        ...updatedTipAllocation,
        status: 'confirmed',
        confirmed_at: new Date(),
      };
    } else if (action === 'ignore') {
      payment.payment_details = { ...payment.payment_details, dispute_reason: reason, dispute_ignored: true };
    }

    payment.tip_allocation = updatedTipAllocation;
    await payment.save({ transaction });

    socketService.emitToUser(payment.customer_id, 'tip:updated', {
      paymentId,
      status: payment.status,
      dispute: { action, reason },
      tip_allocation: payment.tip_allocation,
    });
    if (payment.driver_id) {
      socketService.emitToDriver(payment.driver_id, 'tip:updated', {
        paymentId,
        status: payment.status,
        tip_allocation: payment.tip_allocation,
      });
    }

    logger.info('Tip dispute handled', { paymentId, action, tip_allocation: updatedTipAllocation });
    await transaction.commit();
    return { paymentId, action, reason, tip_allocation: updatedTipAllocation };
  } catch (error) {
    await transaction.rollback();
    throw error instanceof AppError ? error : new AppError('Failed to handle tip dispute', 500, 'INTERNAL_SERVER_ERROR');
  }
};

module.exports = { getTipDetails, handleTipDispute };