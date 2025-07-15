'use strict';

const { Review, ReviewInteraction, Customer, Merchant, MerchantBranch } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtxiConstants = require('@constants/common/mtxiConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

async function collectReviews(merchantId, reviewData, ipAddress, transaction = null) {
  try {
    // Validate input data
    if (!merchantId || !reviewData?.customerId || !reviewData?.rating || !reviewData?.serviceType || !reviewData?.serviceId) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_INPUT, 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Validate merchant and branch
    const merchant = await Merchant.findByPk(merchantId, { 
      attributes: ['id', 'user_id', 'preferred_language', 'business_type'], 
      transaction 
    });
    if (!merchant) {
      throw new AppError(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND, 404, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    const branch = await MerchantBranch.findOne({ 
      where: { merchant_id: merchantId, is_active: true }, 
      attributes: ['id', 'preferred_language', 'currency'], 
      transaction 
    });
    if (!branch) {
      throw new AppError(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND, 404, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    // Validate customer
    const customer = await Customer.findByPk(reviewData.customerId, { 
      attributes: ['id', 'user_id', 'preferred_language', 'country'], 
      transaction 
    });
    if (!customer) {
      throw new AppError(customerConstants.ERROR_TYPES.CUSTOMER_NOT_FOUND, 404, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Validate service type against all supported services
    const validServiceTypes = [
      ...mtablesConstants.BOOKING_TYPES,
      ...munchConstants.ORDER_CONSTANTS.ORDER_TYPES,
      ...Object.keys(mtxiConstants.RIDE_TYPES),
      ...mparkConstants.BOOKING_CONFIG.BOOKING_TYPES,
      ...customerConstants.MEVENTS_CONSTANTS.EVENT_TYPES,
    ].flat();
    if (!validServiceTypes.includes(reviewData.serviceType)) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_INPUT, 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Validate rating
    if (reviewData.rating < mtablesConstants.FEEDBACK_SETTINGS.MIN_RATING || 
        reviewData.rating > mtablesConstants.FEEDBACK_SETTINGS.MAX_RATING) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_FEEDBACK_RATING, 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Validate comment length if provided
    if (reviewData.comment && reviewData.comment.length > Review.getAttributes().comment.validate.len[1]) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_INPUT, 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Create review
    const review = await Review.create({
      customer_id: reviewData.customerId,
      merchant_id: merchantId,
      service_type: reviewData.serviceType,
      service_id: reviewData.serviceId,
      rating: reviewData.rating,
      comment: reviewData.comment,
      status: mtablesConstants.BOOKING_STATUSES[0], // 'PENDING'
      target_type: reviewData.targetType || 'merchant',
      target_id: reviewData.targetId || merchantId,
      anonymous: reviewData.anonymous || false,
      photos: reviewData.photos || [],
    }, { transaction });

    logger.info(`Review collected for merchant ${merchantId}, branch ${branch.id}: Review ID ${review.id}`);
    return {
      merchantId,
      branchId: branch.id,
      reviewId: review.id,
      customerId: reviewData.customerId,
      rating: reviewData.rating,
      language: customer.preferred_language || branch.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      currency: branch.currency || localizationConstants.COUNTRY_CURRENCY_MAP[customer.country] || localizationConstants.DEFAULT_CURRENCY,
      action: customerConstants.SUCCESS_MESSAGES.find(msg => msg === 'feedback_submitted'),
    };
  } catch (error) {
    throw handleServiceError('collectReviews', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function manageCommunityInteractions(reviewId, action, ipAddress, transaction = null) {
  try {
    // Validate input data
    if (!reviewId || !action?.customerId || !action?.type) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_INPUT, 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Validate review
    const review = await Review.findByPk(reviewId, { 
      attributes: ['id', 'merchant_id', 'customer_id'], 
      transaction 
    });
    if (!review) {
      throw new AppError(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND, 404, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Validate merchant and branch
    const merchant = await Merchant.findByPk(review.merchant_id, { 
      attributes: ['id', 'preferred_language'], 
      transaction 
    });
    if (!merchant) {
      throw new AppError(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND, 404, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    const branch = await MerchantBranch.findOne({ 
      where: { merchant_id: review.merchant_id, is_active: true }, 
      attributes: ['id', 'preferred_language', 'currency'], 
      transaction 
    });
    if (!branch) {
      throw new AppError(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND, 404, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    // Validate customer
    const customer = await Customer.findByPk(action.customerId, { 
      attributes: ['id', 'user_id', 'preferred_language', 'country'], 
      transaction 
    });
    if (!customer) {
      throw new AppError(customerConstants.ERROR_TYPES.CUSTOMER_NOT_FOUND, 404, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Validate interaction type
    const validTypes = ReviewInteraction.getAttributes().action.values; // ['upvote', 'comment']
    if (!validTypes.includes(action.type)) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_INPUT, 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Validate comment length for comment action
    if (action.type === 'comment' && action.comment?.length > ReviewInteraction.getAttributes().comment.validate?.len?.[1]) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_INPUT, 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Create interaction
    const interaction = await ReviewInteraction.create({
      review_id: reviewId,
      customer_id: action.customerId,
      action: action.type,
      comment: action.type === 'comment' ? action.comment : null,
    }, { transaction });

    logger.info(`Community interaction managed for review ${reviewId}, branch ${branch.id}: ${action.type}`);
    return {
      reviewId,
      interactionId: interaction.id,
      customerId: action.customerId,
      actionType: action.type,
      merchantId: review.merchant_id,
      branchId: branch.id,
      language: customer.preferred_language || branch.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      currency: branch.currency || localizationConstants.COUNTRY_CURRENCY_MAP[customer.country] || localizationConstants.DEFAULT_CURRENCY,
      action: mtablesConstants.SUCCESS_MESSAGES.find(msg => msg === 'SOCIAL_POST_SHARED'),
    };
  } catch (error) {
    throw handleServiceError('manageCommunityInteractions', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function respondToFeedback(reviewId, response, ipAddress, transaction = null) {
  try {
    // Validate input data
    if (!reviewId || !response?.merchantId || !response?.content) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_INPUT, 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Validate review
    const review = await Review.findByPk(reviewId, { 
      attributes: ['id', 'customer_id', 'comment', 'merchant_id'], 
      transaction 
    });
    if (!review) {
      throw new AppError(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND, 404, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Validate merchant and branch
    const merchant = await Merchant.findByPk(response.merchantId, { 
      attributes: ['id', 'user_id', 'preferred_language'], 
      transaction 
    });
    if (!merchant) {
      throw new AppError(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND, 404, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    const branch = await MerchantBranch.findOne({ 
      where: { merchant_id: response.merchantId, is_active: true }, 
      attributes: ['id', 'preferred_language', 'currency'], 
      transaction 
    });
    if (!branch) {
      throw new AppError(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND, 404, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    // Validate response comment length
    if (response.content.length > Review.getAttributes().comment.validate.len[1]) {
      throw new AppError(mtablesConstants.ERROR_TYPES.INVALID_INPUT, 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Update review with merchant response
    await review.update({
      comment: review.comment ? `${review.comment}\nMerchant Response: ${response.content}` : `Merchant Response: ${response.content}`,
      status: mtablesConstants.BOOKING_STATUSES[1], // 'APPROVED'
    }, { transaction });

    // Fetch customer for language preference
    const customer = await Customer.findByPk(review.customer_id, { 
      attributes: ['preferred_language', 'country'], 
      transaction 
    });

    logger.info(`Feedback response added for review ${reviewId} by merchant ${response.merchantId}, branch ${branch.id}`);
    return {
      reviewId,
      merchantId: response.merchantId,
      branchId: branch.id,
      customerId: review.customer_id,
      language: customer?.preferred_language || branch.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      currency: branch.currency || localizationConstants.COUNTRY_CURRENCY_MAP[customer?.country] || localizationConstants.DEFAULT_CURRENCY,
      action: mtablesConstants.SUCCESS_MESSAGES.find(msg => msg === 'FEEDBACK_SUBMITTED'),
    };
  } catch (error) {
    throw handleServiceError('respondToFeedback', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

module.exports = {
  collectReviews,
  manageCommunityInteractions,
  respondToFeedback,
};