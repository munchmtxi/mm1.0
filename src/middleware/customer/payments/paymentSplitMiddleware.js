'use strict';

/**
 * Middleware for split payment and refund endpoints.
 */

const { User, Order, InDiningOrder, Booking, Ride, Event, Parking } = require('@models');
const AppError = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');
const paymentConstants = require('@constants/common/paymentConstants');

/**
 * Verifies service existence for split payment or refund.
 */
exports.verifyService = async (req, res, next) => {
  const { serviceId, serviceType } = req.body;
  const { userId, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

  try {
    let service;
    switch (serviceType) {
      case 'order':
        service = await Order.findByPk(serviceId);
        break;
      case 'in_dining_order':
        service = await InDiningOrder.findByPk(serviceId);
        break;
      case 'booking':
        service = await Booking.findByPk(serviceId);
        break;
      case 'ride':
        service = await Ride.findByPk(serviceId);
        break;
      case 'event':
        service = await Event.findByPk(serviceId);
        break;
      default:
        throw new AppError(
          formatMessage('customer', 'payments', languageCode, 'error.invalid_service'),
          400,
          paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD
        );
    }

    if (!service) {
      throw new AppError(
        formatMessage('customer', 'payments', languageCode, 'error.service_not_found'),
        404,
        paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD
      );
    }

    // Verify user is associated with the service
    if (service.user_id !== userId && !['order', 'in_dining_order'].includes(serviceType)) {
      throw new AppError(
        formatMessage('customer', 'payments', languageCode, 'error.unauthorized'),
        403,
        paymentConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Verifies customer IDs in payments or refunds.
 */
exports.verifyCustomers = async (req, res, next) => {
  const { payments, refunds, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.body;
  const customerIds = (payments || refunds || []).map(item => item.customerId);

  try {
    const customers = await User.findAll({
      where: { id: customerIds, role: 'customer' },
    });

    if (customers.length !== customerIds.length) {
      throw new AppError(
        formatMessage('customer', 'payments', languageCode, 'error.invalid_customer_ids'),
        400,
        paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};