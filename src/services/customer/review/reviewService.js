'use strict';

const { sequelize, User, Customer, Order, InDiningOrder, Booking, Ride, Review, ReviewInteraction } = require('@models');
const reviewConstants = require('@constants/customer/review/reviewConstants');
const munchConstants = require('@constants/munchConstants');
const mtablesConstants = require('@constants/mtablesConstants');
const rideConstants = require('@constants/rideConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function submitReview(customerId, serviceId, review, transaction) {
  const { serviceType, rating, comment, title, photos, anonymous } = review;

  const user = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
  if (!user || !user.customer_profile) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_customer'),
      400,
      reviewConstants.ERROR_CODES[0]
    );
  }

  let service, merchantId, driverId, staffId;
  switch (serviceType) {
    case 'order':
      service = await Order.findByPk(serviceId, { transaction });
      if (!service) {
        throw new AppError(
          formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.order_not_found'),
          404,
          reviewConstants.ERROR_CODES[1]
        );
      }
      if (service.status !== 'completed') {
        throw new AppError(
          formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_order_status'),
          400,
          reviewConstants.ERROR_CODES[5]
        );
      }
      merchantId = service.merchant_id;
      driverId = service.driver_id;
      staffId = service.staff_id;
      break;
    case 'in_dining_order':
      service = await InDiningOrder.findByPk(serviceId, { transaction });
      if (!service) {
        throw new AppError(
          formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.order_not_found'),
          404,
          reviewConstants.ERROR_CODES[1]
        );
      }
      if (service.status !== 'closed') {
        throw new AppError(
          formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_order_status'),
          400,
          reviewConstants.ERROR_CODES[5]
        );
      }
      merchantId = service.branch_id ? (await service.getBranch({ transaction }))?.merchant_id : null;
      staffId = service.staff_id;
      break;
    case 'booking':
      service = await Booking.findByPk(serviceId, { transaction });
      if (!service) {
        throw new AppError(
          formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.booking_not_found'),
          404,
          reviewConstants.ERROR_CODES[2]
        );
      }
      if (service.status !== 'seated') {
        throw new AppError(
          formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_booking_status'),
          400,
          reviewConstants.ERROR_CODES[6]
        );
      }
      merchantId = service.merchant_id;
      staffId = service.staff_id;
      break;
    case 'ride':
      service = await Ride.findByPk(serviceId, { transaction });
      if (!service) {
        throw new AppError(
          formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.ride_not_found'),
          404,
          reviewConstants.ERROR_CODES[3]
        );
      }
      if (service.status !== 'COMPLETED') {
        throw new AppError(
          formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_ride_status'),
          400,
          reviewConstants.ERROR_CODES[7]
        );
      }
      driverId = service.driverId;
      break;
    default:
      throw new AppError(
        formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service_type'),
        400,
        reviewConstants.ERROR_CODES[4]
      );
  }

  if (rating < reviewConstants.REVIEW_SETTINGS.RATING_MIN_INT || rating > reviewConstants.REVIEW_SETTINGS.RATING_MAX_INT) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_rating'),
      400,
      reviewConstants.ERROR_CODES[8]
    );
  }

  if (photos && (!Array.isArray(photos) || photos.some(url => typeof url !== 'string'))) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_photos'),
      400,
      reviewConstants.ERROR_CODES[4]
    );
  }

  const existingReview = await Review.findOne({
    where: { customer_id: customerId, service_type: serviceType, service_id: serviceId },
    transaction,
  });
  if (existingReview) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.review_already_submitted'),
      400,
      reviewConstants.ERROR_CODES[9]
    );
  }

  const reviewRecord = await Review.create({
    customer_id: customerId,
    merchant_id: merchantId,
    driver_id: driverId,
    staff_id: staffId,
    service_type: serviceType,
    service_id: serviceId,
    rating,
    comment,
    title,
    photos: photos || [],
    anonymous: !!anonymous,
    status: reviewConstants.REVIEW_SETTINGS.DEFAULT_STATUS_TYPE,
    created_at: new Date(),
    updated_at: new Date(),
  }, { transaction });

  logger.info('Review submitted', { customerId, serviceId, serviceType });
  return {
    reviewId: reviewRecord.id,
    serviceType,
    serviceId,
    rating,
    comment,
    title,
    photos: reviewRecord.photos,
    anonymous: reviewRecord.anonymous,
    status: reviewRecord.status,
  };
}

