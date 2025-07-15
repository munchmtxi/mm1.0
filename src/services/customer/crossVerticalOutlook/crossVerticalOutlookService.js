'use strict';

const { Op } = require('sequelize');
const customerConstants = require('@constants/customer/customerConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtxiConstants = require('@constants/common/mtxiConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const meventsConstants = require('@constants/common/meventsConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function getCustomerServices(sequelize, customerId, languageCode = 'en') {
  const User = sequelize.models.User;
  const Booking = sequelize.models.Booking;
  const Order = sequelize.models.Order;
  const InDiningOrder = sequelize.models.InDiningOrder;
  const Ride = sequelize.models.Ride;
  const ParkingBooking = sequelize.models.ParkingBooking;
  const EventService = sequelize.models.EventService;

  const maxActive = {
    bookings: customerConstants.CUSTOMER_SETTINGS.MAX_ACTIVE_BOOKINGS,
    orders: munchConstants.MUNCH_SETTINGS.MAX_ACTIVE_ORDERS,
    rides: mtxiConstants.RIDE_CONFIG.MAX_ACTIVE_RIDES_PER_CUSTOMER,
    parking: mparkConstants.PARKING_CONFIG.MAX_ACTIVE_PARKING_BOOKINGS_PER_CUSTOMER,
    events: meventsConstants.EVENT_CONFIG.MAX_SERVICES,
  };

  try {
    const services = await Promise.all([
      Booking.findAll({
        where: {
          customer_id: customerId,
          status: { [Op.in]: mtablesConstants.BOOKING_STATUSES.filter(s => s !== 'CANCELLED' && s !== 'NO_SHOW') },
        },
        include: [
          { model: User, as: 'customer', attributes: ['id', 'first_name', 'last_name'] },
          { model: sequelize.models.Merchant, as: 'merchant' },
          { model: sequelize.models.Table, as: 'table' },
          { model: sequelize.models.MerchantBranch, as: 'branch' },
        ],
        limit: maxActive.bookings,
      }),
      Order.findAll({
        where: {
          customer_id: customerId,
          status: { [Op.in]: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.filter(s => s !== 'CANCELLED' && s !== 'REFUNDED') },
        },
        include: [
          { model: User, as: 'customer', attributes: ['id', 'first_name', 'last_name'] },
          { model: sequelize.models.Merchant, as: 'merchant' },
          { model: sequelize.models.MerchantBranch, as: 'branch' },
        ],
        limit: maxActive.orders,
      }),
      InDiningOrder.findAll({
        where: {
          customer_id: customerId,
          status: { [Op.in]: mtablesConstants.IN_DINING_STATUSES.filter(s => s !== 'CANCELLED') },
        },
        include: [
          { model: User, as: 'customer', attributes: ['id', 'first_name', 'last_name'] },
          { model: sequelize.models.MerchantBranch, as: 'branch' },
          { model: sequelize.models.Table, as: 'table' },
        ],
        limit: maxActive.orders,
      }),
      Ride.findAll({
        where: {
          customerId: customerId,
          status: { [Op.in]: mtxiConstants.RIDE_STATUSES.filter(s => s !== 'CANCELLED' && s !== 'COMPLETED') },
        },
        include: [
          { model: User, as: 'customer', attributes: ['id', 'first_name', 'last_name'] },
          { model: sequelize.models.Driver, as: 'driver' },
        ],
        limit: maxActive.rides,
      }),
      ParkingBooking.findAll({
        where: {
          customer_id: customerId,
          status: { [Op.in]: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES.filter(s => s !== 'CANCELLED' && s !== 'NO_SHOW') },
        },
        include: [
          { model: User, as: 'customer', attributes: ['id', 'first_name', 'last_name'] },
          { model: sequelize.models.ParkingSpace, as: 'space' },
          { model: sequelize.models.Merchant, as: 'merchant' },
        ],
        limit: maxActive.parking,
      }),
      EventService.findAll({
        where: {
          service_type: { [Op.in]: meventsConstants.EVENT_CONFIG.SERVICE_INTEGRATIONS },
        },
        include: [
          { model: sequelize.models.Event, as: 'event', where: { status: { [Op.in]: meventsConstants.EVENT_STATUSES.filter(s => s !== 'CANCELLED') } } },
          { model: Booking, as: 'Booking', where: { customer_id: customerId }, required: false },
          { model: Order, as: 'Order', where: { customer_id: customerId }, required: false },
          { model: Ride, as: 'Ride', where: { customerId: customerId }, required: false },
          { model: InDiningOrder, as: 'InDiningOrder', where: { customer_id: customerId }, required: false },
          { model: ParkingBooking, as: 'ParkingBooking', where: { customer_id: customerId }, required: false },
        ],
        limit: maxActive.events,
      }),
    ]);

    return {
      bookings: services[0],
      orders: services[1],
      inDiningOrders: services[2],
      rides: services[3],
      parkingBookings: services[4],
      eventServices: services[5],
    };
  } catch (error) {
    logger.logErrorEvent('Failed to fetch customer services', { customerId, error: error.message });
    throw new AppError('Failed to fetch services', 500, 'SERVICES_FETCH_FAILED', null, { customerId });
  }
}

async function cancelService(sequelize, customerId, serviceType, serviceId, languageCode = 'en') {
  let model, statusField, allowedStatuses, cancelledStatus, errorType;

  try {
    switch (serviceType) {
      case 'mtables':
        model = sequelize.models.Booking;
        statusField = 'status';
        allowedStatuses = mtablesConstants.BOOKING_STATUSES.filter(s => s !== 'CANCELLED' && s !== 'NO_SHOW');
        cancelledStatus = 'CANCELLED';
        errorType = 'BOOKING_CANCELLATION_FAILED';
        break;
      case 'munch':
        model = sequelize.models.Order;
        statusField = 'status';
        allowedStatuses = munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.filter(s => s !== 'CANCELLED' && s !== 'REFUNDED');
        cancelledStatus = 'CANCELLED';
        errorType = 'ORDER_CANCELLATION_FAILED';
        break;
      case 'in_dining':
        model = sequelize.models.InDiningOrder;
        statusField = 'status';
        allowedStatuses = mtablesConstants.IN_DINING_STATUSES.filter(s => s !== 'CANCELLED');
        cancelledStatus = 'CANCELLED';
        errorType = 'ORDER_CANCELLATION_FAILED';
        break;
      case 'mtxi':
        model = sequelize.models.Ride;
        statusField = 'status';
        allowedStatuses = mtxiConstants.RIDE_STATUSES.filter(s => s !== 'CANCELLED' && s !== 'COMPLETED');
        cancelledStatus = 'CANCELLED';
        errorType = 'RIDE_CANCELLATION_FAILED';
        break;
      case 'mpark':
        model = sequelize.models.ParkingBooking;
        statusField = 'status';
        allowedStatuses = mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES.filter(s => s !== 'CANCELLED' && s !== 'NO_SHOW');
        cancelledStatus = 'CANCELLED';
        errorType = 'PARKING_CANCELLATION_FAILED';
        break;
      default:
        throw new AppError('Invalid service type', 400, 'INVALID_SERVICE_TYPE');
    }

    const service = await model.findOne({
      where: {
        id: serviceId,
        customer_id: customerId,
        [statusField]: { [Op.in]: allowedStatuses },
      },
    });

    if (!service) {
      throw new AppError('Service not found or not cancellable', 404, errorType);
    }

    const cancellationWindow = serviceType === 'mpark' ? mparkConstants.BOOKING_CONFIG.BOOKING_POLICIES.CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000 :
      serviceType === 'mtxi' ? mtxiConstants.RIDE_CONFIG.CANCELLATION_TIMEOUT_MIN * 60 * 1000 :
      mtablesConstants.BOOKING_POLICIES.CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;

    if (Date.now() - new Date(service.created_at).getTime() > cancellationWindow) {
      throw new AppError('Cancellation window expired', 400, 'CANCELLATION_WINDOW_EXPIRED');
    }

    await service.update({ [statusField]: cancelledStatus });

    return service;
  } catch (error) {
    logger.logErrorEvent(`Failed to cancel ${serviceType} service`, { customerId, serviceId, error: error.message });
    throw error instanceof AppError ? error : new AppError('Failed to cancel service', 500, errorType, null, { customerId, serviceId });
  }
}

module.exports = {
  getCustomerServices,
  cancelService,
};