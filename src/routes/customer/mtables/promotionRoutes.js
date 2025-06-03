'use strict';

const express = require('express');
const router = express.Router();
const promotionController = require('@controllers/customer/mtables/promotionController');
const promotionMiddleware = require('@middleware/customer/mtables/promotionMiddleware');
const promotionValidator = require('@validators/customer/mtables/promotionValidator');

/**
 * @swagger
 * /api/customer/mtables/promotions/redeem:
 *   post:
 *     summary: Redeem a promotion
 *     description: Redeems a promotion for an order, sends notifications, logs audit, emits socket event, and awards points.
 *     tags:
 *       - Customer Promotions
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
 *               - orderId
 *             properties:
 *               promotionId:
 *                 type: integer
 *                 description: Promotion ID
 *                 example: 123
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *                 example: 456
 *               couponCode:
 *                 type: string
 *                 description: Coupon code (if applicable)
 *                 example: PROMO10
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
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Promotion redeemed
 *                 data:
 *                   type: object
 *                   properties:
 *                     redemptionId:
 *                       type: integer
 *                       example: 123
 *                     discountAmount:
 *                       type: number
 *                       example: 20.00
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request or redemption failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 * /api/customer/mtables/promotions:
 *   get:
 *     summary: Get available promotions
 *     description: Retrieves promotions eligible for a a customer.
 *     tags:
 *       - Customer Promotions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Promotions retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Promotions retrieved
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer, example: 123 }
 *                       type: { type: string, example: percentage }
 *                       value: { type: number, example: 20 }
 *       400:
 *         description: Failed to retrieve promotions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 * /api/customer/mtables/promotions/engagement:
 *   get:
 *     summary: Analyze promotion engagement
 *     description: Analyzes a customer's engagement promotion with promotions.
 *     tags:
 *       - Customer Promotions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Promotion engagement analyzed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Promotion engagement analyzed
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRedemptions: { type: integer, example: 5 }
 *                           totalDiscountAmount: { type: number, example: 50.00 }
 *                     promotionTypes: { type: array, items: string, example: ['percentage', 'flat'] }
 *                     lastRedemption: { type: string, format: date-time, example: 2025-06-01T00:00:00Z }
 *       400:
 *         description: Failed to analyze engagement
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 * components:
 *   securitySchemes: securitySchemes
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

router.post(
  '/promotions/redeem',
  promotionMiddleware.authenticate,
  promotionMiddleware.restrictTo('customer'),
  promotionMiddleware.checkPermissions('redeem_promotion'),
  promotionValidator.validateRedeemPromotion,
  promotionMiddleware.checkPromotionAccess,
  promotionController.redeemPromotion
);

router.get(
  '/promotions',
  promotionMiddleware.authenticate,
  promotionMiddleware.restrictTo('customer'),
  promotionMiddleware.checkPermissions('view_promotions'),
  promotionController.getAvailablePromotions
);

router.get(
  '/promotions/engagement',
  promotionMiddleware.authenticate,
  promotionMiddleware.restrictTo('customer'),
  promotionMiddleware.checkPermissions('view_promotions'),
  promotionController.analyzePromotionEngagement
);

module.exports = router;