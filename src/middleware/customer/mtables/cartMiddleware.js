'use strict';

const { Customer } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

module.exports = {
  async authenticateCustomer(req, res, next) {
    const customerId = req.body.customerId || req.user?.id;
    if (!customerId) {
      logger.logErrorEvent('Customer ID missing', { ip: req.ip });
      return next(new AppError(mtablesConstants.ERROR_TYPES[10], 400, 'INVALID_CUSTOMER_ID'));
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      logger.logErrorEvent('Customer not found', { customerId });
      return next(new AppError(mtablesConstants.ERROR_TYPES[10], 400, 'INVALID_CUSTOMER_ID'));
    }

    req.user = customer;
    next();
  },

  async validateCartAccess(req, res, next) {
    const { cartId } = req.params;
    const customerId = req.user.id;

    const cart = await require('@models').Cart.findOne({ where: { id: cartId, customer_id: customerId } });
    if (!cart) {
      logger.logErrorEvent('Cart access denied', { cartId, customerId });
      return next(new AppError(mtablesConstants.ERROR_TYPES[22], 400, 'INVALID_CART_ID'));
    }

    req.cart = cart;
    next();
  },
};