'use strict';

const customerConstants = require('@constants/customer/customerConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const { Customer } = require('@models');
const AppError = require('@utils/AppError');

module.exports = {
  async authenticateCustomer(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(new AppError('No token provided', 401, customerConstants.ERROR_CODES[2]));
    }

    try {
      const customer = await Customer.findOne({ where: { token } });
      if (!customer || customer.status !== customerConstants.CUSTOMER_STATUSES[0]) {
        return next(new AppError('Invalid or inactive customer', 401, customerConstants.ERROR_CODES[0]));
      }

      if (customer.session_expiry < new Date()) {
        return next(new AppError('Session expired', 401, customerConstants.ERROR_CODES[2]));
      }

      req.user = customer;
      next();
    } catch (error) {
      return next(new AppError('Authentication failed', 401, customerConstants.ERROR_CODES[2]));
    }
  },

  async checkBookingLimit(req, res, next) {
    const { customerId } = req.body;
    try {
      const activeBookings = await Booking.count({
        where: {
          customer_id: customerId,
          status: [
            customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[0],
            customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[1],
          ],
        },
      });

      if (activeBookings >= mtablesConstants.CUSTOMER_SETTINGS.MAX_ACTIVE_BOOKINGS) {
        return next(new AppError('Maximum active bookings exceeded', 400, mtablesConstants.ERROR_TYPES[12]));
      }
      next();
    } catch (error) {
      return next(new AppError(error.message, 400, mtablesConstants.ERROR_TYPES[0]));
    }
  },
};