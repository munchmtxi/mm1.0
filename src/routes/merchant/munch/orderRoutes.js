'use strict';

const express = require('express');
const router = express.Router();
const {
  processOrderAuth,
  applyDietaryPreferencesAuth,
  updateOrderStatusAuth,
  payOrderWithWalletAuth,
} = require('@middleware/merchant/munch/orderMiddleware');
const {
  validateProcessOrder,
  validateApplyDietaryPreferences,
  validateUpdateOrderStatus,
  validatePayOrderWithWallet,
} = require('@validators/merchant/munch/orderValidator');
const {
  processOrderController,
  applyDietaryPreferencesController,
  updateOrderStatusController,
  payOrderWithWalletController,
} = require('@controllers/merchant/munch/orderController');

/**
 * @swagger
 * /merchant/munch/order/process:
 *   post:
 *     summary: Process an order
 *     description: Handles dine-in, takeaway, or delivery orders, updates inventory, and confirms order.
 *     tags: [Order]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - items
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *                 example: 123
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - menu_item_id
 *                     - quantity
 *                   properties:
 *                     menu_item_id:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *                     customization:
 *                       type: string
 *                       nullable: true
 *                       example: No onions
 *     responses:
 *       200:
 *         description: Order processed
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
 *                   example: Order ORD-123 confirmed for $25.50.
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: confirmed
 *                     totalAmount:
 *                       type: number
 *                       example: 25.50
 *       400:
 *         description: Invalid input, order processed, or item unavailable
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
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/process', processOrderAuth, validateProcessOrder, processOrderController);

/**
 * @swagger
 * /merchant/munch/order/dietary:
 *   post:
 *     summary: Apply dietary preferences
 *     description: Filters order items based on customer dietary preferences.
 *     tags: [Order]
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
 *               - items
 *             properties:
 *               customerId:
 *                 type: integer
 *                 description: Customer ID
 *                 example: 456
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - menu_item_id
 *                   properties:
 *                     menu_item_id:
 *                       type: integer
 *                       example: 1
 *     responses:
 *       200:
 *         description: Dietary preferences applied
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
 *                   example: Dietary preferences applied successfully.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       menu_item_id:
 *                         type: integer
 *                         example: 1
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
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/dietary', applyDietaryPreferencesAuth, validateApplyDietaryPreferences, applyDietaryPreferencesController);

/**
 * @swagger
 * /merchant/munch/order/update:
 *   post:
 *     summary: Update order status
 *     description: Updates order progress, notifies customer, and awards points for completed orders.
 *     tags: [Order]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - status
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *                 example: 123
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, preparing, ready, out_for_delivery, completed, cancelled]
 *                 description: New order status
 *                 example: confirmed
 *     responses:
 *       200:
 *         description: Order status updated
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
 *                   example: Order ORD-123 is confirmed.
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: confirmed
 *       400:
 *         description: Invalid input or status
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
 *             $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/update', updateOrderStatusAuth, validateUpdateOrderStatus, updateOrderStatusController);

/**
 * @swagger
 * /merchant/munch/order/pay:
 *   post:
 *     summary: Pay order with wallet
 *     description: Processes wallet payment for an order and notifies the customer.
 *     tags: []
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - walletId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *                 example: 123
 *               walletId:
 *                 type: integer
 *                 description: Wallet ID
 *                 example: 789
 *     responses:
 *       200:
 *         description: Payment processed
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
 *                   example: Payment of $25.50 confirmed for order ORD-123.
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: integer
 *                       example: 1001
 *                     amount:
 *                       type: number
 *                       example: 25.50
 *                     currency:
 *                       type: string
 *                       example: USD
 *       400:
 *         description: Invalid input or order already paid
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
 *         description: Order not found
 *         content:
 *           application/json:
 *             $ref: '#/components/schemas/Error'
 */
router.post('/pay', payOrderWithWalletAuth, validatePayOrderWithWallet, payOrderWithWalletController);

module.exports = router;