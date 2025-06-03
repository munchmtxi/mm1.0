'use strict';

const { sequelize } = require('@models');
const { Booking, Order, Ride, InDiningOrder, EventService, Event, User } = require('@models');
const mtablesConstants = require('@constants/mtablesConstants');
const munchConstants = require('@constants/munchConstants');
const rideConstants = require('@constants/rideConstants');

async function processCancellation({ serviceId, reason, userId, transaction }) {
  let serviceType, service, reference;

  // Find and validate service
  service = await Booking.findByPk(serviceId, { transaction });
  if (service) {
    if (service.status === mtablesConstants.BOOKING_STATUSES.cancelled) {
      throw new Error('Booking already cancelled');
    }
    serviceType = 'mtables';
    reference = service.reference;
    await service.update({ status: mtablesConstants.BOOKING_STATUSES.cancelled }, { transaction });
  } else {
    service = await Order.findByPk(serviceId, { transaction });
    if (service) {
      if (service.status === munchConstants.ORDER_STATUSES.cancelled) {
        throw new Error('Order already cancelled');
      }
      serviceType = 'munch';
      reference = service.order_number;
      await service.update({ status: munchConstants.ORDER_STATUSES.cancelled }, { transaction });
    } else {
      service = await Ride.findByPk(serviceId, { transaction });
      if (service) {
        if (service.status === rideConstants.RIDE_STATUSES.CANCELLED) {
          throw new Error('Ride already cancelled');
        }
        serviceType = 'mtxi';
        reference = service.id.toString();
        await service.update({ status: rideConstants.RIDE_STATUSES.CANCELLED }, { transaction });
      } else {
        service = await InDiningOrder.findByPk(serviceId, { transaction });
        if (service) {
          if (service.status === 'cancelled') {
            throw new Error('In-dining order already cancelled');
          }
          serviceType = 'in_dining';
          reference = service.order_number;
          await service.update({ status: 'cancelled' }, { transaction });
        } else {
          throw new Error('Service not found');
        }
      }
    }
  }

  // Validate user
  const user = await User.findByPk(userId, { attributes: ['id', 'preferred_language', 'notificationPreferences'], transaction });
  if (!user) throw new Error('User not found');

  // Check for associated EventService
  const eventService = await EventService.findOne({
    where: { service_id: serviceId, service_type: serviceType },
    transaction,
  });
  if (eventService) {
    const event = await Event.findByPk(eventService.event_id, { transaction });
    if (event && event.status !== 'cancelled') {
      const activeServices = await EventService.count({
        where: {
          event_id: event.id,
          service_id: { [sequelize.Op.ne]: serviceId },
        },
        include: [
          { model: Booking, where: { status: { [sequelize.Op.ne]: mtablesConstants.BOOKING_STATUSES.cancelled } }, required: false },
          { model: Order, where: { status: { [sequelize.Op.ne]: munchConstants.ORDER_STATUSES.cancelled } }, required: false },
          { model: Ride, where: { status: { [sequelize.Op.ne]: rideConstants.RIDE_STATUSES.CANCELLED } }, required: false },
          { model: InDiningOrder, where: { status: { [sequelize.Op.ne]: 'cancelled' } }, required: false },
        ],
        transaction,
      });
      if (activeServices === 0) {
        await event.update({ status: 'cancelled' }, { transaction });
      }
    }
  }

  return { serviceType, reference, user };
}

async function issueRefund({ serviceId, walletId, userId, transaction }) {
  let payment, serviceType;
  let service = await Booking.findByPk(serviceId, { transaction });
  if (service) {
    if (service.status !== mtablesConstants.BOOKING_STATUSES.cancelled) {
      throw new Error('Booking not cancelled');
    }
    serviceType = 'mtables';
    const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
    if (!customer) throw new Error('Customer not found for user');
    const inDiningOrder = await InDiningOrder.findOne({
      where: { table_id: service.table_id, customer_id: customer.id },
      transaction,
    });
    if (!inDiningOrder) throw new Error('No in-dining order found for booking');
    payment = await Payment.findOne({
      where: { in_dining_order_id: inDiningOrder.id, status: 'completed' },
      transaction,
    });
  } else {
    service = await Order.findByPk(serviceId, { transaction });
    if (service) {
      if (service.status !== munchConstants.ORDER_STATUSES.cancelled) {
        throw new Error('Order not cancelled');
      }
      serviceType = 'munch';
      payment = await Payment.findOne({
        where: { order_id: service.id, status: 'completed' },
        transaction,
      });
    } else {
      service = await Ride.findByPk(serviceId, { transaction });
      if (service) {
        if (service.status !== rideConstants.RIDE_STATUSES.CANCELLED) {
          throw new Error('Ride not cancelled');
        }
        serviceType = 'mtxi';
        payment = await Payment.findOne({
          where: { id: service.paymentId, status: 'completed' },
          transaction,
        });
      } else {
        service = await InDiningOrder.findByPk(serviceId, { transaction });
        if (service) {
          if (service.status !== 'cancelled') {
            throw new Error('In-dining order not cancelled');
          }
          serviceType = 'in_dining';
          payment = await Payment.findOne({
            where: { in_dining_order_id: service.id, status: 'completed' },
            transaction,
          });
        } else {
          throw new Error('Service not found');
        }
      }
    }
  }
  if (!payment) throw new Error('No completed payment found for service');

  // Check for EventService and handle split payments
  const eventService = await EventService.findOne({
    where: { service_id: serviceId, service_type: serviceType },
    transaction,
  });
  let adjustedAmount = payment.amount;
  if (eventService) {
    const event = await Event.findByPk(eventService.event_id, { transaction });
    if (event && event.payment_type === 'split') {
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

  const wallet = await Wallet.findByPk(walletId, { transaction });
  if (!wallet || wallet.user_id !== userId) {
    throw new Error('Invalid wallet');
  }

  return { payment, serviceType, adjustedAmount, wallet, eventService };
}

module.exports = {
  processCancellation,
  issueRefund,
};