'use strict';

const express = require('express');
const router = express.Router();
const {
  uploadMenuPhotosAuth,
  managePromotionalMediaAuth,
  updateMediaMetadataAuth,
  deleteMediaAuth,
} = require('@middleware/merchant/profile/merchantMediaMiddleware');
const {
  validateUploadMenuPhotos,
  validateManagePromotionalMedia,
  validateUpdateMediaMetadata,
  validateDeleteMedia,
} = require('@validators/merchant/profile/merchantMediaValidator');
const {
  uploadMenuPhotosController,
  managePromotionalMediaController,
  updateMediaMetadataController,
  deleteMediaController,
} = require('@controllers/merchant/profile/merchantMediaController');
const upload = require('@utils/multer');

/**
 * @swagger
 * /merchant/profile/media/{restaurantId}/menu:
 *   post:
 *     summary: Upload menu photos
 *     description: Uploads dish photos for a restaurant menu.
 *     tags: [MerchantMedia]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
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
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Menu photos uploaded
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
 *                   example: Menu photos uploaded for branch 123.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: /uploads/menu123.jpg
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
  '/media/:restaurantId/menu',
  uploadMenuPhotosAuth,
  upload.array('files', 10),
  validateUploadMenuPhotos,
  uploadMenuPhotosController
);

/**
 * @swagger
 * /merchant/profile/media/{restaurantId}/promotional:
 *   post:
 *     summary: Upload promotional media
 *     description: Uploads promotional media (e.g., banners, videos) for a restaurant.
 *     tags: [MerchantMedia]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
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
 *                 example: banner
 *     responses:
 *       200:
 *         description: Promotional media uploaded
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
 *                   example: Promotional media uploaded for branch 123.
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                       example: /uploads/promo123.jpg
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
  '/media/:restaurantId/promotional',
  managePromotionalMediaAuth,
  upload.single('file'),
  validateManagePromotionalMedia,
  managePromotionalMediaController
);

/**
 * @swagger
 * /merchant/profile/media/{mediaId}/metadata:
 *   patch:
 *     summary: Update media metadata
 *     description: Edits media metadata (e.g., title, description).
 *     tags: [MerchantMedia]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Media ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Summer Menu
 *               description:
 *                 type: string
 *                 example: New seasonal dishes
 *     responses:
 *       200:
 *         description: Media metadata updated
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
 *                   example: Media metadata updated for media 456.
 *                 data:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Media not found
 */
router.patch(
  '/media/:mediaId/metadata',
  updateMediaMetadataAuth,
  validateUpdateMediaMetadata,
  updateMediaMetadataController
);

/**
 * @swagger
 * /merchant/profile/media/{mediaId}:
 *   delete:
 *     summary: Delete media
 *     description: Removes outdated media.
 *     tags: [MerchantMedia]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Media ID
 *     responses:
 *       200:
 *         description: Media deleted
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
 *                   example: Media 456 deleted successfully.
 *                 data:
 *                   type: null
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Media not found
 */
router.delete(
  '/media/:mediaId',
  deleteMediaAuth,
  validateDeleteMedia,
  deleteMediaController
);

module.exports = router;