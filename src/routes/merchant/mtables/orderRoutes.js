'use strict';

const express = require('express');
const router = express.Router();
const orderController = require('@controllers/merchant/mtables/orderController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');
const orderValidator = require('@validators/merchant/mtables/orderValidator');
const { restrictOrderAccess } = require('@middleware/merchant/mtables/orderMiddleware');

router.use(authenticate);
router.use(restrictOrderAccess);

/**
 * @swagger
 * /merchant/mtables/order/{bookingId}/process:
 *   post:
 *     summary: Process an extra table order
 *     tags: [MtablesOrders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
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
 *                     menu_item_id:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     customizations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           modifier_id:
 *                             type: integer
 *     responses:
 *       200:
 *         description: Order processed successfully
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
 *                     orderId:
 *                       type: string
 *                     bookingId:
 *                       type: string
 *                     tableId:
 *                       type: string
 *                     branchId:
 *                       type: string
 *                     totalAmount:
 *                       type: number
 *                     points:
 *                       type: number
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Booking not found
 */
router.post(
  '/order/:bookingId/process',
  restrictTo('customer'),
  checkPermissions('manage_orders'),
  orderValidator.validateProcessExtraOrder,
  orderController.processExtraOrder
);

/**
 * @swagger
 * /merchant/mtables/order/dietaryFilters/{customerId}:
 *   post:
 *     summary: Apply dietary filters to order items
 *     tags: [MtablesOrders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     requestBody:
 *       required: true
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
 *                     menu_item_id:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Dietary filters applied successfully
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
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                     filteredItemCount:
 *                       type: integer
 *                     points:
 *                       type: number
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Customer not found
 */
router.post(
  '/order/dietaryFilters/:customerId',
  restrictTo('customer'),
  checkPermissions('manage_orders'),
  orderValidator.validateApplyDietaryFilters,
  orderController.applyDietaryFilters
);

/**
 * @swagger
 * /merchant/mtables/order/{orderId}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [MtablesOrders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, preparing, completed, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated successfully
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
 *                     orderId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     tableId:
 *                       type: string
 *                     branchId:
 *                       type: string
 *                     points:
 *                       type: number
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Order not found
 */
router.patch(
  '/order/:orderId/status',
  restrictTo('merchant'),
  checkPermissions('manage_orders'),
  orderValidator.validateUpdateOrderStatus,
  orderController.updateOrderStatus
);

/**
 * @swagger
 * /merchant/mtables/order/{orderId}/pay:
 *   post:
 *     summary: Pay order with wallet
 *     tags: [MtablesOrders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed successfully
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
 *                     orderId:
 *                       type: string
 *                     paymentId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     branchId:
 *                       type: string
 *                     points:
 *                       type: number
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Order or wallet not found
 */
router.post(
  '/order/:orderId/pay',
  restrictTo('customer'),
  checkPermissions('manage_payments'),
  orderValidator.validatePayOrderWithWallet,
  orderController.payOrderWithWallet
);

module.exports = router;