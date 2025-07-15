'use strict';

const express = require('express');
const router = express.Router();
const profileController = require('@controllers/driver/profile/profileController');
const profileValidator = require('@validators/driver/profile/profileValidator');
const profileMiddleware = require('@middleware/driver/profile/profileMiddleware');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Driver Profile
 *   description: Driver profile management operations
 */

/**
 * @swagger
 * /driver/profile:
 *   put:
 *     summary: Update driver profile
 *     tags: [Driver Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               vehicleType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Driver not found
 */
router.put(
  '/',
  validate(profileValidator.updateProfile),
  profileController.updateProfile
);

/**
 * @swagger
 * /driver/profile/certification:
 *   post:
 *     summary: Upload driver certification
 *     tags: [Driver Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: ['driver_license', 'insurance']
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Certification uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid certification type or file
 *       404:
 *         description: Driver not found
 */
router.post(
  '/certificate',
  profileMiddleware.uploadCertificationFile,
  validate(profileValidator.uploadCertificate),
  profileController.uploadCertificate
);

/**
 * @swagger
 * /driver/profile:
 *   get:
 *     summary: Get driver profile
 *     tags: [Driver Profile]
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *       404:
 *         description: Driver not found
 */
router.get(
  '/',
  validate(profileValidator.getProfile),
  profileController.getProfile
);

/**
 * @swagger
 * /driver/profile/verify:
 *   post:
 *     summary: Verify driver profile
 *     tags: [Driver Profile]
 *     responses:
 *       200:
 *         description: Profile verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Driver not found
 */
router.post(
  '/verify',
  validate(profileValidator.verifyProfile),
  profileController.verifyProfile
);

module.exports = router;