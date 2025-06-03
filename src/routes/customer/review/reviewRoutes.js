'use strict';

const express = require('express');
const router = express.Router();
const { submitReviewAction, updateReviewAction, deleteReviewAction, manageInteraction } = require('@controllers/customer/review/reviewController');
const { submitReviewSchema, updateReviewSchema, manageInteractionSchema } = require('@validators/customer/review/reviewValidator');
const { submitReview: submitReviewMW, updateReview: updateReviewMW, deleteReview: deleteReviewMW, manageInteraction: manageInteractionMW } = require('@middleware/customer/review/reviewMiddleware');
const { validate } = require('@middleware/validate');

/**
 * @swagger
 * /api/customer/review:
 *   post:
 *     summary: Submit a review for a service
 *     tags: [Review]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceId:
 *                 type: number
 *               serviceType:
 *                 type: string
 *                 enum: [order, in_dining_order, booking, ride]
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *               title:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *               anonymous:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Review submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviewId:
 *                       type: string
 *                     serviceType:
 *                       type: string
 *                     serviceId:
 *                       type: number
 *                     rating:
 *                       type: number
 *                     comment:
 *                       type: string
 *                     title:
 *                       type: string
 *                     photos:
 *                       type: array
 *                       items:
 *                         type: string
 *                     anonymous:
 *                       type: boolean
 *                     status:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Service not found
 */
router.post('/', submitReviewMW, validate(submitReviewSchema), submitReviewAction);

/**
 * @swagger
 * /api/customer/review/{reviewId}:
 *   patch:
 *     summary: Update a review
 *     tags: [Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *               title:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *               anonymous:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Review updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviewId:
 *                       type: string
 *                     serviceType:
 *                       type: string
 *                     serviceId:
 *                       type: number
 *                     rating:
 *                       type: number
 *                     comment:
 *                       type: string
 *                     title:
 *                       type: string
 *                     photos:
 *                       type: array
 *                       items:
 *                         type: string
 *                     anonymous:
 *                       type: boolean
 *                     status:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Review not found
 */
router.patch('/:reviewId', updateReviewMW, validate(updateReviewSchema), updateReviewAction);

/**
 * @swagger
 * /api/customer/review/{reviewId}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Review deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviewId:
 *                       type: string
 *                     status:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review not found
 */
router.delete('/:reviewId', deleteReviewMW, deleteReviewAction);

/**
 * @swagger
 * /api/customer/review/{reviewId}/interaction:
 *   post:
 *     summary: Manage community interactions on a review
 *     tags: [Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [upvote, comment]
 *               comment:
 *                 type: string
 *                 description: Required if action is comment
 *     responses:
 *       200:
 *         description: Interaction processed
 *         content:
 *           application/json:
 *             schema Take *7*::
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     interactionId:
 *                       type: string
 *                     reviewId:
 *                       type: number
 *                     action:
 *                       type: string
 *                     comment:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Review not found
 */
router.post('/:reviewId/interaction', manageInteractionMW, validate(manageInteractionSchema), manageInteraction);

module.exports = router;