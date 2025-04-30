'use strict';

const { Ride, Customer, Driver, Payment } = require('@models');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { sequelize } = require('@models');
const { PAYMENT_TYPES,RIDE_STATUSES, STATUS_TRANSITIONS, DISPUTE_ACTIONS, ALERT_SEVERITIES } = require('@constants/common/rideConstants');
const driverRideService = require('@services/driver/mtxi/rideService');
const { Op } = require('sequelize');

const getRideDetails = async (rideId) => {
  const parsedRideId = parseInt(rideId, 10);
  if (isNaN(parsedRideId) || !Number.isInteger(parsedRideId) || parsedRideId < 1) {
    logger.warn('Invalid ride ID', { rideId, parsedRideId });
    throw new AppError('Invalid ride ID', 400, 'INVALID_INPUT');
  }

  return sequelize.transaction(async (t) => {
    const ride = await Ride.findByPk(parsedRideId, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'user_id'] },
        { model: Driver, as: 'driver', attributes: ['id', 'user_id', 'rating'] },
        { model: Payment, as: 'payment', attributes: ['id', 'amount', 'tip_amount', 'status', 'type'] },
      ],
      transaction: t,
    });

    if (!ride) {
      logger.error('Ride not found', { rideId: parsedRideId });
      throw new AppError('Ride not found', 404, 'NOT_FOUND');
    }

    logger.info('Ride details retrieved', { rideId: parsedRideId, customerId: ride.customerId, driverId: ride.driverId });
    return ride;
  });
};

const updateRideStatus = async (rideId, status) => {
  const parsedRideId = parseInt(rideId, 10);
  if (isNaN(parsedRideId) || !Number.isInteger(parsedRideId) || parsedRideId < 1) {
    logger.warn('Invalid ride ID', { rideId, parsedRideId });
    throw new AppError('Invalid ride ID', 400, 'INVALID_INPUT');
  }

  if (!Object.values(RIDE_STATUSES).includes(status)) {
    logger.warn('Invalid ride status', { status });
    throw new AppError('Invalid ride status', 400, 'INVALID_STATUS');
  }

  return sequelize.transaction(async (t) => {
    const ride = await Ride.findByPk(parsedRideId, { transaction: t });
    if (!ride) {
      logger.error('Ride not found', { rideId: parsedRideId });
      throw new AppError('Ride not found', 404, 'NOT_FOUND');
    }

    const allowedTransitions = STATUS_TRANSITIONS[ride.status] || [];
    if (!allowedTransitions.includes(status)) {
      logger.warn('Invalid status transition', { rideId: parsedRideId, currentStatus: ride.status, requestedStatus: status });
      throw new AppError(`Cannot transition from ${ride.status} to ${status}`, 400, 'INVALID_STATUS_TRANSITION');
    }

    if (status === RIDE_STATUSES.ASSIGNED && ride.driverId) {
      const driver = await Driver.findByPk(ride.driverId, { transaction: t });
      if (!driver || driver.availability_status !== 'available' || driver.status !== 'active') {
        logger.warn('Driver not available for assignment', { driverId: ride.driverId });
        throw new AppError('Driver not available', 400, 'DRIVER_UNAVAILABLE');
      }
      driver.availability_status = 'busy';
      await driver.save({ transaction: t });
    }

    ride.status = status;
    await ride.save({ transaction: t });

    socketService.emitToRoom(`ride:${parsedRideId}`, 'ride:statusUpdated', { rideId: parsedRideId, status });
    socketService.emitToRoom('admin:taxi', 'ride:statusUpdated', { rideId: parsedRideId, status, customerId: ride.customerId });

    logger.info('Ride status updated', { rideId: parsedRideId, status, customerId: ride.customerId });
    return ride;
  });
};

