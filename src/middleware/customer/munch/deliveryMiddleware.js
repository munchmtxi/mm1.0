'use strict';

const { Op } = require('sequelize');
const { Order } = require('@models');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const munchConstants = require('@constants/customer/munch/munchConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');

/**
 * Middleware for delivery-related checks.
 */
module.exports = {
  checkOrderExists: async (req, res, next) => {
    const { orderId } = req.params;
    const { role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.order_not_found'),
        404,
        munchConstants.ERROR_CODES.ORDER_NOT_FOUND
      );
    }
    req.order = order;
    next();
  },

  checkOrderCancellable: async (req, res, next) => {
    const { order } = req;
    const { role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    if (order.status !== munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[0]) { // pending
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.order_not_cancellable'),
        400,
        munchConstants.ERROR_CODES.CANNOT_CANCEL_ORDER
      );
    }
    next();
  },

  checkOrderCompleted: async (req, res, next) => {
    const { order } = req;
    const { role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    if (order.status !== munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[2]) { // delivered
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.feedback_not_allowed'),
        400,
        munchConstants.ERROR_CODES.FEEDBACK_NOT_ALLOWED
      );
    }
    next();
  },

  checkDriverAssignment: async (req, res, next) => {
    const { order } = req;
    const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    if (role === 'driver' && order.driver_id !== userId) {
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.driver_not_assigned'),
        403,
        driverConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }
    next();
  },
};