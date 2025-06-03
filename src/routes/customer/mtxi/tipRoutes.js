'use strict';

const express = require('express');
const router = express.Router();
const tipController = require('@controllers/customer/mtxi/tipController');
const tipValidation = require('@middleware/customer/mtxi/tipValidation');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Tips
 *   description: Customer tipping management for mtxi and munch services
 */
router.use(authenticate, restrictTo('customer'));

/**
 * @swagger
 * /api/customer/mtxi/tips:
 *   post:
 *     summary: Send a tip
 *     tags: [Tips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - walletId
 *             properties:
 *               ride_id:
 *                 type: integer
 *               order_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               walletId:
 *                 type: integer
 *               split_with_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Tip sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     tipId:
 *                       type: integer
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', checkPermissions('send_tip'), tipValidation.validateSendTip, tipController.sendTip);

/**
 * @swagger
 * /api/customer/mtxi/tips/cancel:
 *   post:
 *     summary: Cancel a pending tip
 *     tags: [Tips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tipId
 *             properties:
 *               tipId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Tip cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     tipId:
 *                       type: integer
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tip not found
 */
router.post('/cancel', checkPermissions('cancel_tip'), tipValidation.validateCancelTip, tipController.cancelTip);

/**
 * @swagger
 * /api/customer/mtxi/tips/status:
 *   post:
 *     summary: Update tip status
 *     tags: [Tips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tipId
 *               - newStatus
 *             properties:
 *               tipId:
 *                 type: integer
 *               newStatus:
 *                 type: string
 *                 enum: ['pending', 'completed', 'failed']
 *     responses:
 *       200:
 *         description: Tip status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     tipId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tip not found
 */
router.post('/status', checkPermissions('update_tip_status'), tipValidation.validateUpdateTipStatus, tipController.updateTipStatus);

/**
 * @swagger
 * /api/customer/mtxi/tips/history:
 *   get:
 *     summary: Retrieve tip history
 *     tags: [Tips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tip history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       ride_id:
 *                         type: integer
 *                         nullable: true
 *                       order_id:
 *                         type: integer
 *                         nullable: true
 *                       customer_id:
 *                         type: integer
 *                       recipient_id:
 *                         type: integer
 *                       amount:
 *                         type: number
 *                       currency:
 *                         type: string
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                       updated_at:
 *                         type: string
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.get('/history', checkPermissions('view_tip'), tipController.getTipHistory);

module.exports = router;