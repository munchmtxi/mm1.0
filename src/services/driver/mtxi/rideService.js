'use strict';

const { Ride, Driver, Payment, Customer, User } = require('@models');
const socketService = require('@services/common/socketService');
const paymentService = require('@services/common/paymentService');
const rideEvents = require('@socket/events/driver/mtxi/rideEvents');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { sequelize } = require('@models');
const { RIDE_STATUSES, STATUS_TRANSITIONS, PAYMENT_TYPES, ERROR_CODES } = require('@constants/common/rideConstants');

const acceptRide = async (driverId, rideId) => {
  return sequelize.transaction(async (t) => {
    const driver = await Driver.findOne({
      where: { user_id: driverId, deleted_at: null },
      transaction: t,
    });
    if (!driver) {
      logger.error('Driver not found', { driverId });
      throw new AppError('Driver not found', 404, ERROR_CODES.NOT_FOUND);
    }
    if (driver.availability_status !== 'available' || driver.status !== 'active') {
      logger.warn('Driver not available or inactive', {
        driverId,
        availability_status: driver.availability_status,
        status: driver.status,
      });
      throw new AppError('Driver not available', 400, ERROR_CODES.DRIVER_UNAVAILABLE);
    }

    const ride = await Ride.findByPk(rideId, { transaction: t });
    if (!ride) {
      logger.warn('Ride not found', { rideId });
      throw new AppError('Ride not found', 404, ERROR_CODES.NOT_FOUND);
    }
    if (ride.status !== RIDE_STATUSES.REQUESTED) {
      logger.warn('Ride status not REQUESTED', {
        rideId,
        actualStatus: ride.status,
        expectedStatus: RIDE_STATUSES.REQUESTED,
      });
      throw new AppError('Ride not available', 404, ERROR_CODES.NOT_FOUND);
    }

    ride.driver_id = driver.id;
    ride.status = RIDE_STATUSES.ASSIGNED;
    await ride.save({ transaction: t });

    driver.availability_status = 'busy';
    await driver.save({ transaction: t });

    rideEvents.emitRideAccepted(rideId, driver.id);
    logger.info('Ride accepted', { rideId, driverId: driver.id });

    return ride;
  });
};

const declineRide = async (driverId, rideId, declineReason) => {
  return sequelize.transaction(async (t) => {
    const driver = await Driver.findOne({
      where: { user_id: driverId, deleted_at: null },
      transaction: t,
    });
    if (!driver) {
      logger.error('Driver not found', { driverId });
      throw new AppError('Driver not found', 404, ERROR_CODES.NOT_FOUND);
    }
    if (driver.availability_status !== 'available' || driver.status !== 'active') {
      logger.warn('Driver not available or inactive', {
        driverId,
        availability_status: driver.availability_status,
        status: driver.status,
      });
      throw new AppError('Driver not available', 400, ERROR_CODES.DRIVER_UNAVAILABLE);
    }

    const ride = await Ride.findByPk(rideId, { transaction: t });
    if (!ride || ride.status !== RIDE_STATUSES.REQUESTED) {
      logger.warn('Ride not found or not available', { rideId, status: ride?.status });
      throw new AppError('Ride not found or not available', 404, ERROR_CODES.NOT_FOUND);
    }

    ride.status = RIDE_STATUSES.CANCELLED; // Changed to CANCELLED to align with RIDE_STATUSES
    ride.decline_details = { // Changed to decline_details for consistency with schema
      reason: declineReason?.reason || 'No reason provided',
      declinedBy: driver.id,
      declinedAt: new Date(),
    };
    await ride.save({ transaction: t });

    rideEvents.emitRideDeclined(rideId, driver.id, ride.decline_details);
    logger.info('Ride declined', { rideId, driverId: driver.id, declineReason });

    return ride;
  });
};

