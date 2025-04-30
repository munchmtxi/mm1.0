'use strict';

const { Payment, sequelize } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

/**
 * Confirms a tip payment by a driver.
 * @param {number} driverId - The ID of the driver confirming the tip.
 * @param {number} paymentId - The ID of the payment to confirm.
 * @returns {Promise<Object>} - The confirmed payment record.
 * @throws {AppError} - If confirmation fails.
 */
const confirmTip = async (driverId, paymentId) => {
  const transaction = await sequelize.transaction();
  try {
    const payment = await Payment.findByPk(paymentId, { transaction });
    // Middleware ensures payment exists, type is 'tip', has correct driver_id, and status is 'completed'
    await payment.update({ status: 'verified' }, { transaction });

    logger.info('Tip confirmed by driver', { paymentId, driverId });
    await transaction.commit();
    return payment;
  } catch (error) {
    await transaction.rollback();
    throw error instanceof AppError ? error : new AppError('Failed to confirm tip', 500, 'INTERNAL_SERVER_ERROR');
  }
};

module.exports = { confirmTip };