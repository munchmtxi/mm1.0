'use strict';

const { User, Merchant } = require('@models');
const AppError = require('@utils/AppError');
const merchantConstants = require('@constants/merchant/merchantConstants');
const logger = require('@utils/logger');

/**
 * Middleware for accessibility-related request validation.
 */
const accessibilityMiddleware = {
  /**
   * Verifies merchant exists and is valid.
   */
  verifyMerchant: async (req, res, next) => {
    try {
      const { merchantId } = req.params;
      const merchant = await User.findByPk(merchantId, {
        include: [{ model: Merchant, as: 'merchant_profile', attributes: ['id'] }],
      });

      if (!merchant || !merchant.merchant_profile) {
        throw new AppError('Invalid merchant', 404, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
      }

      req.merchant = merchant;
      logger.info('Merchant verified', { merchantId });
      next();
    } catch (error) {
      logger.error('Merchant verification failed', { error: error.message, merchantId: req.params.merchantId });
      next(error);
    }
  },

  /**
   * Restricts access to merchant role.
   */
  restrictToMerchant: (req, res, next) => {
    const user = req.user || {};
    if (!user.role_id || user.role_id !== 'merchant') {
      const error = new AppError('Merchant access required', 403, merchantConstants.ERROR_CODES.PERMISSION_DENIED);
      logger.error('Unauthorized access attempt', { userId: user.id, role: user.role_id });
      return next(error);
    }
    logger.info('Merchant role verified', { userId: user.id });
    next();
  },
};

module.exports = accessibilityMiddleware;