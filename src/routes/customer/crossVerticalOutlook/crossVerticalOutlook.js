'use strict';

const express = require('express');
const router = express.Router();
const crossVerticalOutlookController = require('@controllers/customer/crossVerticalOutlookController');
const crossVerticalOutlookValidator = require('@validators/customer/crossVerticalOutlook');

/**
 * @swagger
 * /customer/cross-vertical-outlook:
 *   get:
 *     summary: Fetch all active customer services
 *     tags: [Customer Cross Vertical Outlook]
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         schema:
 *           type: string
 *         required: false
 *         description: Language code for response messages (e.g., 'en')
 *     responses:
 *       200:
 *         description: Successfully fetched customer services
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
 *                   example: Services fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookings:
 *                       type: array
 *                       items:
 *                         type: object
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                     inDiningOrders:
 *                       type: array
 *                       items:
 *                         type: object
 *                     rides:
 *                       type: array
 *                       items:
 *                         type: object
 *                     parkingBookings:
 *                       type: array
 *                       items:
 *                         type: object
 *                     eventServices:
 *                       type: array
 *                       items:
 *                         type: object
 *       500:
 *         description: Failed to fetch services
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', crossVerticalOutlookValidator.validateGetCustomerServices, crossVerticalOutlookController.getCustomerServices);

/**
 * @swagger
 * /customer/cross-vertical-outlook/cancel:
 *   post:
 *     summary: Cancel a customer service
 *     tags: [Customer Cross Vertical Outlook]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceType
 *               - serviceId
 *             properties:
 *               serviceType:
 *                 type: string
 *                 enum: [mtables, munch, in_dining, mtxi, mpark]
 *                 description: Type of service to cancel
 *               serviceId:
 *                 type: integer
 *                 description: ID of the service to cancel
 *               languageCode:
 *                 type: string
 *                 description: Language code for response messages (e.g., 'en')
 *     responses:
 *       200:
 *         description: Service cancelled successfully
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
 *                   example: Service cancelled successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid service type or cancellation window expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Service not found or not cancellable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to cancel service
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/cancel', crossVerticalOutlookValidator.validateCancelService, crossVerticalOutlookController.cancelService);

module.exports = router;