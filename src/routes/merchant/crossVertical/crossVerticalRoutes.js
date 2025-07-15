'use strict';

const express = require('express');
const router = express.Router();
const crossVerticalController = require('@controllers/merchant/crossVertical/crossVerticalController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const crossVerticalValidator = require('@validators/merchant/crossVertical/crossVerticalValidator');
const { restrictCrossVerticalAccess } = require('@middleware/merchant/crossVertical/crossVerticalMiddleware');

router.use(authenticate);
router.use(restrictCrossVerticalAccess);

/**
 * @swagger
 * /merchant/crossVertical/{merchantId}/unify:
 *   post:
 *     summary: Unify mtables and munch services for a merchant
 *     tags: [CrossVertical]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Services unified successfully
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
 *                     merchantId:
 *                       type: string
 *                     orders:
 *                       type: integer
 *                     bookings:
 *                       type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Merchant or branches not found
 */
router.post('/:merchantId/unify', restrictTo('merchant'), checkPermissions('manage_crossVertical'), crossVerticalValidator.validateUnifyServices, crossVerticalController.unifyServices);

/**
 * @swagger
 * /merchant/crossVertical/{customerId}/loyalty-sync:
 *   post:
 *     summary: Sync loyalty points for a customer
 *     tags: [CrossVertical]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Loyalty points synced successfully
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
 *                     customerId:
 *                       type: string
 *                     totalPoints:
 *                       type: integer
 *                     munchPoints:
 *                       type: integer
 *                     mtablesPoints:
 *                       type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Customer not found
 */
router.post('/:customerId/loyalty-sync', crossVerticalValidator.validateSyncLoyaltyPoints, crossVerticalController.syncLoyaltyPoints);

/**
 * @swagger
 * /merchant/crossVertical/{merchantId}/ui-consistency:
 *   post:
 *     summary: Ensure consistent UI across merchant branches
 *     tags: [CrossVertical]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: UI consistency ensured successfully
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
 *                     merchantId:
 *                       type: string
 *                     uiSettings:
 *                       type: object
 *                       properties:
 *                         theme:
 *                           type: string
 *                         language:
 *                           type: string
 *                         font:
 *                           type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Merchant or branches not found
 */
router.post('/:merchantId/ui-consistency', restrictTo('merchant'), checkPermissions('manage_crossVertical'), crossVerticalValidator.validateEnsureConsistentUI, crossVerticalController.ensureConsistentUI);

module.exports = router;