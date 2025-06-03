'use strict';

const express = require('express');
const router = express.Router();
const orderController = require('@controllers/customer/mtables/orderController');
const orderMiddleware = require('@middleware/customer/mtables/orderMiddleware');
const orderValidator = require('@validators/customer/mtables/orderValidator');

/**
 * @swagger
 * /api/customer/mtables/orders/cart:
 *   post:
 *     summary: Add items to cart
 *     description: Adds items to a customer's cart and logs audit.
 *     tags:
 *       - Customer Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - branchId
 *               - items
 *             properties:
 *               branchId:
 *                 type: integer
 *                 description: Branch ID
 *                 example: 123
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menu_item_id: { type: integer, example: 456 }
 *                     quantity: { type: integer, example: 2 }
 *                     customizations: { type: array, items: { type: object, properties: { modifier_id: { type: integer, example: 789 } } } }
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
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Cart updated
 *                 data:
 *                   type: object
 *                   properties:
 *                     cartId:
 *                       type: integer
 *                       example: 123
 *       400:
 *         description: Invalid request or cart update failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 * /api/customer/mtables/orders:
 *   post:
 *     summary: Create an order
 *     description: Creates an order, sends notifications, logs audit, emits socket event, and awards points.
 *     tags:
 *       - Customer Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: Booking ID
 *                 example: 123
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menu_item_id: { type: integer, example: 456 }
 *                     quantity: { type: integer, example: 2 }
 *                     customizations: { type: array, items: { type: object, properties: { modifier_id: { type: integer, example: 789 } } } }
 *               isPreOrder:
 *                 type: boolean
 *                 description: Is pre-order
 *                 example: false
 *               cartId:
 *                 type: integer
 *                 description: Cart ID
 *                 example: 789
 *               dietaryPreferences:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: vegetarian
 *               paymentMethodId:
 *                 type: integer
 *                 description: Payment method ID
 *                 example: 101
 *               recommendationData:
 *                 type: object
 *                 properties:
 *                   productIds: { type: array, items: { type: integer, example: 456 } }
 *                   type: { type: string, example: personalized }
 *                   sessionId: { type: string, example: abc123 }
 *     responses:
 *       200:
 *         description: Order created
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
 *                   example: Order created
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                       example: 123
 *                     orderNumber:
 *                       type: string
 *                       example: ORD-123456-ABCDEF
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request or order creation failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 * /api/customer/mtables/orders/{orderId}/update:
 *   post:
 *     summary: Update an order
 *     description: Updates an order, sends notifications, logs audit, and emits socket event.
 *     tags:
 *       - Customer Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menu_item_id: { type: integer, example: 456 }
 *                     quantity: { type: integer, example: 2 }
 *                     customizations: { type: array, items: { type: object, properties: { modifier_id: { type: integer, example: 789 } } } }
 *               dietaryPreferences:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: vegetarian
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
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Order updated
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                       example: 123
 *                     totalAmount:
 *                       type: number
 *                       example: 500.00
 *       400:
 *         description: Invalid request or order update failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 * /api/customer/mtables/orders/{orderId}/cancel:
 *   post:
 *     summary: Cancel an order
 *     description: Cancels an order, processes refund if needed, sends notifications, logs audit, and emits socket event.
 *     tags:
 *       - Customer Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
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
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Order cancelled
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                       example: 123
 *       400:
 *         description: Invalid request or order cancellation failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 * /api/customer/mtables/orders/{orderId}/status:
 *   get:
 *     summary: Track order status
 *     description: Tracks the status of an order and emits socket event.
 *     tags:
 *       - Customer Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order status tracked
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
 *                   example: Order status tracked
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: pending
 *                     preparationStatus:
 *                       type: string
 *                       example: pending
 *       400:
 *         description: Invalid request or status tracking failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 * /api/customer/mtables/orders/{orderId}/feedback:
 *   post:
 *     summary: Submit order feedback
 *     description: Submits feedback for an order, sends notifications, logs audit, emits socket event, and awards points.
 *     tags:
 *       - Customer Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 description: Rating (1-5)
 *                 example: 5
 *               comment:
 *                 type: string
 *                 description: Feedback comment
 *                 example: Great service!
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *                 example: 789
 *     responses:
 *       200:
 *         description: Feedback submitted
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
 *                   example: Feedback submitted
 *                 data:
 *                   type: object
 *                   properties:
 *                     feedbackId:
 *                       type: integer
 *                       example: 123
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request or feedback submission failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

router.post(
  '/orders/cart',
  orderMiddleware.authenticate,
  orderMiddleware.restrictTo('customer'),
  orderMiddleware.checkPermissions('update_cart'),
  orderValidator.validateAddToCart,
  orderMiddleware.checkOrderAccess,
  orderController.addToCart
);

router.post(
  '/orders',
  orderMiddleware.authenticate,
  orderMiddleware.restrictTo('customer'),
  orderMiddleware.checkPermissions('create_order'),
  orderValidator.validateCreateOrder,
  orderMiddleware.checkOrderAccess,
  orderController.createOrder
);

router.post(
  '/orders/:orderId/update',
  orderMiddleware.authenticate,
  orderMiddleware.restrictTo('customer'),
  orderMiddleware.checkPermissions('update_order'),
  orderValidator.validateUpdateOrder,
  orderMiddleware.checkOrderAccess,
  orderController.updateOrder
);

router.post(
  '/orders/:orderId/cancel',
  orderMiddleware.authenticate,
  orderMiddleware.restrictTo('customer'),
  orderMiddleware.checkPermissions('cancel_order'),
  orderValidator.validateOrderId,
  orderMiddleware.checkOrderAccess,
  orderController.cancelOrder
);

router.get(
  '/orders/:orderId/status',
  orderMiddleware.authenticate,
  orderMiddleware.restrictTo('customer'),
  orderMiddleware.checkPermissions('view_order'),
  orderValidator.validateOrderId,
  orderMiddleware.checkOrderAccess,
  orderController.trackOrderStatus
);

router.post(
  '/orders/:orderId/feedback',
  orderMiddleware.authenticate,
  orderMiddleware.restrictTo('customer'),
  orderMiddleware.checkPermissions('submit_feedback'),
  orderValidator.validateSubmitFeedback,
  orderMiddleware.checkOrderAccess,
  orderController.submitOrderFeedback
);

module.exports = router;