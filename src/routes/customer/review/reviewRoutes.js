'use strict';

/**
 * Review Routes
 * Defines routes for customer review operations with Swagger documentation.
 */

const express = require('express');
const router = express.Router();
const reviewController = require('@controllers/customer/reviewController');
const reviewValidator = require('@validators/customer/review/reviewValidator');
const reviewMiddleware = require('@middleware/customer/review/reviewMiddleware');

/**
 * @swagger
 * /api/v1/customer/reviews:
 *   post:
 *     summary: Submit a new review
 *     tags: [Customer Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceType, serviceId, targetType, targetId, rating]
 *             properties:
 *               serviceType: { type: string, enum: [mtables, munch, mtxi] }
 *               serviceId: { type: string }
 *               targetType: { type: string, enum: [merchant, staff, driver] }
 *               targetId: { type: string }
 *               rating: { type: number, minimum: 1, maximum: 5 }
 *               comment: { type: string, maxLength: 500 }
 *               title: { type: string, maxLength: 100 }
 *               photos: { type: array, items: { type: string, format: uri } }
 *               anonymous: { type: boolean }
 *     responses:
 *       201:
 *         description: Review submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data: { type: object }
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  reviewValidator.validateSubmitReview,
  reviewMiddleware.validateReviewSubmission,
  reviewController.submitReview
);

/**
 * @swagger
 * /api/v1/customer/reviews/{reviewId}:
 *   put:
 *     summary: Update an existing review
 *     tags: [Customer Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating: { type: number, minimum: 1, maximum: 5 }
 *               comment: { type: string, maxLength: 500 }
 *               title: { type: string, maxLength: 100 }
 *               photos: { type: array, items: { type: string, format: uri } }
 *               anonymous: { type: boolean }
 *     responses:
 *       200:
 *         description: Review updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data: { type: object }
 *       404:
 *         description: Review not found
 *       500:
 *         description: Server error
 */
router.put(
  '/:reviewId',
  reviewValidator.validateUpdateReview,
  reviewMiddleware.validateReviewOwnership,
  reviewController.updateReview
);

/**
 * @swagger
 * /api/v1/customer/reviews/{reviewId}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Customer Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data: { type: object }
 *       404:
 *         description: Review not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/:reviewId',
  reviewMiddleware.validateReviewOwnership,
  reviewController.deleteReview
);

/**
 * @swagger
 * /api/v1/customer/reviews/{reviewId}/interactions:
 *   post:
 *     summary: Manage community interactions (upvote, comment)
 *     tags: [Customer Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [UPVOTE, COMMENT] }
 *               comment: { type: string, maxLength: 500 }
 *     responses:
 *       201:
 *         description: Interaction recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data: { type: object }
 *       400:
 *         description: Invalid interaction type
 *       500:
 *         description: Server error
 */
router.post(
  '/:reviewId/interactions',
  reviewValidator.validateCommunityInteraction,
  reviewMiddleware.validateReviewOwnership,
  reviewController.manageCommunityInteraction
);

module.exports = router;