const handleRideDispute = async (rideId, resolution) => {
  const parsedRideId = parseInt(rideId, 10);
  if (isNaN(parsedRideId) || !Number.isInteger(parsedRideId) || parsedRideId < 1) {
    logger.warn('Invalid ride ID', { rideId, parsedRideId });
    throw new AppError('Invalid ride ID', 400, 'INVALID_INPUT');
  }

  const { action, reason } = resolution;
  if (!Object.values(DISPUTE_ACTIONS).includes(action)) {
    logger.warn('Invalid dispute action', { action });
    throw new AppError('Invalid dispute action', 400, 'INVALID_ACTION');
  }

  return sequelize.transaction(async (t) => {
    const ride = await Ride.findByPk(parsedRideId, {
      include: [{ model: Payment, as: 'payment' }],
      transaction: t,
    });
    if (!ride) {
      logger.error('Ride not found', { rideId: parsedRideId });
      throw new AppError('Ride not found', 404, 'NOT_FOUND');
    }

    if (action === DISPUTE_ACTIONS.REFUND) {
      if (!ride.payment) {
        logger.warn('No payment associated with ride for refund', { rideId: parsedRideId });
        throw new AppError('No payment associated with ride', 400, 'NO_PAYMENT');
      }
      const allowedTransitions = STATUS_TRANSITIONS[ride.status] || [];
      if (!allowedTransitions.includes(RIDE_STATUSES.CANCELLED)) {
        logger.warn('Invalid status transition to CANCELLED', { rideId: parsedRideId, currentStatus: ride.status });
        throw new AppError(`Cannot transition from ${ride.status} to CANCELLED`, 400, 'INVALID_STATUS_TRANSITION');
      }
      ride.payment.status = 'refunded';
      ride.payment.refund_details = { ...ride.payment.refund_details, reason, refunded_at: new Date() };
      await ride.payment.save({ transaction: t });
      ride.status = RIDE_STATUSES.CANCELLED;
      ride.disputeDetails = { action, reason, updated_at: new Date() };
      await ride.save({ transaction: t });
    } else if (action === DISPUTE_ACTIONS.DISMISS || action === DISPUTE_ACTIONS.ESCALATE) {
      ride.disputeDetails = { ...ride.disputeDetails, action, reason, updated_at: new Date() };
      await ride.save({ transaction: t });
    }

    socketService.emitToRoom(`ride:${parsedRideId}`, 'ride:disputeResolved', { rideId: parsedRideId, action, reason });
    socketService.emitToRoom('admin:taxi', 'ride:disputeResolved', { rideId: parsedRideId, action, reason, customerId: ride.customerId });

    logger.info('Ride dispute handled', { rideId: parsedRideId, action, customerId: ride.customerId, driverId: ride.driverId });
    return { rideId: parsedRideId, action, reason };
  });
};

const handleRideAlert = async (rideId, alertData) => {
  const parsedRideId = parseInt(rideId, 10);
  if (isNaN(parsedRideId) || !Number.isInteger(parsedRideId) || parsedRideId < 1) {
    logger.warn('Invalid ride ID', { rideId, parsedRideId });
    throw new AppError('Invalid ride ID', 400, 'INVALID_INPUT');
  }

  const { message, severity } = alertData;
  if (!message || !severity) {
    logger.warn('Invalid alert data', { alertData });
    throw new AppError('Message and severity are required', 400, 'INVALID_INPUT');
  }

  if (!Object.values(ALERT_SEVERITIES).includes(severity)) {
    logger.warn('Invalid alert severity', { severity });
    throw new AppError('Invalid alert severity', 400, 'INVALID_SEVERITY');
  }

  return sequelize.transaction(async (t) => {
    const ride = await Ride.findByPk(parsedRideId, { transaction: t });
    if (!ride) {
      logger.error('Ride not found', { rideId: parsedRideId });
      throw new AppError('Ride not found', 404, 'NOT_FOUND');
    }

    const alert = { message, severity, created_at: new Date() };
    ride.disputeDetails = { ...ride.disputeDetails, alerts: [...(ride.disputeDetails?.alerts || []), alert] };
    await ride.save({ transaction: t });

    socketService.emitToRoom('admin:taxi', 'ride:alert', { rideId: parsedRideId, ...alert });

    logger.info('Ride alert handled', { rideId: parsedRideId, alert });
    return alert;
  });
};

