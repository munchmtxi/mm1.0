'use strict';

const express = require('express');
const router = express.Router();
const { preOrderAuth, groupPaymentAuth, feedbackAuth } = require('@middleware/merchant/mtables/preOrderMiddleware');
const { validateCreatePreOrder, validateManageGroupPayments, validateProvideFeedback } = require('@validators/merchant/mtables/preOrderValidator');
const { createPreOrderController, manageGroupPaymentsController, provideFeedbackController } = require('@controllers/merchant/mtables/preOrderController');

/**
 * @swagger
 * /merchant/mtables/preorders/create:
 *   post:
 *     summary: Create a pre-order for a booking
 *     description: Creates a pre-order for a confirmed booking, validates items, customer, branch, and booking details, and assigns a table. Points are awarded automatically for the customer.
 *     tags: [PreOrders]
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
 *               - customerId
 *               - branchId
 *               - items
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *                 example: 123
 *               customerId:
 *                 type: integer
 *                 description: ID of the customer
 *                 example: 456
 *               branchId:
 *                 type: integer
 *                 description: ID of the merchant branch
 *                 example: 789
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - menu_item_id
 *                     - quantity
 *                   properties:
 *                     menu_item_id:
 *                       type: integer
 *                       description: ID of the menu item
 *                       example: 101
 *                     quantity:
 *                       type: integer
 *                       description: Quantity of the item
 *                       example: 2
 *                     customization:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           modifier_id:
 *                             type: integer
 *                             description: ID of the modifier
 *                             example: 202
 *               staffId:
 *                 type: integer
 *                 description: ID of the staff (optional)
 *                 example: 303
 *     responses:
 *       200:
 *         description: Pre-order created successfully
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
 *                   example: Pre-order 123 created for 50.00.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     customer_id:
 *                       type: integer
 *                       example: 456
 *                     branch_id:
 *                       type: integer
 *                       example: 789
 *                     table_id:
 *                       type: integer
 *                       example: 101
 *                     order_number:
 *                       type: string
 *                       example: PO-1625098765432-ABCDEF
 *                     status:
 *                       type: string
 *                       example: pending
 *                     total_amount:
 *                       type: number
 *                       example: 50.00
 *                     currency:
 *                       type: string
 *                       example: USD
 *                     is_pre_order:
 *                       type: boolean
 *                       example: true
 *                     estimated_completion_time:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-05T10:00:00.000Z
 *       400:
 *         description: Invalid input or order failure
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
 *         description: Booking, customer, or branch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/create', preOrderAuth, validateCreatePreOrder, createPreOrderController);

/**
 * @swagger
 * /merchant/mtables/preorders/payments:
 *   post:
 *     summary: Manage group payments for a pre-order
 *     description: Processes split payments from multiple customers for a pre-order, validating customer, wallet, and amount. Points are awarded for each customer.
 *     tags: [PreOrders]
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
 *               - customerIds
 *               - paymentSplits
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: ID of the pre-order
 *                 example: 123
 *               customerIds:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: integer
 *                   description: IDs of customers
 *                   example: 456
 *               paymentSplits:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - customerId
 *                     - amount
 *                   properties:
 *                     customerId:
 *                       type: integer
 *                       description: ID of the customer
 *                       example: 456
 *                     amount:
 *                       type: number
 *                       description: Payment amount
 *                       example: 25.00
 *                     paymentMethodId:
 *                       type: integer
 *                       description: ID of payment method (optional)
 *                       example: 789
 *               staffId:
 *                 type: integer
 *                 description: ID of the staff (optional)
 *                 example: 303
 *     responses:
 *       200:
 *         description: Group payments processed successfully
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
 *                   example: Payment of 50.00 completed for order 123.
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                             example: 101
 *                           in_dining_order_id:
 *                             type: number
 *                             example: 123
 *                           customer_id:
 *                             type: number
 *                             example: 456
 *                           merchant_id:
 *                             type: number
 *                             example: 789
 *                           amount:
 *                             type: number
 *                             example: 25.00
 *                           status:
 *                             type: string
 *                             example: completed
 *                           transaction_id:
 *                             type: string
 *                             example: TXN-1625098765432-ABCDEF
 *                           currency:
 *                             type: string
 *                             example: USD
 *                     order:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: number
 *                           example: 123
 *                         payment_status:
 *                           type: string
 *                           example: completed
 *       400:
 *         description: Invalid input or payment failure
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
 *         description: Order or customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/payments', groupPaymentAuth, validateManageGroupPayments, manageGroupPaymentsController);

/**
 * @swagger
 * /merchant/mtables/preorders/feedback:
 *   post:
 *     summary: Provide feedback for a pre-order
 *     description: Submits feedback or substitutions for a pre-order, validating merchant, staff, and items. Points are awarded for the customer.
 *     tags: [PreOrders]
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
 *               - merchantId
 *               - staffId
 *             properties:
 *               orderId:
 *                 type: number
 *                 description: ID of the pre-order
 *                 example: 123
 *               merchantId:
 *                 type: number
 *                 description: ID of the merchant
 *                 example: 789
 *               staffId:
 *                 type: number
 *                 description: ID of the staff
 *                 example: 303
 *               comment:
 *                 type: string
 *                 description: Feedback comment
 *                 maxLength: 500
 *                 example: Great service, but substitutions needed.
 *               substitutions:
 *                 type: array
 *                 description: List of substitution items (optional)
 *                 items:
 *                   type: object
 *                   required:
 *                     - menu_item_id
 *                     - quantity
 *                   properties:
 *                     menu_item_id:
 *                       type: number
 *                       description: ID of the substitute menu item
 *                       example: 102
 *                     quantity:
 *                       type: number
 *                       description: Quantity of the substitute item
 *                       example: 1
 *                     customization:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           modifier_id:
 *                             type: number
 *                             description: ID of the modifier
 *                             example: 203
 *     responses.status(200):
 *         description: Feedback submitted successfully
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
 *                   example: Feedback submitted for order 123 with rating 4.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                       example: 456
 *                     customer_id:
 *                       type: number
 *                       example: 456
 *                     in_dining_order_id:
 *                       type: number
 *                       example: 123
 *                     staff_id:
 *                       type: number
 *                       example: 303
 *                     rating:
 *                       type: number
 *                       example: 4
 *                     comment:
 *                       type: string
 *                       example: Great service.
 *                     is_positive:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Invalid input or feedback failure
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
 *         description: Order or merchant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/feedback', feedbackAuth, validateProvideFeedback, provideFeedbackController);

module.exports = router;