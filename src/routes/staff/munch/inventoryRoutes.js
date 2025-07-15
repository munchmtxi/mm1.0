inventoryRoutes.js// inventoryRoutes.js
// API routes for staff munch inventory operations.

'use strict';

const express = require('express');
const router = express.Router();
const inventoryController = require('@controllers/staff/munch/inventoryController');
const inventoryMiddleware = require('@middleware/staff/munch/inventoryMiddleware');

/**
 * @swagger
 * /staff/munch/munch/track-inventory/{restaurantId}:
 *   get:
 *     summary: Track inventory levels
 *     tags: [Staff Munch]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Merchant branch ID
 *     responses:
 *       200:
 *         description: Inventory tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                       minimum_stock_level:
 *                         type: number
 *                       alert:
 *                         type: boolean
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.get('/track-inventory/:restaurantId', inventoryMiddleware.validateTrackInventory, inventoryController.trackInventory);

/**
 * @swagger
 * /staff/munch/process-restock:
 *   post:
 *     summary: Process restock alerts
 *     tags: [Staff Munch]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - staffId
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: Merchant branch ID
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Restock alert processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     type: number
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/process-restock', inventoryMiddleware.validateProcessRestockAlert, inventoryController.processRestockAlert);

/**
 * @swagger
 * /staff/munch/munch/update-inventory:
 *   post:
 *     summary: Update inventory after order
 *     tags: [Staff Munch]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - items
 *               - staffId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
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
 *                     quantity:
 *                       type: integer
 *                       description: Quantity used
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Inventory updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     type: number
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/update_inventory', inventoryMiddleware.validateUpdateInventory, inventoryController.updateInventory);

module.exports = router;