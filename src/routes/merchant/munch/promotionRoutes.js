'use strict';

const express = require('express');
const router = express.Router();
const {
  createPromotionAuth,
  manageLoyaltyProgramAuth,
  redeemPointsAuth,
} = require('@middleware/merchant/munch/promotionMiddleware');
const {
  validateCreatePromotion,
  validateManageLoyaltyProgram,
  validateRedeemPoints,
} = require('@validators/merchant/munch/promotionValidator');
const {
  createPromotionController,
  manageLoyaltyProgramController,
  redeemPointsController,
} = require('@controllers/merchant/munch/promotionController');

/**
 * @swagger
 * /merchant/munch/promotion/create:
 *   post:
 *     summary: Create a promotion
 *     description: Designs discounts or referral promotions for a restaurant.
 *     tags: [Promotion]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - details
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: Merchant branch ID
 *                 example: 101
 *               details:
 *                 type: object
 *                 required:
 *                   - name
 *                   - type
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: Summer Sale
 *                   type:
 *                     type: string
 *                     enum: [percentage, fixed_amount, buy_x_get_y, bundle, loyalty, flash_sale]
 *                     example: percentage
 *                   description:
 *                     type: string
 *                     example: 20% off all items
 *                   value:
 *                     type: number
 *                     example: 20
 *                   code:
 *                     type: string
 *                     example: SUMMER20
 *                   start_date:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-06-01T00:00:00Z
 *                   end_date:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-06-30T23:59:59Z
 *                   min_purchase_amount:
 *                     type: number
 *                     example: 50
 *                   usage_limit:
 *                     type: integer
 *                     example: 100
 *                   customer_eligibility:
 *                     type: string
 *                     enum: [all, new, loyalty]
 *                     example: all
 *                   menuItems:
 *                     type: array
 *                     items:
 *                       type: integer
 *                       example: 1
 *                   rules:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         rule_type:
 *                           type: string
 *                           example: min_quantity
 *                         conditions:
 *                           type: object
 *                           example: { quantity: 2 }
 *                         priority:
 *                           type: integer
 *                           example: 1
 *     responses:
 *       200:
 *         description: Promotion created
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
 *                   example: Promotion Summer Sale created for restaurant 101.
 *                 data:
 *                   type: object
 *                   properties:
 *                     promotionId:
 *                       type: integer
 *                       example: 123
 *                     name:
 *                       type: string
 *                       example: Summer Sale
 *                     type:
 *                       type: string
 *                       example: percentage
 *       400:
 *         description: Invalid input, type, or menu items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/create', createPromotionAuth, validateCreatePromotion, createPromotionController);

/**
 * @swagger
 * /merchant/munch/promotion/loyalty:
 *   post:
 *     summary: Manage loyalty program
 *     description: Administers loyalty program tiers for a restaurant.
 *     tags: [Promotion]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - tiers
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: Merchant branch ID
 *                 example: 101
 *               tiers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - pointsRequired
 *                     - rewards
 *                     - rewardId
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: Gold
 *                     pointsRequired:
 *                       type: integer
 *                       example: 1000
 *                     rewards:
 *                       type: object
 *                       example: { discount: 10 }
 *                     rewardId:
 *                       type: integer
 *                       example: 1
 *     responses:
 *       200:
 *         description: Loyalty program updated
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
 *                   example: Loyalty program updated for restaurant 101.
 *                 data:
 *                   type: object
 *                   properties:
 *                     promotionId:
 *                       type: integer
 *                       example: 123
 *                     name:
 *                       type: string
 *                       example: Loyalty Program for Branch
 *                     tiers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: Gold
 *                           pointsRequired:
 *                             type: integer
 *                             example: 1000
 *                           rewards:
 *                             type: object
 *                             example: { discount: 10 }
 *                           rewardId:
 *                             type: integer
 *                             example: 1
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/loyalty', manageLoyaltyProgramAuth, validateManageLoyaltyProgram, manageLoyaltyProgramController);

/**
 * @swagger
 * /merchant/munch/promotion/redeem:
 *   post:
 *     summary: Redeem points for rewards
 *     description: Processes customer loyalty point redemptions, awards participation points, and notifies the customer.
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - rewardId
 *             properties:
 *               customerId:
 *                 type: integer
 *                 description: Customer ID
 *                 example: 456
 *               rewardId:
 *                 type: integer
 *                 description: Reward ID (Promotion ID)
 *                 example: 123
 *     responses:
 *       200:
 *         description: Points redeemed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   example: Reward Loyalty Reward redeemed for $10 by customer 456.
 *                 data:
 *                   type: object
 *                   properties:
 *                     redemptionId:
 *                       type: integer
 *                       example: 789
 *                     discountAmount: 
 *                       type: number
 *                       example: 10.0
 *                     rewardId:
 *                       type: integer
 *                       example: 123
 *       400:
 *         description: Invalid ID, reward, or insufficient points
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Customer or reward not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/transactions/redeem', redeemPointsAuth, validateRedeemPoints, redeemPointsController);

module.exports = router;