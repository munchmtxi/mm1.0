'use strict';

const express = require('express');
const router = express.Router();
const {
  updateBranchDetailsAuth,
  configureBranchSettingsAuth,
  manageBranchMediaAuth,
  syncBranchProfilesAuth,
} = require('@middleware/merchant/profile/branchProfileMiddleware');
const {
  validateUpdateBranchDetails,
  validateConfigureBranchSettings,
  validateManageBranchMedia,
  validateSyncBranchProfiles,
} = require('@validators/merchant/profile/branchProfileValidator');
const {
  updateBranchDetailsController,
  configureBranchSettingsController,
  manageBranchMediaController,
  syncBranchProfilesController,
} = require('@controllers/merchant/profile/branchProfileController');
const upload = require('@utils/multer');

/**
 * @swagger
 * /merchant/profile/branch/{branchId}/details:
 *   patch:
 *     summary: Update branch details
 *     description: Updates branch operating hours, location, or contact phone.
 *     tags: [BranchProfile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               operatingHours:
 *                 type: object
 *                 properties:
 *                   open:
 *                     type: string
 *                     example: 09:00
 *                   close:
 *                     type: string
 *                     example: 22:00
 *               location:
 *                 type: object
 *                 properties:
 *                   countryCode:
 *                     type: string
 *                     example: US
 *                   city:
 *                     type: string
 *                     example: New York
 *               contactPhone:
 *                 type: string
 *                 example: +1234567890
 *     responses:
 *       200:
 *         description: Branch details updated
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
 *                   example: Branch 123 details updated successfully.
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Branch not found
 */
router.patch(
  '/branch/:branchId/details',
  updateBranchDetailsAuth,
  validateUpdateBranchDetails,
  updateBranchDetailsController
);

/**
 * @swagger
 * /merchant/profile/branch/{branchId}/settings:
 *   patch:
 *     summary: Configure branch settings
 *     description: Configures branch currency and language settings.
 *     tags: [BranchProfile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currency:
 *                 type: string
 *                 example: USD
 *               language:
 *                 type: string
 *                 example: en
 *     responses:
 *       200:
 *         description: Branch settings updated
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
 *                   example: Branch 123 settings configured successfully.
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Branch not found
 */
router.patch(
  '/branch/:branchId/settings',
  configureBranchSettingsAuth,
  validateConfigureBranchSettings,
  configureBranchSettingsController
);

/**
 * @swagger
 * /merchant/profile/branch/{branchId}/media:
 *   post:
 *     summary: Upload branch media
 *     description: Uploads branch-specific media (e.g., photos, videos).
 *     tags: [BranchProfile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               type:
 *                 type: string
 *                 example: jpg
 *     responses:
 *       200:
 *         description: Media uploaded
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
 *                   example: Media uploaded for branch 123.
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                       example: /uploads/123.jpg
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Branch not found
 */
router.post(
  '/branch/:branchId/media',
  manageBranchMediaAuth,
  upload.single('file'),
  validateManageBranchMedia,
  manageBranchMediaController
);

/**
 * @swagger
 * /merchant/profile/sync/{merchantId}:
 *   post:
 *     summary: Sync branch profiles
 *     description: Ensures consistency across multiple branch profiles.
 *     tags: [BranchProfile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Merchant ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Branches synced
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
 *                   example: Merchant 123 branches synchronized successfully.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Merchant or branches not found
 */
router.post(
  '/sync/:merchantId',
  syncBranchProfilesAuth,
  validateSyncBranchProfiles,
  syncBranchProfilesController
);

module.exports = router;