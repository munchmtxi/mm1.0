'use strict';

const { Subscription, MenuInventory } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const munchConstants = require('@constants/common/munchConstants');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');
const AppError = require('@utils/AppError');

/**
 * Checks active subscription limits and menu item validity
 */
const checkActiveSubscriptions = async (req, res, next) => {
  const { userId, menuItemId } = req.body;
  const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

  try {
    const activeSubscriptions = await Subscription.count({
      where: {
        user_id: userId,
        status: customerConstants.SUBSCRIPTION_CONSTANTS.STATUSES.ACTIVE,
      },
    });

    if (activeSubscriptions >= customerConstants.SUBSCRIPTION_CONSTANTS.MAX_ACTIVE_SUBSCRIPTIONS) {
      return next(new AppError(
        formatMessage('customer', 'subscription', languageCode, 'error.MAX_SUBSCRIPTIONS_EXCEEDED'),
        400,
        munchConstants.ERROR_CODES.MAX_SUBSCRIPTIONS_EXCEEDED
      ));
    }

    if (menuItemId) {
      const menuItem = await MenuInventory.findOne({
        where: { id: menuItemId, is_published: true },
      });

      if (!menuItem) {
        return next(new AppError(
          formatMessage('customer', 'subscription', languageCode, 'error.INVALID_MENU_ITEM'),
          400,
          munchConstants.ERROR_CODES.INVALID_MENU_ITEM
        ));
      }
    }

    next();
  } catch (error) {
    next(new AppError(
      formatMessage('customer', 'subscription', languageCode, 'error.generic', { message: error.message }),
      500,
      munchConstants.ERROR_CODES.SUBSCRIPTION_CHECK_FAILED
    ));
  }
};

module.exports = {
  checkActiveSubscriptions,
};