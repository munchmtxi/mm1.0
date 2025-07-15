'use strict';

const express = require('express');
const router = express.Router();
const branchMenuManagementController = require('@controllers/merchant/menu/branchMenuManagementController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const branchMenuManagementValidator = require('@validators/merchant/menu/branchMenuManagementValidator');
const { restrictBranchMenuAccess } = require('@middleware/merchant/menu/branchMenuManagementMiddleware');

router.use(authenticate);
router.use(restrictBranchMenuAccess);

/**
 * @swagger
 * /merchant/menu/{branchId}/amend:
 *   post:
 *     summary: Amend a branch's menu
 *     tags: [BranchMenuManagement]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: branchId
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               addItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name: string
 *                     price: number
 *                     categoryId: string
 *                     description: string
 *                     availabilityStatus: string
 *                     isPublished: boolean
 *                     modifiers: array
 *                     attributes: array
 *               updateItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id: string
 *                     name: string
 *                     price: number
 *                     categoryId: string
 *                     description: string
 *                     availabilityStatus: string
 *                     isPublished: boolean
 *                     modifiers: array
 *                     attributes: array
 *               removeItemIds:
 *                 type: array
 *                 items: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url: string
 *                     title: string
 *     responses:
 *       200:
 *         description: Menu amended successfully
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
 *                     branchId:
 *                       type: string
 *                     merchantId:
 *                       type: string
 *                     addedCount:
 *                       type: integer
 *                     updatedCount:
 *                       type: integer
 *                     removedCount:
 *                       type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Branch or merchant not found
 */
router.post('/:branchId/amend', restrictTo('merchant'), checkPermissions('manage_menu'), branchMenuManagementValidator.validateAmendBranchMenu, branchMenuManagementController.amendBranchMenu);

/**
 * @swagger
 * /merchant/menu/{branchId}:
 *   get:
 *     summary: View a branch's menu
 *     tags: [BranchMenuManagement]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Menu retrieved successfully
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
 *                     branchId:
 *                       type: string
 *                     merchantId:
 *                       type: string
 *                     categoryCount:
 *                       type: integer
 *                     itemCount:
 *                       type: integer
 *                     imageCount:
 *                       type: integer
 *                     categories:
 *                       type: array
 *                       items: object
 *                     items:
 *                       type: array
 *                       items: object
 *                     images:
 *                       type: array
 *                       items: object
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Branch or merchant not found
 */
router.get('/:branchId', restrictTo('merchant'), checkPermissions('view_menu'), branchMenuManagementValidator.validateViewBranchMenu, branchMenuManagementController.viewBranchMenu);

module.exports = router;