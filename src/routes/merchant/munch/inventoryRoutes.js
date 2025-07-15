'use strict';

const express = require('express');
const router = express.Router();
const {
  trackStockLevelsAuth,
  updateInventoryAuth,
  sendRestockingAlertsAuth,
} = require('@middleware/merchant/munch/inventoryMiddleware');
const {
  validateTrackStockLevels,
  validateUpdateInventory,
  validateSendRestockingAlerts,
} = require('@validators/merchant/munch/inventoryValidator');
const {
  trackStockLevelsController,
  updateInventoryController,
  sendRestockingAlertsController,
} = require('@controllers/merchant/munch/inventoryController');

/**
 * @swagger
 * /merchant/munch/inventory/track:
 *   post:
 *     summary: Track stock levels
 *     description: Monitors ingredient/supply levels for a restaurant and returns stock status.
 *     tags: [Inventory]
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
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: Merchant branch ID
 *                 example: 101
 *     responses:
 *       200:
 *         description: Stock levels retrieved
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
 *                   example: Stock levels updated for restaurant 101.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       itemId:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: Tomato
 *                       sku:
 *                         type: string
 *                         example: TOM-001
 *                       quantity:
 *                         type: integer
 *                         example: 50
 *                       minimumStockLevel:
 *                         type: integer
 *                         example: 20
 *                       status:
 *                         type: string
 *                         example: sufficient
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
router.post('/track', trackStockLevelsAuth, validateTrackStockLevels, trackStockLevelsController);

/**
 * @swagger
 * /merchant/munch/inventory/update:
 *   post:
 *     summary: Update inventory
 *     description: Adjusts inventory post-order, logs changes, and awards points to BOH staff.
 *     tags: [Inventory]
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
 *                       description: Menu item ID
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       description: Quantity used
 *                       example: 2
 *     responses:
 *       200:
 *         description: Inventory updated
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
 *                   example: Inventory updated for order 123.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       itemId:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: Tomato
 *                       newQuantity:
 *                         type: integer
 *                         example: 48
 *       400:
 *         description: Invalid input or insufficient stock
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
 *         description: Order or inventory item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/update', updateInventoryAuth, validateUpdateInventory, updateInventoryController);

/**
 * @swagger
 * /merchant/munch/inventory/restock:
 *   post:
 *     summary: Send restocking alerts
 *     description: Notifies BOH staff of low stock items needing restocking.
 *     tags: [Inventory]
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
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: Merchant branch ID
 *                 example: 101
 *     responses:
 *       200:
 *         description: Restocking alerts sent or no restocking needed
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
 *                   example: Restocking alert: Tomato, Lettuce.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       notificationId:
 *                         type: integer
 *                         example: 789
 *       400:
 *         description: Invalid input or no staff available
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
router.post('/restock', sendRestockingAlertsAuth, validateSendRestockingAlerts, sendRestockingAlertsController);

module.exports = router;