async function updateReview(customerId, reviewId, reviewData, transaction) {
  const { rating, comment, title, photos, anonymous } = reviewData;

  const user = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
  if (!user || !user.customer_profile) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_customer'),
      400,
      reviewConstants.ERROR_CODES[0]
    );
  }

  const review = await Review.findByPk(reviewId, { transaction });
  if (!review) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.review_not_found'),
      404,
      reviewConstants.ERROR_CODES[11]
    );
  }
  if (review.customer_id !== customerId) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.unauthorized'),
      403,
      reviewConstants.ERROR_CODES[4]
    );
  }
  if (review.status !== 'pending') {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.review_not_editable'),
      400,
      reviewConstants.ERROR_CODES[4]
    );
  }

  if (rating && (rating < reviewConstants.REVIEW_SETTINGS.RATING_MIN_INT || rating > reviewConstants.REVIEW_SETTINGS.RATING_MAX_INT)) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_rating'),
      400,
      reviewConstants.ERROR_CODES[8]
    );
  }

  if (photos && (!Array.isArray(photos) || photos.some(url => typeof url !== 'string'))) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_photos'),
      400,
      reviewConstants.ERROR_CODES[4]
    );
  }

  await review.update({
    rating: rating || review.rating,
    comment: comment !== undefined ? comment : review.comment,
    title: title !== undefined ? title : review.title,
    photos: photos || review.photos,
    anonymous: anonymous !== undefined ? !!anonymous : review.anonymous,
    updated_at: new Date(),
  }, { transaction });

  logger.info('Review updated', { customerId, reviewId });
  return {
    reviewId: review.id,
    serviceType: review.service_type,
    serviceId: review.service_id,
    rating: review.rating,
    comment: review.comment,
    title: review.title,
    photos: review.photos,
    anonymous: review.anonymous,
    status: review.status,
  };
}

async function deleteReview(customerId, reviewId, transaction) {
  const user = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
  if (!user || !user.customer_profile) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_customer'),
      400,
      reviewConstants.ERROR_CODES[0]
    );
  }

  const review = await Review.findByPk(reviewId, { transaction });
  if (!review) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.review_not_found'),
      404,
      reviewConstants.ERROR_CODES[11]
    );
  }
  if (review.customer_id !== customerId) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.unauthorized'),
      403,
      reviewConstants.ERROR_CODES[4]
    );
  }

  await review.update({ deleted_at: new Date() }, { transaction });

  logger.info('Review deleted', { customerId, reviewId });
  return { reviewId, status: 'deleted' };
}

async function manageCommunityInteractions(reviewId, actionData, transaction) {
  const { customerId, action, comment } = actionData;

  const user = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
  if (!user || !user.customer_profile) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_customer'),
      400,
      reviewConstants.ERROR_CODES[0]
    );
  }

  const review = await Review.findByPk(reviewId, { transaction });
  if (!review) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.review_not_found'),
      404,
      reviewConstants.ERROR_CODES[11]
    );
  }
  if (review.status !== 'approved') {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.review_not_approved'),
      400,
      reviewConstants.ERROR_CODES[12]
    );
  }

  if (!reviewConstants.REVIEW_SETTINGS.ALLOWED_INTERACTION_TYPES.includes(action)) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_action'),
      400,
      reviewConstants.ERROR_CODES[13]
    );
  }
  if (action === 'comment' && !comment) {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.comment_required'),
      400,
      reviewConstants.ERROR_CODES[15]
    );
  }

  const existingInteraction = await ReviewInteraction.findOne({
    where: { review_id: reviewId, customer_id: customerId, action },
    transaction,
  });
  if (existingInteraction && action === 'upvote') {
    throw new AppError(
      formatMessage('customer', 'reviews', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.already_upvoted'),
      400,
      reviewConstants.ERROR_CODES[14]
    );
  }

  const interaction = await ReviewInteraction.create({
    review_id: reviewId,
    customer_id: customerId,
    action,
    comment: action === 'comment' ? comment : null,
    created_at: new Date(),
    updated_at: new Date(),
  }, { transaction });

  logger.info('Review interaction processed', { reviewId, customerId, action });
  return { interactionId: interaction.id, reviewId, action, comment: interaction.comment };
}

module.exports = { submitReview, updateReview, deleteReview, manageCommunityInteractions };