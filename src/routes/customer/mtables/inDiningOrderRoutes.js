'use strict';

const express = require('express');
const router = express.Router();
const inDiningOrderController = require('@controllers/customer/mtables/inDiningOrderController');
const inDiningOrderValidator = require('@validators/customer/mtables/inDiningOrderValidator');
const { validate } = require('@middleware/validate');
const authMiddleware = require('@middleware/customer/mtables/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: InDiningOrders
 *   description: In-dining order management for customers
 */

/**
 * @swagger
 * /customer/mtables/orders:
 *   post:
 *     summary: Create a new in-dining order
 *     tags: [InDiningOrders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, branchId, tableId, cartId]
 *             properties:
 *               customerId: { type: string, format: uuid, description: Customer ID }
 *               branchId: { type: string, format: uuid, description: Branch ID }
 *               tableId: { type: string, format: uuid, description: Table ID }
 *               cartId: { type: string, format: uuid, description: Cart ID }
 *               notes: { type: string, description: Optional order notes, max 500 characters }
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: object, properties: { order: { type: object }, branch: { type: object }, table: { type: object } } }
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /customer/mtables/orders:
 *   put:
 *     summary: Update an existing in-dining order
 *     tags: [InDiningOrders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId: { type: string, format: uuid, description: Order ID }
 *               status: { type: string, enum: ['pending', 'preparing', 'completed', 'cancelled'], description: Order status }
 *               preparationStatus: { type: string, enum: ['pending', 'in_progress', 'completed'], description: Preparation status }
 *               notes: { type: string, description: Optional order notes, max 500 characters }
 *     responses:
 *       200:
 *         description: Order updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: object, properties: { order: { type: object } } }
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /customer/mtables/orders/feedback:
 *   post:
 *     summary: Submit feedback for an in-dining order
 *     tags: [InDiningOrders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, rating]
 *             properties:
 *               orderId: { type: string, format: uuid, description: Order ID }
 *               rating: { type: integer, minimum: 1, maximum: 5, description: Feedback rating }
 *               comment: { type: string, description: Optional feedback comment, max 1000 characters }
 *     responses:
 *       201:
 *         description: Feedback submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: object, properties: { feedback: { type: object } } }
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /customer/mtables/orders/history:
 *   get:
 *     summary: Retrieve in-dining order history
 *     tags: [InDiningOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: customerId
 *         schema: { type: string, format: uuid }
 *         description: Filter by customer ID (optional)
 *       - in: query
 *         name: branchId
 *         schema: { type: string, format: uuid }
 *         description: Filter by branch ID (optional)
 *     responses:
 *       200:
 *         description: Order history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: object, properties: { orders: { type: array, items: { type: object } } } }
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Unauthorized
 */

router.post(
  '/orders',
  authMiddleware.verifyCustomer,
  inDiningOrderValidator.createInDiningOrder,
  validate,
  inDiningOrderController.createInDiningOrder
);

router.put(
  '/orders',
  authMiddleware.verifyCustomer,
  inDiningOrderValidator.updateInDiningOrder,
  validate,
  inDiningOrderController.updateInDiningOrder
);

router.post(
  '/orders/feedback',
  authMiddleware.verifyCustomer,
  inDiningOrderValidator.submitOrderFeedback,
  validate,
  inDiningOrderController.submitOrderFeedback
);

router.get(
  '/orders/history',
  authMiddleware.verifyCustomer,
  inDiningOrderValidator.getInDiningOrderHistory,
  validate,
  inDiningOrderController.getInDiningOrderHistory
);

module.exports = router;