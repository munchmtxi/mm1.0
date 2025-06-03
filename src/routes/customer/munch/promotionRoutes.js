'use strict';

const express = require('express');
const router = express.Router();
const promotionController = require('@controllers/customer/munch/promotionController');
const promotionValidator = require('@validators/customer/munch/promotionValidator');
const promotionMiddleware = require('@middleware/customer/munch/promotionMiddleware');
const { validate } = require('@middleware/validate');

/**
 * @swagger
 * /api/customer/munch/promotion/redeem:
 *   post:
 *     summary: Redeem a promotion
 *     tags: [Munch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               promotionId:
 *                 type: integer
 *               orderId:
 *                 type: integer
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     promotionId:
 *                       type: integer
 *                     discountAmount:
 *                       type: number
 *                     status:
 *                       type: string
 *                     redemptionId:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Customer, promotion, or order not found
 */
/**
 * @swagger
 * /api/customer/munch/promotion/available:
 *   get:
 *     summary: Get available promotions
 *     tags: [Munch]
 *     security:
 *       - bearerAuth: []
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: string
 *                     promotions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           type:
 *                             type: string
 *                           reward_amount:
 *                             type: number
 *                           discount_percentage:
 *                             type: number
 *                           expiry_date:
 *                             type: string
 *                           is_reusable:
 *                             type: boolean
 *                           value:
 *                             type: number
 *                           code:
 *                             type: string
 *                           name:
 *                             type: string
 *                           items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                 name:
 *                                   type: string
 *                           merchant:
 *                             type: string
 *                           start_date:
 *                             type: string
 *                           end_date:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer not found
 */

router.post('/redeem', promotionMiddleware.redeemPromotion, validate(promotionValidator.redeemPromotionSchema), promotionController.redeemPromotion);
router.get('/available', promotionMiddleware.getAvailablePromotions, validate(promotionValidator.getAvailablePromotionsSchema), promotionController.getAvailablePromotions);

module.exports = router;