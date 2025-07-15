'use strict';

/**
 * Review Middleware
 * Validates and preprocesses review-related requests.
 */

const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization');
const { Review, Order, Ride } = require('@models');

/**
 * Validates review submission parameters.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateReviewSubmission = async (req, res, next) => {
  const { userId, languageCode = customerConstants.DEFAULT_LANGUAGE } = req.user;
  const { serviceType, serviceId, targetType, targetId } = req.body;

  try {
    // Validate service type
    if (!['mtables', 'munch', 'mtxi'].includes(serviceType)) {
      throw new AppError(
        formatMessage('customer', 'reviews', languageCode, 'error.INVALID_SERVICE_TYPE'),
        400,
        'INVALID_SERVICE_TYPE'
      );
    }

    // Validate target type
    if (!['merchant', 'staff', 'driver'].includes(targetType)) {
      throw new AppError(
        formatMessage('customer', 'reviews', languageCode, 'error.INVALID_TARGET_TYPE'),
        400,
        'INVALID_TARGET_TYPE'
      );
    }

    // Verify serviceId exists and belongs to user
    let serviceExists = false;
    if (serviceType === 'mtxi') {
      const ride = await Ride.findOne({ where: { id: serviceId, customer_id: userId } });
      if (ride && (targetType === 'driver' ? ride.driver_id === targetId : true)) {
        serviceExists = true;
      }
    } else {
      const order = await Order.findOne({ where: { id: serviceId, customer_id: userId } });
      if (order && (targetType === 'merchant' ? order.merchant_id === targetId : true)) {
        serviceExists = true;
      }
    }

    if (!serviceExists) {
      throw new AppError(
        formatMessage('customer', 'reviews', languageCode, 'error.REVIEW_SUBMISSION_FAILED'),
        400,
        'INVALID_SERVICE_ID'
      );
    }

    next();
  } catch (error) {
    logger.error('Review submission validation failed', { userId, serviceType, targetType, error: error.message });
    next(error);
  }
};

/**
 * Validates review ownership for update/delete.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateReviewOwnership = async (req, res, next) => {
  const { userId, languageCode = customerConstants.DEFAULT_LANGUAGE } = req.user;
  const { reviewId } = req.params;

  try {
    const review = await Review.findOne({ where: { id: reviewId, customer_id: userId } });
    if (!review) {
      throw new AppError(
        formatMessage('customer', 'reviews', languageCode, 'error.REVIEW_NOT_FOUND'),
        404,
        'REVIEW_NOT_FOUND'
      );
    }
    req.review = review;
    next();
  } catch (error) {
    logger.error('Review ownership validation failed', { userId, reviewId, error: error.message });
    next(error);
  }
};

module.exports = {
  validateReviewSubmission,
  validateReviewOwnership,
};