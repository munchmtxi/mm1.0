'use strict';

const express = require('express');
const router = express.Router();
const customerSegmentationController = require('@controllers/merchant/crm/customerSegmentationController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const customerSegmentationValidator = require('@validators/merchant/crm/customerSegmentationValidator');

router.use(authenticate);
router.use(restrictTo('merchant'));
router.use(checkPermissions('manage_crm'));

/**
 * @swagger
 * /merchant/crm/{merchantId}/segment:
 *   post:
 *     summary: Segment customers by behavior
 *     tags: [Customer Segmentation]
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
 *               criteria:
 *                 type: object
 *                 properties:
 *                   orderFrequency:
 *                     type: object
 *                   bookingFrequency:
 *                     type: object
 *                   spending:
 *                     type: object
 *     responses:
 *       200:
 *         description: Customers segmented successfully
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
 *                     segments:
 *                       type: object
 *                       properties:
 *                         highValue:
 *                           type: array
 *                           items:
 *                             type: object
 *                         frequent:
 *                           type: array
 *                           items:
 *                             type: object
 *                         occasional:
 *                           type: array
 *                           items:
 *                             type: object
 *                     segmentCounts:
 *                       type: object
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Merchant not found
 */
router.post('/:merchantId/segment', customerSegmentationValidator.validateSegmentCustomers, customerSegmentationController.segmentCustomers);

/**
 * @swagger
 * /merchant/crm/{merchantId}/customer/{customerId}/behavior:
 *   get:
 *     summary: Analyze customer behavior
 *     tags: [Customer Segmentation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer behavior analyzed successfully
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
 *                        type: string
 *                     customerId:
 *                       type: string
 *                     trends:
 *                       type: object
 *                       properties:
 *                         orderFrequency:
 *                           type: number
 *                         bookingFrequency:
 *                           type: number
 *                         totalSpending:
 *                           type: number
 *                         averageOrderValue:
 *                           type: number
 *                         preferredBookingType:
 *                           type: string
 *                         lastActivity:
 *                           type: string
 *                           format: date-time
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Merchant or customer not found
 */
router.get('/:merchantId/customer/:customerId/behavior', customerSegmentationValidator.validateAnalyzeBehavior, customerSegmentationController.analyzeBehavior);

/**
 * @swagger
 * /merchant/crm/{merchantId}/target:
 *   post:
 *     summary: Create targeted offers for a segment
 *     tags: [Customer Segmentation]
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
 *               segmentId:
 *                     type: string
 *                     enum: [highValue, frequent, occasional]
 *     responses:
 *       200:
 *         description: Offers targeted successfully
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
 *                     segmentId:
 *                       type: string
 *                     promotionId:
 *                       type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Merchant not found
 */
router.post('/:merchantId/target', customerSegmentationValidator.validateTargetOffers, customerSegmentationController.targetOffers);

module.exports = router;