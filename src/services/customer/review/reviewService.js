'use strict';

const { sequelize, User, Customer, Order, InDiningOrder, Booking, Ride, ParkingBooking, Event, Merchant, Staff, Driver, Review, ReviewInteraction } = require('@models');
const reviewConstants = require('@constants/common/reviewConstants');
const customerConstants = require('@constants/customer/customerConstants');
const driverConstants = require('@constants/driver/driverConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const staffConstants = require('@constants/staff/staffConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtxiConstants = require('@constants/common/mtxiConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const meventsConstants = require('@constants/common/meventsConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function submitReview(customerId, review, transaction) {
  const { serviceType, serviceId, targetType, targetId, rating, comment, title, photos, anonymous } = review;

  // Validate customer
  const user = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
  if (!user || !user.customer_profile || !customerConstants.CUSTOMER_STATUSES.includes(user.customer_profile.status)) {
    throw new AppError('Invalid customer', 400, reviewConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  // Validate target type
  if (!['merchant', 'staff', 'driver'].includes(targetType)) {
    throw new AppError('Invalid target type', 400, reviewConstants.ERROR_CODES[6]); // INVALID_SERVICE_TYPE (reused)
  }

  // Validate target ID based on target type
  let target;
  switch (targetType) {
    case 'merchant':
      target = await Merchant.findByPk(targetId, { transaction });
      if (!target || !merchantConstants.MERCHANT_CONFIG.SUPPORTED_MERCHANT_TYPES.includes(target.type)) {
        throw new AppError('Merchant not found', 404, reviewConstants.ERROR_CODES[6]); // INVALID_SERVICE_TYPE (reused)
      }
      break;
    case 'staff':
      target = await Staff.findByPk(targetId, { transaction });
      if (!target || !staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(target.type)) {
        throw new AppError('Staff not found', 404, reviewConstants.ERROR_CODES[6]); // INVALID_SERVICE_TYPE (reused)
      }
      break;
    case 'driver':
      target = await Driver.findByPk(targetId, { transaction });
      if (!target || !driverConstants.DRIVER_STATUSES.includes(target.status)) {
        throw new AppError('Driver not found', 404, reviewConstants.ERROR_CODES[6]); // INVALID_SERVICE_TYPE (reused)
      }
      break;
  }

  // Validate service and extract associated IDs
  let service, merchantId, staffId, driverId;
  switch (serviceType) {
    case 'order':
      service = await Order.findByPk(serviceId, { transaction });
      if (!service) {
        throw new AppError('Order not found', 404, reviewConstants.ERROR_CODES[1]); // ORDER_NOT_FOUND
      }
      if (!munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes(service.status) || service.status !== 'delivered') {
        throw new AppError('Invalid order status', 400, reviewConstants.ERROR_CODES[7]); // INVALID_ORDER_STATUS
      }
      merchantId = service.merchant_id;
      staffId = service.staff_id;
      driverId = service.driver_id;
      break;
    case 'in_dining_order':
      service = await InDiningOrder.findByPk(serviceId, { transaction });
      if (!service) {
        throw new AppError('In-dining order not found', 404, reviewConstants.ERROR_CODES[1]); // ORDER_NOT_FOUND
      }
      if (!mtablesConstants.IN_DINING_STATUSES.includes(service.status) || service.status !== 'CLOSED') {
        throw new AppError('Invalid in-dining order status', 400, reviewConstants.ERROR_CODES[7]); // INVALID_ORDER_STATUS
      }
      merchantId = service.branch_id ? (await service.getBranch({ transaction }))?.merchant_id : null;
      staffId = service.staff_id;
      break;
    case 'booking':
      service = await Booking.findByPk(serviceId, { transaction });
      if (!service) {
        throw new AppError('Booking not found', 404, reviewConstants.ERROR_CODES[2]); // BOOKING_NOT_FOUND
      }
      if (!mtablesConstants.BOOKING_STATUSES.includes(service.status) || !['CHECKED_IN', 'COMPLETED'].includes(service.status)) {
        throw new AppError('Invalid booking status', 400, reviewConstants.ERROR_CODES[8]); // INVALID_BOOKING_STATUS
      }
      merchantId = service.merchant_id;
      staffId = service.staff_id;
      break;
    case 'ride':
      service = await Ride.findByPk(serviceId, { transaction });
      if (!service) {
        throw new AppError('Ride not found', 404, reviewConstants.ERROR_CODES[3]); // RIDE_NOT_FOUND
      }
      if (!mtxiConstants.RIDE_STATUSES.includes(service.status) || service.status !== 'COMPLETED') {
        throw new AppError('Invalid ride status', 400, reviewConstants.ERROR_CODES[9]); // INVALID_RIDE_STATUS
      }
      driverId = service.driverId;
      break;
    case 'parking_booking':
      service = await ParkingBooking.findByPk(serviceId, { transaction });
      if (!service) {
        throw new AppError('Parking booking not found', 404, reviewConstants.ERROR_CODES[5]); // PARKING_NOT_FOUND
      }
      if (!mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES.includes(service.status) || service.status !== 'COMPLETED') {
        throw new AppError('Invalid parking booking status', 400, reviewConstants.ERROR_CODES[11]); // INVALID_PARKING_STATUS
      }
      merchantId = service.merchant_id;
      break;
    case 'event':
      service = await Event.findByPk(serviceId, { transaction });
      if (!service) {
        throw new AppError('Event not found', 404, reviewConstants.ERROR_CODES[4]); // EVENT_NOT_FOUND
      }
      if (!meventsConstants.EVENT_STATUSES.includes(service.status) || service.status !== 'COMPLETED') {
        throw new AppError('Invalid event status', 400, reviewConstants.ERROR_CODES[10]); // INVALID_EVENT_STATUS
      }
      merchantId = service.merchant_id; // Assumes Event model has merchant_id
      break;
    default:
      throw new AppError('Invalid service type', 400, reviewConstants.ERROR_CODES[6]); // INVALID_SERVICE_TYPE
  }

  // Validate target ID matches service's associated IDs
  if (targetType === 'merchant' && merchantId && targetId !== merchantId) {
    throw new AppError('Invalid merchant for service', 400, reviewConstants.ERROR_CODES[6]); // INVALID_SERVICE_TYPE (reused)
  }
  if (targetType === 'staff' && staffId && targetId !== staffId) {
    throw new AppError('Invalid staff for service', 400, reviewConstants.ERROR_CODES[6]); // INVALID_SERVICE_TYPE (reused)
  }
  if (targetType === 'driver' && driverId && targetId !== driverId) {
    throw new AppError('Invalid driver for service', 400, reviewConstants.ERROR_CODES[6]); // INVALID_SERVICE_TYPE (reused)
  }

  // Validate rating
  if (rating < reviewConstants.REVIEW_SETTINGS.RATING_MIN_INT || rating > reviewConstants.REVIEW_SETTINGS.RATING_MAX_INT) {
    throw new AppError('Invalid rating', 400, reviewConstants.ERROR_CODES[12]); // INVALID_RATING
  }

  // Validate comment and title length
  if (comment && comment.length > reviewConstants.REVIEW_SETTINGS.MAX_COMMENT_LENGTH) {
    throw new AppError('Comment exceeds maximum length', 400, reviewConstants.ERROR_CODES[6]); // INVALID_SERVICE_TYPE (reused)
  }
  if (title && title.length > reviewConstants.REVIEW_SETTINGS.MAX_TITLE_LENGTH) {
    throw new AppError('Title exceeds maximum length', 400, reviewConstants.ERROR_CODES[6]); // INVALID_SERVICE_TYPE (reused)
  }

  // Validate photos
  if (photos && (!Array.isArray(photos) || photos.length > reviewConstants.REVIEW_SETTINGS.MAX_PHOTOS || photos.some(url => typeof url !== 'string'))) {
    throw new AppError('Invalid photos', 400, reviewConstants.ERROR_CODES[18]); // INVALID_PHOTOS
  }

  // Check for existing review
  const existingReview = await Review.findOne({
    where: { customer_id: customerId, service_type: serviceType, service_id: serviceId, target_type: targetType, target_id: targetId },
    transaction,
  });
  if (existingReview) {
    throw new AppError('Review already submitted', 400, reviewConstants.ERROR_CODES[13]); // REVIEW_ALREADY_SUBMITTED
  }

  // Create review
  const reviewRecord = await Review.create({
    customer_id: customerId,
    merchant_id: targetType === 'merchant' ? targetId : merchantId,
    staff_id: targetType === 'staff' ? targetId : staffId,
    driver_id: targetType === 'driver' ? targetId : driverId,
    service_type: serviceType,
    service_id: serviceId,
    target_type: targetType,
    target_id: targetId,
    rating,
    comment,
    title,
    photos: photos || [],
    anonymous: !!anonymous,
    status: reviewConstants.REVIEW_SETTINGS.DEFAULT_STATUS_TYPE,
    created_at: new Date(),
    updated_at: new Date(),
  }, { transaction });

  logger.info('Review submitted', { customerId, serviceId, serviceType, targetType, targetId });
  return {
    reviewId: reviewRecord.id,
    serviceType,
    serviceId,
    targetType,
    targetId,
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

  // Validate customer
  const user = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
  if (!user || !user.customer_profile || !customerConstants.CUSTOMER_STATUSES.includes(user.customer_profile.status)) {
    throw new AppError('Invalid customer', 400, reviewConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  // Validate review
  const review = await Review.findByPk(reviewId, { transaction });
  if (!review) {
    throw new AppError('Review not found', 404, reviewConstants.ERROR_CODES[15]); // REVIEW_NOT_FOUND
  }
  if (review.customer_id !== customerId) {
    throw new AppError('Unauthorized', 403, reviewConstants.ERROR_CODES[16]); // UNAUTHORIZED
  }
  if (review.status !== 'PENDING') {
    throw new AppError('Review not editable', 400, reviewConstants.ERROR_CODES[17]); // REVIEW_NOT_EDITABLE
  }

  // Validate rating
  if (rating && (rating < reviewConstants.REVIEW_SETTINGS.RATING_MIN_INT || rating > reviewConstants.REVIEW_SETTINGS.RATING_MAX_INT)) {
    throw new AppError('Invalid rating', 400, reviewConstants.ERROR_CODES[12]); // INVALID_RATING
  }

  // Validate comment and title length
  if (comment && comment.length > reviewConstants.REVIEW_SETTINGS.MAX_COMMENT_LENGTH) {
    throw new AppError('Comment exceeds maximum length', 400, reviewConstants.ERROR_CODES[6]); // INVALID_SERVICE_TYPE (reused)
  }
  if (title && title.length > reviewConstants.REVIEW_SETTINGS.MAX_TITLE_LENGTH) {
    throw new AppError('Title exceeds maximum length', 400, reviewConstants.ERROR_CODES[6]); // INVALID_SERVICE_TYPE (reused)
  }

  // Validate photos
  if (photos && (!Array.isArray(photos) || photos.length > reviewConstants.REVIEW_SETTINGS.MAX_PHOTOS || photos.some(url => typeof url !== 'string'))) {
    throw new AppError('Invalid photos', 400, reviewConstants.ERROR_CODES[18]); // INVALID_PHOTOS
  }

  // Update review
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
    targetType: review.target_type,
    targetId: review.target_id,
    rating,
    comment: review.comment,
    title: review.title,
    photos: review.photos,
    anonymous: review.anonymous,
    status: review.status,
  };
}

async function deleteReview(customerId, reviewId, transaction) {
  // Validate customer
  const user = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
  if (!user || !user.customer_profile || !customerConstants.CUSTOMER_STATUSES.includes(user.customer_profile.status)) {
    throw new AppError('Invalid customer', 400, reviewConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  // Validate review
  const review = await Review.findByPk(reviewId, { transaction });
  if (!review) {
    throw new AppError('Review not found', 404, reviewConstants.ERROR_CODES[15]); // REVIEW_NOT_FOUND
  }
  if (review.customer_id !== customerId) {
    throw new AppError('Unauthorized', 403, reviewConstants.ERROR_CODES[16]); // UNAUTHORIZED
  }

  // Soft delete review
  await review.update({ deleted_at: new Date() }, { transaction });

  logger.info('Review deleted', { customerId, reviewId });
  return { reviewId, status: 'deleted' };
}

async function manageCommunityInteractions(reviewId, actionData, transaction) {
  const { customerId, action, comment } = actionData;

  // Validate customer
  const user = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
  if (!user || !user.customer_profile || !customerConstants.CUSTOMER_STATUSES.includes(user.customer_profile.status)) {
    throw new AppError('Invalid customer', 400, reviewConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  // Validate review
  const review = await Review.findByPk(reviewId, { transaction });
  if (!review) {
    throw new AppError('Review not found', 404, reviewConstants.ERROR_CODES[15]); // REVIEW_NOT_FOUND
  }
  if (review.status !== 'APPROVED') {
    throw new AppError('Review not approved', 400, reviewConstants.ERROR_CODES[16]); // REVIEW_NOT_APPROVED
  }

  // Validate action
  if (!reviewConstants.REVIEW_SETTINGS.ALLOWED_INTERACTION_TYPES.includes(action)) {
    throw new AppError('Invalid action', 400, reviewConstants.ERROR_CODES[13]); // INVALID_ACTION
  }
  if (action === 'COMMENT' && !comment) {
    throw new AppError('Comment required', 400, reviewConstants.ERROR_CODES[14]); // COMMENT_REQUIRED
  }
  if (action === 'COMMENT' && comment.length > reviewConstants.REVIEW_SETTINGS.MAX_COMMENT_LENGTH) {
    throw new AppError('Comment exceeds maximum length', 400, reviewConstants.ERROR_CODES[6]); // INVALID_SERVICE_TYPE (reused)
  }

  // Check for existing interaction
  const existingInteraction = await ReviewInteraction.findOne({
    where: { review_id: reviewId, customer_id: customerId, action },
    transaction,
  });
  if (existingInteraction && action === 'UPVOTE') {
    throw new AppError('Already upvoted', 400, reviewConstants.ERROR_CODES[14]); // ALREADY_UPVOTED
  }

  // Create interaction
  const interaction = await ReviewInteraction.create({
    review_id: reviewId,
    customer_id: customerId,
    action,
    comment: action === 'COMMENT' ? comment : null,
    created_at: new Date(),
    updated_at: new Date(),
  }, { transaction });

  logger.info('Review interaction processed', { reviewId, customerId, action });
  return { interactionId: interaction.id, reviewId, action, comment: interaction.comment };
}

module.exports = { submitReview, updateReview, deleteReview, manageCommunityInteractions };