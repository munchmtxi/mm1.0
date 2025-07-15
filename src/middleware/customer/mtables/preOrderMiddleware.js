// src/middleware/customer/mtables/preOrderMiddleware.js
'use strict';

const { Booking, InDiningOrder } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');

const validateBooking = async (req, res, next) => {
  const { bookingId } = req.body;
  const languageCode = req.user.languageCode || localizationConstants.DEFAULT_LANGUAGE;

  try {
    const booking = await Booking.findByPk(bookingId);
    if (!booking || !customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.includes(booking.status) || booking.status === 'cancelled' || booking.status === 'no_show') {
      return res.status(400).json({
        success: false,
        message: formatMessage('customer', 'mtables', languageCode, mtablesConstants.ERROR_TYPES[7]),
      });
    }
    if (booking.customer_id !== req.user.customer_id) {
      return res.status(403).json({
        success: false,
        message: formatMessage('customer', 'mtables', languageCode, mtablesConstants.ERROR_TYPES[3]),
      });
    }
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: formatMessage('customer', 'mtables', languageCode, mtablesConstants.ERROR_TYPES[0]),
    });
  }
};

const validateOrder = async (req, res, next) => {
  const { orderId } = req.body;
  const languageCode = req.user.languageCode || localizationConstants.DEFAULT_LANGUAGE;

  try {
    const order = await InDiningOrder.findByPk(orderId);
    if (!order || order.order_type !== customerConstants.MUNCH_CONSTANTS.ORDER_TYPES[3]) {
      return res.status(400).json({
        success: false,
        message: formatMessage('customer', 'mtables', languageCode, mtablesConstants.ERROR_TYPES[24]),
      });
    }
    if (order.customer_id !== req.user.customer_id) {
      return res.status(403).json({
        success: false,
        message: formatMessage('customer', 'mtables', languageCode, mtablesConstants.ERROR_TYPES[3]),
      });
    }
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: formatMessage('customer', 'mtables', languageCode, mtablesConstants.ERROR_TYPES[0]),
    });
  }
};

module.exports = { validateBooking, validateOrder };