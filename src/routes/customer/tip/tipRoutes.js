'use strict';

const express = require('express');
const router = express.Router();
const { createTipAction, updateTipAction, getCustomerTipsAction } = require('@controllers/customer/tip/tipController');
const { createTipSchema, updateTipSchema } = require('@validators/customer/tip/tipValidator');
const { createTip, updateTip, getCustomerTips } = require('@middleware/customer/tip/tipMiddleware');
const { validate } = require('@middleware/common');

/**
 * @swagger
 * /api/v1/customer/tip:
 *   post:
 *     summary: Create a tip for a service
 *     tags: [Tip]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *               - amount
 *               - currency
 *             properties:
 *               recipientId: { type: integer, example: 1 }
 *               amount: { type: number, example: 5.00 }
 *               currency: { type: string, example: "USD" }
 *               rideId: { type: integer, example: 1 }
 *               orderId: { type: integer, example: 1 }
 *               bookingId: { type: integer, example: 1 }
 *               eventServiceId: { type: integer, example: 1 }
 *               inDiningOrderId: { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: Tip created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "success" }
 *                 data: { type: object, properties: { tipId: { type: integer }, amount: { type: number }, currency: { type: string }, status: { type: string } } }
 *       400:
 *         description: Invalid input
 */
router.post('/', createTip, validate(createTipSchema), createTipAction);

/**
 * @swagger
 * /api/v1/customer/tip/{tipId}:
 *   patch:
 *     summary: Update a tip's amount or status
 *     tags: [Tip]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tipId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tip ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number, example: 10.00 }
 *               status: { type: string, example: "completed" }
 *     responses:
 *       200:
 *         description: Tip updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "success" }
 *                 data: { type: object, properties: { tipId: { type: integer }, amount: { type: number }, currency: { type: string }, status: { type: string } } }
 *       404:
 *         description: Tip not found
 */
router.patch('/:tipId', updateTip, validate(updateTipSchema), updateTipAction);

/**
 * @swagger
 * /api/v1/customer/tip:
 *   get:
 *     summary: Get customer's tips
 *     tags: [Tip]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tips
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "success" }
 *                 data: { type: array, items: { type: object, properties: { tipId: { type: integer }, amount: { type: number }, currency: { type: string }, status: { type: string }, recipientName: { type: string } } } }
 */
router.get('/', getCustomerTips, getCustomerTipsAction);

module.exports = router;