const getRideAnalytics = async (filters, reportType = 'general') => {
  const { startDate, endDate, status } = filters;
  const where = {};
  if (startDate) where.created_at = { [Op.gte]: new Date(startDate) };
  if (endDate) where.created_at = { ...where.created_at, [Op.lte]: new Date(endDate) };
  if (status) where.status = status;

  return sequelize.transaction(async (t) => {
    if (reportType === 'finance') {
      const [rides, payments] = await Promise.all([
        Ride.findAll({
          where,
          attributes: [[sequelize.fn('SUM', sequelize.col('fare_amount')), 'totalFare']],
          transaction: t,
        }),
        Payment.findAll({
          where: { type: PAYMENT_TYPES.TIP, status: 'verified', created_at: where.created_at },
          attributes: [[sequelize.fn('SUM', sequelize.col('tip_amount')), 'totalTips']],
          transaction: t,
        }),
      ]);
      return { totalFare: Number(rides[0]?.get('totalFare') || 0).toFixed(2), totalTips: Number(payments[0]?.get('totalTips') || 0).toFixed(2) };
    } else if (reportType === 'operations') {
      const rides = await Ride.findAll({
        where,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalRides'],
          [sequelize.fn('AVG', sequelize.col('distance')), 'avgDistance'],
          'status',
        ],
        group: ['status'],
        transaction: t,
      });
      return rides.map(ride => ({
        status: ride.status,
        totalRides: Number(ride.get('totalRides')),
        avgDistance: Number(ride.get('avgDistance') || 0).toFixed(2),
      }));
    } else if (reportType === 'compliance') {
      const rides = await Ride.findAll({
        where: { ...where, status: RIDE_STATUSES.CANCELLED },
        attributes: [[sequelize.fn('COUNT', sequelize.col('id')), 'cancellations']],
        transaction: t,
      });
      return { cancellations: Number(rides[0]?.get('cancellations') || 0) };
    } else {
      const rides = await Ride.findAll({
        where,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalRides'],
          [sequelize.fn('AVG', sequelize.col('distance')), 'avgDistance'],
          'status',
        ],
        group: ['status'],
        transaction: t,
      });
      return rides.map(ride => ({
        status: ride.status,
        totalRides: Number(ride.get('totalRides')),
        avgDistance: Number(ride.get('avgDistance') || 0).toFixed(2),
      }));
    }
  });
};

const assignDriverToRide = async (rideId, driverId) => {
  return driverRideService.acceptRide(driverId, rideId);
};

const trackDriverLocation = async (rideId) => {
  const parsedRideId = parseInt(rideId, 10);
  if (isNaN(parsedRideId) || !Number.isInteger(parsedRideId) || parsedRideId < 1) {
    logger.warn('Invalid ride ID', { rideId, parsedRideId });
    throw new AppError('Invalid ride ID', 400, 'INVALID_INPUT');
  }

  const ride = await Ride.findByPk(parsedRideId, {
    include: [{ model: Driver, as: 'driver', attributes: ['id', 'user_id', 'current_location', 'availability_status'] }],
  });
  if (!ride || !ride.driver) {
    logger.error('Ride or driver not found', { rideId: parsedRideId });
    throw new AppError('Ride or driver not found', 404, 'NOT_FOUND');
  }

  const driver = ride.driver;
  if (!driver.current_location?.lat || !driver.current_location?.lng) {
    logger.warn('Driver location not available', { driverId: driver.user_id });
    throw new AppError('Driver location not available', 400, 'NO_LOCATION');
  }

  socketService.emitToRoom('admin:taxi', 'driver:location', {
    driverId: driver.user_id,
    location: driver.current_location,
    status: driver.availability_status,
    rideId: parsedRideId,
  });
  logger.info('Driver location tracked', { rideId: parsedRideId, driverId: driver.user_id, location: driver.current_location });
  return { driverId: driver.user_id, location: driver.current_location, status: driver.availability_status, rideId: parsedRideId };
};

const getLiveTripMetrics = async () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [rides, payments, drivers] = await Promise.all([
    Ride.findAll({
      where: { created_at: { [Op.gte]: oneHourAgo } },
      attributes: ['id', 'status', 'fare_amount'],
    }),
    Payment.findAll({
      where: { created_at: { [Op.gte]: oneHourAgo }, status: 'completed' },
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue']],
    }),
    Driver.count({ where: { availability_status: 'available', status: 'active' } }),
  ]);

  const ridesPerHour = rides.length;
  const revenue = Number(payments[0]?.get('totalRevenue') || 0).toFixed(2);
  const activeDrivers = drivers;

  const metrics = { ridesPerHour, revenue, activeDrivers };
  socketService.emitToRoom('admin:taxi', 'live:metrics', metrics);
  logger.info('Live trip metrics retrieved', { metrics });
  return metrics;
};