const updateRideStatus = async (driverId, rideId, status) => {
  return sequelize.transaction(async (t) => {
    const driver = await Driver.findOne({
      where: { user_id: driverId, deleted_at: null },
      transaction: t,
    });
    if (!driver) {
      logger.error('Driver not found', { driverId });
      throw new AppError('Driver not found', 404, ERROR_CODES.NOT_FOUND);
    }
    if (driver.availability_status === 'unavailable' || driver.status !== 'active') {
      logger.warn('Driver not available or inactive', {
        driverId,
        availability_status: driver.availability_status,
        status: driver.status,
      });
      throw new AppError('Driver not available', 400, ERROR_CODES.DRIVER_UNAVAILABLE);
    }

    const ride = await Ride.findOne({
      where: { id: rideId, driver_id: driver.id },
      include: [{ model: Payment, as: 'payment', include: [{ model: Customer, as: 'customer' }] }],
      transaction: t,
    });
    if (!ride) {
      logger.warn('Ride not found or not assigned to driver', { rideId, driverId: driver.id });
      throw new AppError('Ride not found or not assigned to driver', 404, ERROR_CODES.NOT_FOUND);
    }

    if (!Object.values(RIDE_STATUSES).includes(status)) {
      logger.warn('Invalid status', { status });
      throw new AppError('Invalid status', 400, ERROR_CODES.INVALID_STATUS);
    }

    const allowedTransitions = STATUS_TRANSITIONS[ride.status] || [];
    if (!allowedTransitions.includes(status)) {
      logger.warn('Invalid status transition', { rideId, currentStatus: ride.status, requestedStatus: status });
      throw new AppError(`Cannot transition from ${ride.status} to ${status}`, 400, ERROR_CODES.INVALID_STATUS);
    }

    ride.status = status;
    await ride.save({ transaction: t });

    if (status === RIDE_STATUSES.COMPLETED) {
      try {
        const payment = ride.payment;
        if (!payment) {
          logger.error('No payment found for completed ride', { rideId });
          throw new AppError('No payment found for ride', 400, ERROR_CODES.NOT_FOUND);
        }
        if (payment.status === 'completed') {
          // Payment already completed, skip authorization
          logger.info('Payment already completed for ride', { rideId, paymentId: payment.id });
          socketService.emitToUser(payment.customer.user_id, 'ride:completed', {
            rideId,
            paymentId: payment.id,
            amount: Number(payment.amount).toFixed(2),
            status: ride.status,
          });
          socketService.emitToUser(driverId, 'ride:completed', {
            rideId,
            paymentId: payment.id,
            amount: Number(payment.amount).toFixed(2),
            status: ride.status,
          });
        } else if (payment.status !== 'authorized') {
          if (!payment.customer) {
            logger.error('Customer not found for payment', { paymentId: payment.id });
            throw new AppError('Customer not found', 404, ERROR_CODES.NOT_FOUND);
          }
          await paymentService.authorizePayment(
            payment.customer.user_id,
            payment.amount,
            payment.payment_details.type,
            rideId,
            payment.payment_details,
            { transaction: t }
          );
          ride.status = RIDE_STATUSES.PAYMENT_CONFIRMED;
          await ride.save({ transaction: t });
          socketService.emitToUser(payment.customer.user_id, 'payment:authorized', {
            rideId,
            paymentId: payment.id,
            amount: Number(payment.amount).toFixed(2),
          });
          socketService.emitToUser(driverId, 'payment:authorized', {
            rideId,
            paymentId: payment.id,
            amount: Number(payment.amount).toFixed(2),
          });
          logger.info('Payment authorized for completed ride', { rideId, paymentId: payment.id });
        }
      } catch (error) {
        logger.error('Failed to process payment for ride', { rideId, error: error.message });
        throw error instanceof AppError ? error : new AppError('Payment processing failed', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
      }
    }

    if (status === RIDE_STATUSES.COMPLETED || status === RIDE_STATUSES.CANCELLED) {
      driver.availability_status = 'available';
      await driver.save({ transaction: t });
    }

    rideEvents.emitRideStatusUpdated(rideId, driver.id, status);
    logger.info('Ride status updated', { rideId, driverId: driver.id, status });

    return ride;
  });
};

const getDriverReport = async (driverId, options = {}) => {
  const { startDate, endDate } = options;
  const driver = await Driver.findOne({
    where: { user_id: driverId, deleted_at: null },
  });
  if (!driver) {
    logger.error('Driver not found', { driverId });
    throw new AppError('Driver not found', 404, ERROR_CODES.NOT_FOUND);
  }

  const whereClause = { driver_id: driver.id }; // Fixed: Use driver_id
  if (startDate && endDate) {
    whereClause.created_at = {
      [sequelize.Op.between]: [new Date(startDate), new Date(endDate)],
    };
  }

  const rides = await Ride.findAll({
    where: { driver_id: driver.id, status: RIDE_STATUSES.COMPLETED }, // Fixed: Use driver_id
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalRides'],
      [sequelize.fn('SUM', sequelize.col('fare_amount')), 'totalEarnings'],
    ],
  });

  const payments = await Payment.findAll({
    where: { ...whereClause, type: PAYMENT_TYPES.TIP, status: 'verified' },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('tip_amount')), 'totalTips'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'tipCount'],
    ],
  });

  const report = {
    driverId: driver.id,
    totalRides: Number(rides[0]?.dataValues?.totalRides || 0),
    totalEarnings: Number(rides[0]?.dataValues?.totalEarnings || 0).toFixed(2),
    totalTips: Number(payments[0]?.dataValues?.totalTips || 0).toFixed(2),
    tipCount: Number(payments[0]?.dataValues?.tipCount || 0),
    averageRating: Number(driver.rating || 0).toFixed(1),
  };

  logger.info('Driver report generated', { driverId: driver.id, report });
  return report;
};

