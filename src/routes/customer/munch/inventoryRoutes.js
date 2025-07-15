'use strict';

/**
 * Routes for customer inventory endpoints
 */

const express = require('express');
const router = express.Router();
const inventoryController = require('@controllers/customer/munch/inventoryController');
const inventoryValidator = require('@validators/customer/munch/inventoryValidator');

/**
 * @swagger
 * /api/customer/munch/inventory/{restaurantId}:
 *   get:
 *     summary: Retrieve menu items for a restaurant
 *     description: Fetches all published and in-stock menu items for a specified restaurant, including categories, attributes, modifiers, and discounts.
 *     tags:
 *       - Customer Inventory
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the restaurant
 *     responses:
 *       200:
 *         description: Menu items retrieved successfully
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
 *                     restaurantId:
 *                       type: string
 *                       format: uuid
 *                     branchName:
 *                       type: string
 *                     operatingHours:
 *                       type: object
 *                     currency:
 *                       type: string
 *                     menuItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           price:
 *                             type: number
 *                           finalPrice:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           category:
 *                             type: object
 *                           attributes:
 *                             type: array
 *                             items:
 *                               type: string
 *                           modifiers:
 *                             type: array
 *                             items:
 *                               type: object
 *                           discounts:
 *                             type: array
 *                             items:
 *                               type: object
 *                           isAvailable:
 *                             type: boolean
 *                           preparationTime:
 *                             type: number
 *                           images:
 *                             type: array
 *                             items:
 *                               type: string
 *                           thumbnail:
 *                             type: string
 *                           tags:
 *                             type: array
 *                             items:
 *                               type: string
 *                           isFeatured:
 *                             type: boolean
 *                           nutritionalInfo:
 *                             type: object
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Server error
 */
router.get('/:restaurantId', inventoryValidator.getMenuItems, inventoryController.getMenuItems);

/**
 * @swagger
 * /api/customer/munch/inventory/item/{itemId}:
 *   get:
 *     summary: Check availability of a menu item
 *     description: Checks the availability of a specific menu item, including applicable discounts and dietary filters.
 *     tags:
 *       - Customer Inventory
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the menu item
 *     responses:
 *       200:
 *         description: Item availability checked
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
 *                     itemId:
 *                       type: string
 *                       format: uuid
 *                     isAvailable:
 *                       type: boolean
 *                     quantityAvailable:
 *                       type: number
 *                     applicableDiscounts:
 *                       type: array
 *                       items:
 *                         type: object
 *                     preparationTime:
 *                       type: number
 *                     branchId:
 *                       type: string
 *                       format: uuid
 *                     merchantId:
 *                       type: string
 *                       format: uuid
 *                     dietaryFilters:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */
router.get('/item/:itemId', inventoryValidator.checkItemAvailability, inventoryController.checkItemAvailability);

/**
 * @swagger
 * /api/customer/munch/inventory/featured/{restaurantId}:
 *   get:
 *     summary: Retrieve featured items for a restaurant
 *     description: Fetches featured menu items for a restaurant, with an optional limit parameter.
 *     tags:
 *       - Customer Inventory
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the restaurant
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *         description: Maximum number of featured items to return (default: 5)
 *     responses:
 *       200:
 *         description: Featured items retrieved successfully
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
 *                     restaurantId:
 *                       type: string
 *                       format: uuid
 *                     featuredItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           price:
 *                             type: number
 *                           finalPrice:
 *                             type: number
 *                           thumbnail:
 *                             type: string
 *                           attributes:
 *                             type: array
 *                             items:
 *                               type: string
 *                           discounts:
 *                             type: array
 *                             items:
 *                               type: object
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Server error
 */
router.get('/featured/:restaurantId', inventoryValidator.getFeaturedItems, inventoryController.getFeaturedItems);

module.exports = router;