'use strict';

const { Tip, Driver, Wallet, WalletTransaction, sequelize } = require('@models');
const balanceService = require('./balanceService');
const transactionService = require('./transactionService');
const driverConstants = require('@constants/driver/driverConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const tipConstants = require('@constants/common/tipConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { handleServiceError } = require('@utils/errorHandling');
const { roundToDecimal } = require('@utils/mathUtils');
const { subtractDaysFromDate, getStartOfDay } = require('@utils/dateTimeUtils');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function recordTip(driverId, taskId, amount, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (amount < tipConstants.TIP_SETTINGS.MIN_AMOUNT || amount > tipConstants.TIP_SETTINGS.MAX_AMOUNT) {
    throw new AppError('Invalid tip amount', 400, tipConstants.ERROR_CODES.INVALID_AMOUNT);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_TYPES.WALLET_TYPES.DRIVER },
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  const serviceTypes = tipConstants.TIP_SETTINGS.SERVICE_TYPES;
  if (!(await validateTaskId(taskId, driverId, serviceTypes))) {
    throw new AppError('Invalid task ID for service', 400, tipConstants.ERROR_CODES.TIP_NOT_FOUND);
  }

  const transaction = await sequelize.transaction();
  try {
    const existingTip = await Tip.findOne({
      where: {
        [Op.or]: [
          { ride_id: taskId },
          { order_id: taskId },
          { booking_id: taskId },
          { event_service_id: taskId },
          { in_dining_order_id: taskId },
        ],
        recipient_id: driver.user_id,
      },
      transaction,
    });
    if (existingTip) {
      throw new AppError('Tip already exists', 400, tipConstants.ERROR_CODES.TIP_ALREADY_EXISTS);
    }

    const tip = await Tip.create({
      recipient_id: driver.user_id,
      wallet_id: wallet.id,
      amount,
      currency,
      ride_id: serviceTypes.includes('ride') && taskId ? taskId : null,
      order_id: serviceTypes.includes('order') && taskId ? taskId : null,
      booking_id: serviceTypes.includes('booking') && taskId ? taskId : null,
      event_service_id: serviceTypes.includes('event_service') && taskId ? taskId : null,
      in_dining_order_id: serviceTypes.includes('in_dining_order') && taskId ? taskId : null,
      status: tipConstants.TIP_SETTINGS.TIP_STATUSES[1], // completed
    }, { transaction });

    await balanceService.updateBalance(
      driverId,
      amount,
      driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[7], // tip
      currency,
      { transaction }
    );

    await transactionService.recordTransaction(
      driverId,
      taskId,
      amount,
      driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[7], // tip
      { transaction }
    );

    await transaction.commit();
    logger.info('Tip recorded', { driverId, taskId, amount, tipId: tip.id, currency });
    return {
      tipId: tip.id,
      taskId,
      amount: roundToDecimal(amount, 2),
      currency,
      status: tip.status,
      created_at: tip.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('recordTip', error, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }
}

async function getTipHistory(driverId, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  try {
    const tips = await Tip.findAll({
      where: { recipient_id: driver.user_id },
      order: [['created_at', 'DESC']],
      include: [
        { model: sequelize.models.Ride, as: 'ride', attributes: ['id', 'status'] },
        { model: sequelize.models.Order, as: 'order', attributes: ['id', 'status'] },
        { model: sequelize.models.Booking, as: 'booking', attributes: ['id'] },
        { model: sequelize.models.EventService, as: 'event_service', attributes: ['id'] },
        { model: sequelize.models.InDiningOrder, as: 'in_dining_order', attributes: ['id', 'status'] },
      ],
    });

    logger.info('Tip history retrieved', { driverId, currency });
    return tips.map(t => ({
      tipId: t.id,
      taskId: t.ride_id || t.order_id || t.booking_id || t.event_service_id || t.in_dining_order_id,
      serviceType: t.ride_id ? 'ride' : t.order_id ? 'order' : t.booking_id ? 'booking' : t.event_service_id ? 'event_service' : 'in_dining_order',
      amount: roundToDecimal(parseFloat(t.amount), 2),
      currency: t.currency,
      status: t.status,
      created_at: t.created_at,
    }));
  } catch (error) {
    throw handleServiceError('getTipHistory', error, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }
}

async function notifyTipReceived(driverId, taskId, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const tip = await Tip.findOne({
    where: {
      recipient_id: driver.user_id,
      [Op.or]: [
        { ride_id: taskId },
        { order_id: taskId },
        { booking_id: taskId },
        { event_service_id: taskId },
        { in_dining_order_id: taskId },
      ],
    },
  });
  if (!tip) {
    throw new AppError('Tip not found', 404, tipConstants.ERROR_CODES.TIP_NOT_FOUND);
  }

  logger.info('Tip notification prepared', { driverId, taskId, tipId: tip.id, currency });
  return { tipId: tip.id, taskId, amount: roundToDecimal(parseFloat(tip.amount), 2), currency };
}

async function calculateTipTrends(driverId, period, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!driverWalletConstants.WALLET_CONSTANTS.FINANCIAL_ANALYTICS.REPORT_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const dateFilter = {};
  const now = new Date();
  if (period === 'daily') dateFilter[Op.gte] = getStartOfDay(now);
  else if (period === 'weekly') dateFilter[Op.gte] = subtractDaysFromDate(now, 7);
  else if (period === 'monthly') dateFilter[Op.gte] = subtractDaysFromDate(now, 30);
  else if (period === 'yearly') dateFilter[Op.gte] = subtractDaysFromDate(now, 365);

  try {
    const tips = await Tip.findAll({
      where: { recipient_id: driver.user_id, created_at: dateFilter },
    });

    const trends = tips.reduce((acc, t) => {
      const date = t.created_at.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + parseFloat(t.amount);
      return acc;
    }, {});

    const result = Object.entries(trends).map(([date, amount]) => ({
      date,
      amount: roundToDecimal(amount, 2),
      currency,
    }));

    logger.info('Tip trends calculated', { driverId, period, currency });
    return { driverId, period, trends: result, currency };
  } catch (error) {
    throw handleServiceError('calculateTipTrends', error, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }
}

async function validateTipEligibility(driverId, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  try {
    const recentEarnings = await DriverEarnings.findAll({
      where: {
        driver_id: driverId,
        created_at: { [Op.gte]: subtractDaysFromDate(new Date(), 30) },
      },
    });

    const isEligible = recentEarnings.length > 0;
    logger.info('Tip eligibility validated', { driverId, isEligible, currency });
    return { driverId, isEligible, currency, reason: isEligible ? 'Active earnings in last 30 days' : 'No recent earnings' };
  } catch (error) {
    throw handleServiceError('validateTipEligibility', error, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }
}

async function validateTaskId(taskId, driverId, serviceTypes) {
  if (serviceTypes.includes('ride')) {
    const ride = await sequelize.models.Ride.findOne({ where: { id: taskId, driver_id: driverId } });
    if (ride) return true;
  }
  if (serviceTypes.includes('order')) {
    const order = await sequelize.models.Order.findOne({ where: { id: taskId, driver_id: driverId } });
    if (order) return true;
  }
  if (serviceTypes.includes('booking')) {
    const booking = await sequelize.models.Booking.findOne({ where: { id: taskId } });
    if (booking) return true;
  }
  if (serviceTypes.includes('event_service')) {
    const eventService = await sequelize.models.EventService.findOne({ where: { id: taskId } });
    if (eventService) return true;
  }
  if (serviceTypes.includes('in_dining_order')) {
    const inDiningOrder = await sequelize.models.InDiningOrder.findOne({ where: { id: taskId } });
    if (inDiningOrder) return true;
  }
  return false;
}

module.exports = {
  recordTip,
  getTipHistory,
  notifyTipReceived,
  calculateTipTrends,
  validateTipEligibility,
};