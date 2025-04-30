'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const calculateTotalAmount = (baseAmount, taxRate = 0.15, discount = 0) => {
  try {
    if (baseAmount < 0) {
      logger.warn('Invalid base amount for calculation', { baseAmount });
      throw new AppError('Base amount cannot be negative', 400, 'INVALID_INPUT');
    }

    if (taxRate < 0 || discount < 0) {
      logger.warn('Invalid tax rate or discount', { taxRate, discount });
      throw new AppError('Tax rate and discount cannot be negative', 400, 'INVALID_INPUT');
    }

    const taxAmount = baseAmount * taxRate;
    const totalAmount = baseAmount + taxAmount - discount;

    if (totalAmount < 0) {
      logger.warn('Calculated total amount is negative', { baseAmount, taxRate, discount });
      throw new AppError('Total amount cannot be negative', 400, 'INVALID_CALCULATION');
    }

    logger.info('Total amount calculated', { baseAmount, taxRate, discount, totalAmount });
    return Number(totalAmount.toFixed(2));
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('Failed to calculate total amount', 500, 'INTERNAL_SERVER_ERROR');
  }
};

module.exports = { calculateTotalAmount };