'use strict';

const { Customer, Ride, Driver, sequelize } = require('@models');
const commonTipService = require('@services/common/tipService');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const submitTip = async (userId, rideId, amount) => {
  const transaction = await sequelize.transaction();
  try {
    const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
    console.log('Customer query result:', customer ? customer.toJSON() : null);
    if (!customer) {
      logger.error('Customer not found', { userId });
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    const ride = await Ride.findByPk(rideId, { transaction });
    console.log('Ride query result:', ride ? ride.toJSON() : null);
    if (!ride || ride.customerId !== customer.id) {
      logger.warn('Ride not found or not owned by customer', { rideId, customerId: customer.id });
      throw new AppError('Ride not found', 404, 'NOT_FOUND');
    }

    if (!ride.driverId) {
      logger.warn('No driver assigned to ride', { rideId });
      throw new AppError('No driver assigned to ride', 400, 'NO_DRIVER');
    }

    if (!['COMPLETED', 'PAYMENT_CONFIRMED'].includes(ride.status)) {
      logger.warn('Cannot tip for incomplete ride', { rideId, status: ride.status });
      throw new AppError('Cannot tip for incomplete ride', 400, 'INVALID_STATUS');
    }

    const driver = await Driver.findByPk(ride.driverId, { transaction });
    console.log('Driver query result:', driver ? driver.toJSON() : null);
    if (!driver) {
      logger.warn('Driver not found for ride', { rideId, driverId: ride.driverId });
      throw new AppError('Driver not found', 404, 'NOT_FOUND');
    }

    const payment = await commonTipService.submitTip(
      userId,
      rideId,
      amount,
      ride.driverId, // Use ride.driverId (4) instead of driver.user_id (49)
      'RIDE',
      'CREDIT_CARD',
      0.15,
      { transaction }
    );
    logger.info('Customer tip submitted', { rideId, customerId: customer.id, amount });

    await transaction.commit();
    return payment;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = { submitTip };