const getPaymentDetails = async (adminId, rideId, paymentId = null) => {
  logger.debug('Fetching payment details', { adminId, rideId, paymentId });
  let parsedPaymentId = paymentId ? parseInt(paymentId, 10) : null;
  let payment;

  if (paymentId && (!isNaN(parsedPaymentId) && Number.isInteger(parsedPaymentId) && parsedPaymentId >= 1)) {
    payment = await Payment.findByPk(parsedPaymentId, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'user_id'] },
        { model: Driver, as: 'driver', attributes: ['id', 'user_id'] },
        { model: Ride, as: 'ride', attributes: ['id', 'status'] },
      ],
      attributes: ['id', 'amount', 'tip_amount', 'status', 'type', 'created_at', 'refund_details', 'dispute_details'],
    });
  } else if (rideId) {
    const parsedRideId = parseInt(rideId, 10);
    if (isNaN(parsedRideId) || !Number.isInteger(parsedRideId) || parsedRideId < 1) {
      logger.warn('Invalid ride ID', { rideId, parsedRideId });
      throw new AppError('Invalid ride ID', 400, 'INVALID_INPUT');
    }
    const ride = await Ride.findByPk(parsedRideId, {
      attributes: ['id', 'payment_id'],
      transaction: null,
    });
    if (!ride || !ride.payment_id) {
      logger.warn('No payment associated with ride', { rideId: parsedRideId });
      throw new AppError('No payment found for ride', 404, 'NOT_FOUND');
    }
    parsedPaymentId = ride.payment_id;
    payment = await Payment.findByPk(parsedPaymentId, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'user_id'] },
        { model: Driver, as: 'driver', attributes: ['id', 'user_id'] },
        { model: Ride, as: 'ride', attributes: ['id', 'status'] },
      ],
      attributes: ['id', 'amount', 'tip_amount', 'status', 'type', 'created_at', 'refund_details', 'dispute_details'],
    });
  } else {
    logger.warn('Invalid payment or ride ID', { paymentId, rideId });
    throw new AppError('Invalid payment or ride ID', 400, 'INVALID_INPUT');
  }

  if (!payment) {
    logger.error('Payment not found', { paymentId: parsedPaymentId, rideId });
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }
  logger.info('Payment details retrieved', { paymentId: parsedPaymentId, rideId });
  return payment;
};

const analyzePayments = async (filters) => {
  const { startDate, endDate, type, status } = filters;
  const where = {};
  if (startDate) where.created_at = { [Op.gte]: new Date(startDate) };
  if (endDate) where.created_at = { ...where.created_at, [Op.lte]: new Date(endDate) };
  if (type) where.type = type;
  if (status) where.status = status;

  const payments = await Payment.findAll({
    where,
    attributes: [
      [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalPayments'],
      'type',
      'status',
    ],
    group: ['type', 'status'],
  });
  logger.info('Payment analysis retrieved', { filters });
  return payments.map(payment => ({
    type: payment.type,
    status: payment.status,
    totalAmount: Number(payment.get('totalAmount') || 0).toFixed(2),
    totalPayments: Number(payment.get('totalPayments')),
  }));
};

const disputePayment = async (paymentId, resolution) => {
  const parsedPaymentId = parseInt(paymentId, 10);
  if (isNaN(parsedPaymentId) || !Number.isInteger(parsedPaymentId) || parsedPaymentId < 1) {
    logger.warn('Invalid payment ID', { paymentId, parsedPaymentId });
    throw new AppError('Invalid payment ID', 400, 'INVALID_INPUT');
  }

  return sequelize.transaction(async (t) => {
    const payment = await Payment.findByPk(parsedPaymentId, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'user_id'] },
        { model: Driver, as: 'driver', attributes: ['id', 'user_id'] },
        { model: Ride, as: 'ride', attributes: ['id', 'status'] },
      ],
      transaction: t,
    });
    if (!payment) {
      logger.error('Payment not found', { paymentId: parsedPaymentId });
      throw new AppError('Payment not found', 404, 'NOT_FOUND');
    }

    const { action, reason } = resolution;
    if (!Object.values(DISPUTE_ACTIONS).includes(action)) {
      logger.warn('Invalid dispute action', { action });
      throw new AppError('Invalid dispute action', 400, 'INVALID_ACTION');
    }

    if (action === DISPUTE_ACTIONS.REFUND) {
      payment.status = 'refunded';
      payment.refund_details = { ...payment.refund_details, reason, refunded_at: new Date() };
    } else {
      payment.dispute_details = { ...payment.dispute_details, action, reason, updated_at: new Date() };
    }
    await payment.save({ transaction: t });

    const disputePayload = { paymentId: parsedPaymentId, action, reason, amount: Number(payment.amount).toFixed(2) };
    socketService.emitToRoom(`customer:${payment.customer.user_id}`, 'payment:disputed', disputePayload);
    if (payment.driver) {
      socketService.emitToRoom(`driver:${payment.driver.user_id}`, 'payment:disputed', disputePayload);
    }
    socketService.emitToRoom('admin:taxi', 'payment:disputed', disputePayload);

    logger.info('Payment dispute handled', { paymentId: parsedPaymentId, action });
    return disputePayload;
  });
};

module.exports = {
  getRideDetails,
  updateRideStatus,
  handleRideDispute,
  handleRideAlert,
  getRideAnalytics,
  assignDriverToRide,
  trackDriverLocation,
  getLiveTripMetrics,
  getPaymentDetails,
  analyzePayments,
  disputePayment,
};