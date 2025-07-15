'use strict';

/**
 * Cancellation service for processing cancellations and refunds.
 */
const { sequelize } = require('@models');
const { Booking, Order, Ride, InDiningOrder, ParkingBooking, EventService, Event, User, Customer, Wallet, Payment } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtxiConstants = require('@constants/common/mtxiConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const meventsConstants = require('@constants/common/meventsConstants');
const en = require('@locales/customer/cancellation/en.json');

/**
 * Processes cancellation for a service.
 * @param {Object} params - Parameters
 * @param {number} params.serviceId - Service ID
 * @param {string} params.serviceType - Service type
 * @param {string} params.reason - Cancellation reason
 * @param {number} params.userId - User ID
 * @param {Object} params.transaction - Sequelize transaction
 * @returns {Object} Service type, reference, and user
 */
async function processCancellation({ serviceId, serviceType, reason, userId, transaction }) {
  let service, reference;

  // Validate service type
  if (!customerConstants.CROSS_VERTICAL_CONSTANTS.SERVICES.includes(serviceType)) {
    throw new Error(en.errors.invalid_service_type);
  }

  // Find and validate service
  switch (serviceType) {
    case 'mtables':
      service = await Booking.findByPk(serviceId, { transaction });
      if (!service) throw new Error(en.errors.service_not_found);
      if (service.status === mtablesConstants.BOOKING_STATUSES.CANCELLED) {
        throw new Error(en.errors.service_already_cancelled);
      }
      const bookingTime = new Date(`${service.booking_date} ${service.booking_time}`);
      const hoursUntilBooking = (bookingTime - new Date()) / (1000 * 60 * 60);
      if (hoursUntilBooking < mtablesConstants.BOOKING_POLICIES.CANCELLATION_WINDOW_HOURS) {
        throw new Error(customerConstants.ERROR_CODES.find(code => code === 'CANCELLATION_WINDOW_EXPIRED'));
      }
      reference = service.reference;
      await service.update({ status: mtablesConstants.BOOKING_STATUSES.CANCELLED }, { transaction });
      break;
    case 'munch':
      service = await Order.findByPk(serviceId, { transaction });
      if (!service) throw new Error(en.errors.service_not_found);
      if (service.status === munchConstants.ORDER_STATUSES.cancelled) {
        throw new Error(en.errors.service_already_cancelled);
      }
      const orderTime = new Date(service.created_at);
      const minutesSinceOrder = (new Date() - orderTime) / (1000 * 60);
      if (minutesSinceOrder > munchConstants.ORDER_SETTINGS.CANCELLATION_WINDOW_MINUTES) {
        throw new Error(munchConstants.ERROR_CODES.find(code => code === 'CANNOT_CANCEL_ORDER'));
      }
      reference = service.order_number;
      await service.update({ status: munchConstants.ORDER_STATUSES.cancelled }, { transaction });
      break;
    case 'mtxi':
      service = await Ride.findByPk(serviceId, { transaction });
      if (!service) throw new Error(en.errors.service_not_found);
      if (service.status === mtxiConstants.RIDE_STATUSES.CANCELLED) {
        throw new Error(en.errors.service_already_cancelled);
      }
      const rideTime = new Date(service.created_at);
      const minutesSinceRide = (new Date() - rideTime) / (1000 * 60);
      if (minutesSinceRide > mtxiConstants.RIDE_CONFIG.CANCELLATION_TIMEOUT_MINUTES) {
        throw new Error(mtxiConstants.ERROR_TYPES.find(type => type === 'RIDE_NOT_CANCELLABLE'));
      }
      reference = service.id.toString();
      await service.update({ status: mtxiConstants.RIDE_STATUSES.CANCELLED }, { transaction });
      break;
    case 'in_dining':
      service = await InDiningOrder.findByPk(serviceId, { transaction });
      if (!service) throw new Error(en.errors.service_not_found);
      if (service.status === mtablesConstants.ORDER_STATUSES.CANCELLED) {
        throw new Error(en.errors.service_already_cancelled);
      }
      reference = service.order_number;
      await service.update({ status: mtablesConstants.ORDER_STATUSES.CANCELLED }, { transaction });
      break;
    case 'mpark':
      service = await ParkingBooking.findByPk(serviceId, { transaction });
      if (!service) throw new Error(en.errors.service_not_found);
      if (service.status === mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES.CANCELLED) {
        throw new Error(en.errors.service_already_cancelled);
      }
      const startTime = new Date(service.start_time);
      const hoursUntilStart = (startTime - new Date()) / (1000 * 60 * 60);
      if (hoursUntilStart < mparkConstants.BOOKING_CONFIG.BOOKING_POLICIES.CANCELLATION_WINDOW_HOURS) {
        throw new Error(mparkConstants.ERROR_TYPES.find(type => type === 'CANCELLATION_NOT_ALLOWED'));
      }
      reference = service.id.toString();
      await service.update({ status: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES.CANCELLED }, { transaction });
      break;
  }

  // Validate user
  const user = await User.findByPk(userId, { attributes: ['id', 'preferred_language', 'notificationPreferences'], transaction });
  if (!user) throw new Error(en.errors.user_not_found);

  // Check for associated EventService
  const eventService = await EventService.findOne({
    where: { service_id: serviceId, service_type: serviceType },
    transaction,
  });
  if (eventService) {
    const event = await Event.findByPk(eventService.event_id, { transaction });
    if (event && event.status !== meventsConstants.EVENT_STATUSES.CANCELLED) {
      const activeServices = await EventService.count({
        where: {
          event_id: event.id,
          service_id: { [sequelize.Op.ne]: serviceId },
        },
        include: [
          { model: Booking, where: { status: { [sequelize.Op.ne]: mtablesConstants.BOOKING_STATUSES.CANCELLED } }, required: false },
          { model: Order, where: { status: { [sequelize.Op.ne]: munchConstants.ORDER_STATUSES.cancelled } }, required: false },
          { model: Ride, where: { status: { [sequelize.Op.ne]: mtxiConstants.RIDE_STATUSES.CANCELLED } }, required: false },
          { model: InDiningOrder, where: { status: { [sequelize.Op.ne]: mtablesConstants.ORDER_STATUSES.CANCELLED } }, required: false },
          { model: ParkingBooking, where: { status: { [sequelize.Op.ne]: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES.CANCELLED } }, required: false },
        ],
        transaction,
      });
      if (activeServices === 0) {
        await event.update({ status: meventsConstants.EVENT_STATUSES.CANCELLED }, { transaction });
      }
    }
  }

  return { serviceType, reference, user };
}

/**
 * Issues a refund for a cancelled service.
 * @param {Object} params - Parameters
 * @param {number} params.serviceId - Service ID
 * @param {string} params.serviceType - Service type
 * @param {number} params.walletId - Wallet ID
 * @param {number} params.userId - User ID
 * @param {Object} params.transaction - Sequelize transaction
 * @returns {Object} Payment, service type, adjusted amount, wallet, and event service
 */
async function issueRefund({ serviceId, serviceType, walletId, userId, transaction }) {
  let payment, service;

  // Validate service type
  if (!customerConstants.CROSS_VERTICAL_CONSTANTS.SERVICES.includes(serviceType)) {
    throw new Error(en.errors.invalid_service_type);
  }

  // Find and validate service
  switch (serviceType) {
    case 'mtables':
      service = await Booking.findByPk(serviceId, { transaction });
      if (!service) throw new Error(en.errors.service_not_found);
      if (service.status !== mtablesConstants.BOOKING_STATUSES.CANCELLED) {
        throw new Error(en.errors.service_already_cancelled);
      }
      const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
      if (!customer) throw new Error(en.errors.user_not_found);
      const inDiningOrder = await InDiningOrder.findOne({
        where: { table_id: service.table_id, customer_id: customer.id },
        transaction,
      });
      if (!inDiningOrder) throw new Error(en.errors.service_not_found);
      payment = await Payment.findOne({
        where: { in_dining_order_id: inDiningOrder.id, status: paymentConstants.TRANSACTION_STATUSES.COMPLETED },
        transaction,
      });
      break;
    case 'munch':
      service = await Order.findByPk(serviceId, { transaction });
      if (!service) throw new Error(en.errors.service_not_found);
      if (service.status !== munchConstants.ORDER_STATUSES.cancelled) {
        throw new Error(en.errors.service_already_cancelled);
      }
      payment = await Payment.findOne({
        where: { order_id: service.id, status: paymentConstants.TRANSACTION_STATUSES.COMPLETED },
        transaction,
      });
      break;
    case 'mtxi':
      service = await Ride.findByPk(serviceId, { transaction });
      if (!service) throw new Error(en.errors.service_not_found);
      if (service.status !== mtxiConstants.RIDE_STATUSES.CANCELLED) {
        throw new Error(en.errors.service_already_cancelled);
      }
      payment = await Payment.findOne({
        where: { id: service.paymentId, status: paymentConstants.TRANSACTION_STATUSES.COMPLETED },
        transaction,
      });
      break;
    case 'in_dining':
      service = await InDiningOrder.findByPk(serviceId, { transaction });
      if (!service) throw new Error(en.errors.service_not_found);
      if (service.status !== mtablesConstants.Order_STATUSES.CANCELLED) {
        throw new Error(en.errors.service_already_cancelled);
      }
      payment = await Payment.findOne({
        where: { in_dining_order_id: service.id, status: paymentConstants.TRANSACTION_STATUSES.COMPLETED },
        transaction,
      });
      break;
    case 'mpark':
      service = await ParkingBooking.findByPk(serviceId, { transaction });
      if (!service) throw new Error(en.errors.service_not_found);
      if (service.status !== mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES.CANCELLED) {
        throw new Error(en.errors.service_already_cancelled);
      }
      payment = await Payment.findOne({
        where: { booking_id: service.id, status: paymentConstants.TRANSACTION_STATUSES.COMPLETED },
        transaction,
      });
      break;
  }
  if (!payment) throw new Error(en.errors.no_payment_found);

  // Check for EventService and handle split payments
  const eventService = await EventService.findOne({
    where: { service_id: serviceId, service_type: serviceType },
    transaction,
  });
  let adjustedAmount = payment.amount;
  if (eventService) {
    const event = await Event.findByPk(eventService.event_id, { transaction });
    if (event && event.payment_type === meventsConstants.PAYMENT_TYPES.SPLIT) {
      const totalParticipants = await sequelize.models.EventParticipant.count({
        where: { event_id: event.id },
        transaction,
      });
      if (totalParticipants > 1) {
        adjustedAmount = payment.amount / totalParticipants;
      }
    }
    await eventService.update({ payment_id: null }, { transaction });
  }

  // Validate wallet
  const wallet = await Wallet.findByPk(walletId, { transaction });
  if (!wallet || wallet.user_id !== userId) {
    throw new Error(en.errors.invalid_wallet);
  }

  return { payment, serviceType, adjustedAmount, wallet, eventService };
}

module.exports = {
  processCancellation,
  issueRefund,
};