const sendRideMessage = async (rideId, messageData) => {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer', attributes: ['user_id'] },
      { model: Driver, as: 'driver', attributes: ['user_id'] },
    ],
  });
  if (!ride) {
    logger.error('Ride not found', { rideId });
    throw new AppError('Ride not found', 404, ERROR_CODES.NOT_FOUND);
  }

  const messagePayload = {
    rideId,
    message: messageData.message,
    sender: messageData.sender || 'driver',
    timestamp: new Date(),
  };

  socketService.emitToRoom(`ride:${rideId}`, 'ride:message', messagePayload);
  if (ride.customer?.user_id) {
    socketService.emitToRoom(`customer:${ride.customer.user_id}`, 'ride:message', messagePayload);
  }
  if (ride.driver?.user_id) {
    socketService.emitToRoom(`driver:${ride.driver.user_id}`, 'ride:message', messagePayload);
  }
  socketService.emitToRoom('admin:taxi', 'ride:message', messagePayload);

  logger.info('Ride message sent', { rideId, message: messageData.message });
  return messagePayload;
};

const getRidePayment = async (driverId, rideId) => {
  const driver = await Driver.findOne({
    where: { user_id: driverId, deleted_at: null },
  });
  if (!driver) {
    logger.error('Driver not found', { driverId });
    throw new AppError('Driver not found', 404, ERROR_CODES.NOT_FOUND);
  }

  const ride = await Ride.findOne({
    where: { id: rideId, driver_id: driver.id }, // Fixed: Use driver_id
    include: [{
      model: Payment,
      as: 'payment',
      attributes: ['id', 'amount', 'tip_amount', 'status', 'payment_method', 'created_at'],
    }],
  });
  if (!ride) {
    logger.warn('Ride not found or not assigned to driver', { rideId, driverId: driver.id });
    throw new AppError('Ride not found or not assigned to driver', 404, ERROR_CODES.NOT_FOUND);
  }

  if (!ride.payment) {
    logger.warn('No payment found for ride', { rideId });
    throw new AppError('No payment found', 404, ERROR_CODES.NOT_FOUND);
  }

  logger.info('Ride payment retrieved', { rideId, driverId: driver.id });
  return ride.payment;
};

module.exports = { acceptRide, declineRide, updateRideStatus, getDriverReport, sendRideMessage, getRidePayment };