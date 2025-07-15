'use strict';

const express = require('express');
const router = express.Router();
const orderController = require('@controllers/customer/munch/orderController');
const orderValidator = require('@validators/customer/munch/orderValidator');

/**
 * Customer order routes
 */
router.post('/browse',
  orderValidator.browseMerchants,
  orderController.browseMerchants
  /**
   * @swagger
   * /api/customer/munch/orders/browse:
   *   post:
   *     summary: Browse merchants based on location and filters
   *     tags: [Customer Munch]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [latitude, longitude, radiusKm]
   *             properties:
   *               latitude:
   *                 type: number
   *                 minimum: -90
   *                 maximum: 90
   *               longitude:
   *                 type: number
   *                 minimum: -180
   *                 maximum: 180
   *               radiusKm:
   *                 type: number
   *                 minimum: 0.1
   *                 maximum: 100
   *               filters:
   *                 type: object
   *     responses:
   *       200:
   *         description: Merchants retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Server error
   */
);

router.post('/cart',
  orderValidator.addToCart,
  orderController.addToCart
  /**
   * @swagger
   * /api/customer/munch/orders/cart:
   *   post:
   *     summary: Add item to cart
   *     tags: [Customer Munch]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [itemId, quantity]
   *             properties:
   *               itemId:
   *                 type: integer
   *                 minimum: 1
   *               quantity:
   *                 type: integer
   *                 minimum: 1
   *               customizations:
   *                 type: object
   *     responses:
   *       200:
   *         description: Item added to cart
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Server error
   */
);

router.put('/cart',
  orderValidator.updateCart,
  orderController.updateCart
  /**
   * @swagger
   * /api/customer/munch/orders/cart:
   *   put:
   *     summary: Update cart items
   *     tags: [Customer Munch]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [cartId, items]
   *             properties:
   *               cartId:
   *                 type: integer
   *                 minimum: 1
   *               items:
   *                 type: array
   *                 minItems: 1
   *                 items:
   *                   type: object
   *                   properties:
   *                     itemId:
   *                       type: integer
   *                       minimum: 1
   *                     quantity:
   *                       type: integer
   *                       minimum: 0
   *                     customizations:
   *                       type: object
   *     responses:
   *       200:
   *         description: Cart updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Server error
   */
);

router.post('/',
  orderValidator.placeOrder,
  orderController.placeOrder
  /**
   * @swagger
   * /api/customer/munch/orders:
   *   post:
   *     summary: Place an order
   *     tags: [Customer Munch]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [cartId, branchId, deliveryLocation]
   *             properties:
   *               cartId:
   *                 type: integer
   *                 minimum: 1
   *               branchId:
   *                 type: integer
   *                 minimum: 1
   *               deliveryLocation:
   *                 type: object
   *                 required: [latitude, longitude]
   *                 properties:
   *                   latitude:
   *                     type: number
   *                     minimum: -90
   *                     maximum: 90
   *                   longitude:
   *                     type: number
   *                     minimum: -180
   *                     maximum: 180
   *     responses:
   *       201:
   *         description: Order placed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     order:
   *                       type: object
   *                     walletBalance:
   *                       type: number
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Server error
   */
);

router.put('/',
  orderValidator.updateOrder,
  orderController.updateOrder
  /**
   * @swagger
   * /api/customer/munch/orders:
   *   put:
   *     summary: Update an order
   *     tags: [Customer Munch]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [orderId, updates]
   *             properties:
   *               orderId:
   *                 type: integer
   *                 minimum: 1
   *               updates:
   *                 type: object
   *     responses:
   *       200:
   *         description: Order updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     order:
   *                       type: object
   *                     walletBalance:
   *                       type: number
   *                     additionalAmount:
   *                       type: number
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Server error
   */
);

router.delete('/:orderId',
  orderValidator.cancelOrder,
  orderController.cancelOrder
  /**
   * @swagger
   * /api/customer/munch/orders/{orderId}:
   *   delete:
   *     summary: Cancel an order
   *     tags: [Customer Munch]
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: integer
   *           minimum: 1
   *     responses:
   *       200:
   *         description: Order cancelled successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     order:
   *                       type: object
   *                     walletBalance:
   *                       type: number
   *                     refundAmount:
   *                       type: number
   *                     refundProcessed:
   *                       type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid order ID
   *       500:
   *         description: Server error
   */
);

module.exports = router;