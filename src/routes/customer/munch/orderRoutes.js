'use strict';

const express = require('express');
const router = express.Router();
const orderController = require('@controllers/customer/munch/orderController');
const orderValidator = require('@validators/customer/munch/orderValidator');
const orderMiddleware = require('@middleware/customer/munch/orderMiddleware');
const { validate } = require('@middleware/validate');

/**
 * @swagger
 * /api/customer/munch/merchants:
 *   post:
 *     summary: Browse merchants by proximity and filters
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
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               radiusKm:
 *                 type: number
 *               filters:
 *                 type: object
 *                 properties:
 *                   dietaryPreferences:
 *                     type: array
 *                     items:
 *                       type: string
 *                   merchantType:
 *                     type: string
 *                   orderType:
 *                     type: string
 *     responses:
 *       200:
 *         description: Merchants retrieved
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
 *                     merchants:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 */
/**
 * @swagger
 * /api/customer/munch/cart/add:
 *   post:
 *     summary: Add item to cart
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
 *               itemId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *               customizations:
 *                 type: object
 *                 properties:
 *                   dietaryPreferences:
 *                     type: array
 *                     items:
 *                       type: string
 *                   toppings:
 *                     type: array
 *                     items:
 *                       type: string
 *                   size:
 *                     type: string
 *                   extras:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: Item added to cart
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
 *                     cartId:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 */
/**
 * @swagger
 * /api/customer/munch/cart/update:
 *   put:
 *     summary: Update cart items
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
 *               cartId:
 *                 type: integer
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     customizations:
 *                       type: object
 *     responses:
 *       200:
 *         description: Cart updated
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
 *                     cartId:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 */
/**
 * @swagger
 * /api/customer/munch/order:
 *   post:
 *     summary: Place an order from cart
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
 *               cartId:
 *                 type: integer
 *               branchId:
 *                 type: integer
 *               deliveryLocation:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   address:
 *                     type: string
 *     responses:
 *       200:
 *         description: Order placed
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
 *                     orderId:
 *                       type: integer
 *                     totalAmount:
 *                       type: number
 *                     status:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 */
/**
 * @swagger
 * /api/customer/munch/order/update:
 *   put:
 *     summary: Update an existing order
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
 *               orderId:
 *                 type: integer
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     customizations:
 *                       type: object
 *     responses:
 *       200:
 *         description: Order updated
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
 *                     orderId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     additionalAmount:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 */
/**
 * @swagger
 * /api/customer/munch/order/cancel:
 *   put:
 *     summary: Cancel an order
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
 *               orderId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Order cancelled
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
 *                     orderId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     refundProcessed:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 */

router.post('/merchants', orderMiddleware.browseMerchants, validate(orderValidator.browseMerchantsSchema), orderController.browseMerchants);
router.post('/cart/add', orderMiddleware.addToCart, validate(orderValidator.addToCartSchema), orderController.addToCart);
router.put('/cart/update', orderMiddleware.updateCart, validate(orderValidator.updateCartSchema), orderController.updateCart);
router.post('/order', orderMiddleware.placeOrder, validate(orderValidator.placeOrderSchema), orderController.placeOrder);
router.put('/order/update', orderMiddleware.updateOrder, validate(orderValidator.updateOrderSchema), orderController.updateOrder);
router.put('/order/cancel', orderMiddleware.cancelOrder, validate(orderValidator.cancelOrderSchema), orderController.cancelOrder);

module.exports = router;