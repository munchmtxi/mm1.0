'use strict';

const express = require('express');
const router = express.Router();
const menuManagementController = require('@controllers/merchant/menu/menuManagementController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const menuManagementValidator = require('@validators/merchant/menu/menuManagementValidator');
const { restrictMenuAccess } = require('@middleware/merchant/menu/menuManagementMiddleware');

router.use(authenticate);
router.use(restrictMenuAccess);

/**
 * @swagger
 * /merchant/menu/{restaurantId}/create:
 *   post:
 *     summary: Create a new menu for a restaurant
 *     tags: [MenuManagement]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
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
 *                     name: string
 *                     price: number
 *                     category: string
 *                     description: string
 *                     availabilityStatus: string
 *                     isPublished: boolean
 *                     branchId: string
 *               categories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name: string
 *                     description: string
 *                     parentId: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url: string
 *                     title: string
 *               modifiers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemName: string
 *                     type: string
 *                     name: string
 *                     priceAdjustment: number
 *                     isRequired: boolean
 *               attributes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemName: string
 *                     type: string
 *                     value: string
 *     responses:
 *       200:
 *         description: Menu created successfully
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
 *                     restaurantId:
 *                       type: string
 *                     itemCount:
 *                       type: integer
 *                     categoryCount:
 *                       type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Merchant not found
 */
router.post('/:restaurantId/create', restrictTo('merchant'), checkPermissions('manage_menu'), menuManagementValidator.validateCreateMenu, menuManagementController.createMenu);

/**
 * @swagger
 * /merchant/menu/{menuId}/update:
 *   patch:
 *     summary: Update a menu item
 *     tags: [MenuManagement]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               categoryId:
 *                 type: string
 *               description:
 *                 type: string
 *               availabilityStatus:
 *                 type: string
 *               isPublished:
 *                 type: boolean
 *               modifiers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type: string
 *                     name: string
 *                     priceAdjustment: number
 *                     isRequired: boolean
 *               attributes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type: string
 *                     value: string
 *     responses:
 *       200:
 *         description: Menu item updated successfully
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
 *                     menuId:
 *                       type: string
 *                     restaurantId:
 *                       type: string
 *                     itemName:
 *                       type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Menu item or merchant not found
 */
router.patch('/:menuId/update', restrictTo('merchant'), checkPermissions('manage_menu'), menuManagementValidator.validateUpdateMenu, menuManagementController.updateMenu);

/**
 * @swagger
 * /merchant/menu/{menuId}/pricing:
 *   post:
 *     summary: Apply dynamic pricing to a menu item
 *     tags: [MenuManagement]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed_amount, buy_x_get_y, bundle, loyalty, flash_sale]
 *               value:
 *                 type: number
 *               name:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               minPurchaseAmount:
 *                 type: number
 *               customerEligibility:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dynamic pricing applied successfully
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
 *                     menuId:
 *                       type: string
 *                     promotionId:
 *                       type: string
 *                     restaurantId:
 *                       type: string
 *                     promotionType:
 *                       type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input or promotion type
 *       404:
 *         description: Menu item or merchant not found
 */
router.post('/:menuId/pricing', restrictTo('merchant'), checkPermissions('manage_menu'), menuManagementValidator.validateApplyDynamicPricing, menuManagementController.applyDynamicPricing);

module.exports = router;