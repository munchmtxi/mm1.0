'use strict';

const express = require('express');
const router = express.Router();
const feedbackController = require('@controllers/merchant/crm/feedbackController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const feedbackValidator = require('@validators/merchant/crm/feedbackValidator');
const { restrictCRMAccess } = require('@middleware/merchant/crm/customerSegmentationMiddleware');

router.use(authenticate);
router.use(restrictCRMAccess);

/**
 * @swagger
 * /merchant/crm/{merchantId}/reviews:
 *   post:
 *     summary: Collect customer reviews
 *     tags: [Feedback]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reviewData:
 *                 type: object
 *                 properties:
 *                   customerId:
 *                     type: string
 *                   rating:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 5
 *                   serviceType:
 *                     type: string
 *                     enum: [order, in_dining_order, booking, ride]
 *                   serviceId:
 *                     type: string
 *                   comment:
 *                     type: string
 *     responses:
 *       200:
 *         description: Review collected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchantId:
 *                       type: string
 *                     reviewId:
 *                       type: string
 *                     customerId:
 *                       type: string
 *                     rating:
 *                       type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Merchant or customer not found
 */
router.post('/:merchantId/reviews', feedbackValidator.validateCollectReviews, feedbackController.collectReviews);

/**
 * @swagger
 * /merchant/crm/reviews/{reviewId}/interactions:
 *   post:
 *     summary: Manage community interactions on a review
 *     tags: [Feedback]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: object
 *                 properties:
 *                   customerId:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [upvote, comment]
 *                   comment:
 *                     type: string
 *     responses:
 *       200:
 *         description: Interaction managed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviewId:
 *                       type: string
 *                     interactionId:
 *                       type: string
 *                     customerId:
 *                       type: string
 *                     actionType:
 *                       type: string
 *                     merchantId:
 *                       type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Review or customer not found
 */
router.post('/reviews/:reviewId/interactions', feedbackValidator.validateManageCommunityInteractions, feedbackController.manageCommunityInteractions);

/**
 * @swagger
 * /merchant/crm/reviews/{reviewId}/respond:
 *   post:
 *     summary: Respond to customer feedback
 *     tags: [Feedback]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response:
 *                 type: object
 *                 properties:
 *                   merchantId:
 *                     type: string
 *                   content:
 *                     type: string
 *     responses:
 *       200:
 *         description: Feedback response added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviewId:
 *                       type: string
 *                     merchantId:
 *                       type: string
 *                     customerId:
 *                       type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Review or merchant not found
 */
router.post('/reviews/:reviewId/respond', restrictTo('merchant'), checkPermissions('manage_crm'), feedbackValidator.validateRespondToFeedback, feedbackController.respondToFeedback);

module.exports = router;