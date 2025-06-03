'use strict';

const express = require('express');
const router = express.Router();
const inventoryController = require('@controllers/customer/munch/inventoryController');
const inventoryValidator = require('@validators/customer/munch/inventoryValidator');
const inventoryMiddleware = require('@middleware/customer/munch/inventoryMiddleware');
const { validate } = require('@middleware/validate');

/**
 * @swagger
 * /api/customer/munch/inventory/{restaurantId}/menu:
 *   get:
 *     summary: Retrieve menu items for a restaurant
 *     tags: [Munch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Restaurant branch ID
 *     responses:
 *       200:
 *         description: Menu items retrieved
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
 *                     restaurantId:
 *                       type: integer
 *                     menuItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           price:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           dietaryFilters:
 *                             type: array
 *                             items:
 *                               type: string
 *                           isAvailable:
 *                             type: boolean
 *                           category:
 *                             type: string
 *                           discount:
 *                             type: number
 *                           promotion:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Restaurant not found
 */
/**
 * @swagger
 * /api/customer/munch/inventory/{itemId}/availability:
 *   get:
 *     summary: Check menu item availability
 *     tags: [Munch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu item ID
 *     responses:
 *       200:
 *         description: Item availability checked
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
 *                     itemId:
 *                       type: integer
 *                     isAvailable:
 *                       type: boolean
 *                     quantityAvailable:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Menu item not found
 */

router.get('/:restaurantId/menu', inventoryMiddleware.getMenuItems, validate(inventoryValidator.getMenuItemsSchema), inventoryController.getMenuItems);
router.get('/:itemId/availability', inventoryMiddleware.checkItemAvailability, validate(inventoryValidator.checkItemAvailabilitySchema), inventoryController.checkItemAvailability);

module.exports = router;