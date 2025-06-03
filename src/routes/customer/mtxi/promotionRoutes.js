'use strict';

const express = require('express');
const router = express.Router();
const promotionController = require('@controllers/customer/mtxi/promotionController');
const promotionValidation = require('@middleware/customer/mtxi/promotionValidation');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Promotions
 *   description: Customer promotion management for mtxi, munch, and mtables services
 */
router.use(authenticate, restrictTo('customer'));

/**
 * @swagger
 * /api/customer/mtxi/promotions:
 *   post:
 *     summary: Redeem a promotion
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - promotionId
 *               - serviceType
 *             properties:
 *               promotionId:
 *                 type: integer
 *               serviceType:
 *                 type: string
 *                 enum: [ride, order, booking, event_service, in_dining_order]
 *               groupCustomerIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Promotion redeemed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     promotionId:
 *                       type: integer
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', checkPermissions('redeem_promotion'), promotionValidation.validateRedeemPromotion, promotionController.redeemPromotion);

/**
 * @swagger
 * /api/customer/mtxi/promotions:
 *   get:
 *     summary: Retrieve available promotions
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: serviceType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ride, order, booking, event_service, in_dining_order]
 *     responses:
 *       200:
 *         description: Available promotions retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       type:
 *                         type: string
 *                       service_type:
 *                         type: string
 *                       reward_amount:
 *                         type: number
 *                       discount_percentage:
 *                         type: number
 *                       is_active:
 *                         type: boolean
 *                       expiry_date:
 *                         type: string
 *                       is_reusable:
 *                         type: boolean
 *                       customer_id:
 *                         type: integer
 *                         nullable: true
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.get('/', checkPermissions('view_promotion'), promotionValidation.validateGetAvailablePromotions, promotionController.getAvailablePromotions);

/**
 * @swagger
 * /api/customer/mtxi/promotions/cancel:
 *   post:
 *     summary: Cancel a promotion redemption
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - promotionId
 *             properties:
 *               promotionId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Promotion redemption cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     promotionId:
 *                       type: integer
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Promotion not found
 */
router.post('/cancel', checkPermissions('cancel_promotion'), promotionValidation.validateCancelPromotionRedemption, promotionController.cancelPromotionRedemption);

module.exports = router;