// src/routes/customer/mtables/preOrderRoutes.js
'use strict';

const express = require('express');
const preOrderController = require('@controllers/customer/mtables/preOrderController');
const preOrderValidator = require('@validators/customer/mtables/preOrderValidator');
const preOrderMiddleware = require('@middleware/customer/mtables/preOrderMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/customer/mtables/pre-order:
 *   post:
 *     summary: Create a pre-order for a booking
 *     tags: [Customer Pre-Order]
 *     description: Creates a pre-order for a specified booking with menu items, dietary preferences, and optional payment method.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, items]
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menuItemId:
 *                       type: integer
 *                       description: ID of the menu item
 *                     quantity:
 *                       type: integer
 *                       description: Quantity of the item
 *                     customizations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           modifierId:
 *                             type: integer
 *                   required: [menuItemId, quantity]
 *               dietaryPreferences:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: ['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'NUT_FREE', 'DAIRY_FREE', 'HALAL', 'KOSHER', 'LOW_CARB', 'ORGANIC']
 *               paymentMethodId:
 *                 type: string
 *                 enum: ['credit_card', 'debit_card', 'digital_wallet', 'bank_transfer', 'mobile_money', 'crypto']
 *               recommendationData:
 *                 type: object
 *     responses:
 *       201:
 *         description: Pre-order created successfully
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
 *                     order:
 *                       type: object
 *       400:
 *         description: Invalid input or error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 errors:
 *                   type: array
 */
router.post('/pre-order', preOrderValidator.createPreOrder, preOrderMiddleware.validateBooking, preOrderController.createPreOrder);

/**
 * @swagger
 * /api/customer/mtables/pre-order/request-friends:
 *   post:
 *     summary: Send pre-order payment requests to friends
 *     tags: [Customer Pre-Order]
 *     description: Sends payment requests to booking party members for splitting a pre-order bill.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, orderId, amount, billSplitType]
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *               orderId:
 *                 type: integer
 *                 description: ID of the pre-order
 *               amount:
 *                 type: number
 *                 description: Total amount to split
 *               billSplitType:
 *                 type: string
 *                 enum: ['EQUAL', 'CUSTOM', 'ITEMIZED', 'PERCENTAGE', 'SPONSOR_CONTRIBUTION']
 *     responses:
 *       200:
 *         description: Payment requests sent successfully
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
 *                     paymentRequests:
 *                       type: array
 *                       items:
 *                         type: object
 *                     order:
 *                       type: object
 *       400:
 *         description: Invalid input or error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 errors:
 *                   type: array
 */
router.post('/pre-order/request-friends', preOrderValidator.sendPreOrderRequestToFriends, preOrderMiddleware.validateOrder, preOrderController.sendPreOrderRequestToFriends);

module.exports = router;