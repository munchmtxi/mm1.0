'use strict';

const express = require('express');
const router = express.Router();
const cartController = require('@controllers/customer/mtables/cartController');
const cartMiddleware = require('@middleware/customer/mtables/cartMiddleware');
const cartValidator = require('@validators/customer/mtables/cartValidator');

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Customer cart management for mtables platform
 */

/**
 * @swagger
 * /api/customer/mtables/cart:
 *   post:
 *     summary: Add items to a customer's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, branchId, items]
 *             properties:
 *               customerId:
 *                 type: string
 *                 description: Customer ID
 *               branchId:
 *                 type: string
 *                 description: Merchant branch ID
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menuItemId:
 *                       type: string
 *                       description: Menu item ID
 *                     quantity:
 *                       type: number
 *                       description: Quantity (min: 1)
 *                     customizations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           modifierId:
 *                             type: string
 *                           value:
 *                             type: string
 *     responses:
 *       201:
 *         description: Items added to cart
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
 *                     cart:
 *                       type: object
 *                     cartItems:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid input or resource
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                 code:
 *                   type: string
 */
router.post(
  '/',
  cartMiddleware.authenticateCustomer,
  cartValidator.validateAddToCart,
  cartController.addToCart
);

/**
 * @swagger
 * /api/customer/mtables/cart/{cartId}:
 *   put:
 *     summary: Update items in a customer's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menuItemId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     customizations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           modifierId:
 *                             type: string
 *                           value:
 *                             type: string
 *     responses:
 *       200:
 *         description: Cart updated
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
 *                     cart:
 *                       type: object
 *                     cartItems:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid cart or input
 */
router.put(
  '/:cartId',
  cartMiddleware.authenticateCustomer,
  cartMiddleware.validateCartAccess,
  cartValidator.validateUpdateCart,
  cartController.updateCart
);

/**
 * @swagger
 * /api/customer/mtables/cart/{cartId}:
 *   delete:
 *     summary: Clear a customer's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart ID
 *     responses:
 *       200:
 *         description: Cart cleared
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
 *                     cart:
 *                       type: object
 *       400:
 *         description: Invalid cart
 */
router.delete(
  '/:cartId',
  cartMiddleware.authenticateCustomer,
  cartMiddleware.validateCartAccess,
  cartController.clearCart
);

/**
 * @swagger
 * /api/customer/mtables/cart/{cartId}:
 *   get:
 *     summary: Retrieve a customer's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart ID
 *     responses:
 *       200:
 *         description: Cart retrieved
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
 *                     cart:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         customer_id:
 *                           type: string
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               menu_item:
 *                                 type: object
 *       400:
 *         description: Invalid cart
 */
router.get(
  '/:cartId',
  cartMiddleware.authenticateCustomer,
  cartMiddleware.validateCartAccess,
  cartController.getCart
);

module.exports = router;