'use strict';

const express = require('express');
const router = express.Router();
const trainingController = require('@controllers/staff/staffManagement/trainingController');
const trainingValidator = require('@validators/staff/staffManagement/trainingValidator');
const trainingMiddleware = require('@middleware/staff/staffManagement/trainingMiddleware');

/**
 * @swagger
 * /staff/training/distribute:
 *   post:
 *     summary: Distribute a new training to a staff member
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *               - training
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: The ID of the staff member
 *               training:
 *                 type: object
 *                 required:
 *                   - category
 *                   - content
 *                 properties:
 *                   category:
 *                     type: string
 *                     description: Training category (e.g., safety, customer_service)
 *                   content:
 *                     type: string
 *                     description: Training content
 *     responses:
 *       201:
 *         description: Training assigned successfully
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
 *                     id:
 *                       type: integer
 *                     staff_id:
 *                       type: integer
 *                     category:
 *                       type: string
 *                     content:
 *                       type: string
 *                     status:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.post('/distribute', trainingMiddleware.checkTrainingPermission, trainingValidator.distributeTrainingValidation, trainingController.distributeTraining);

/**
 * @swagger
 * /staff/training/progress/{staffId}:
 *   get:
 *     summary: Track training completion progress
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the staff member
 *     responses:
 *       200:
 *         description: Training progress retrieved successfully
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
 *                     staffId:
 *                       type: integer
 *                     trainings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           trainingId:
 *                             type: integer
 *                           category:
 *                             type: string
 *                           status:
 *                             type: string
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                 message:
 *                   type: string
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.get('/progress/:staffId', trainingMiddleware.checkTrainingPermission, trainingValidator.trackTrainingCompletionValidation, trainingController.trackTrainingCompletion);

/**
 * @swagger
 * /staff/training/compliance/{staffId}:
 *   post:
 *     summary: Assess training compliance for a staff member
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the staff member
 *     responses:
 *       200:
 *         description: Training compliance assessed successfully
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
 *                     staffId:
 *                       type: integer
 *                     isCompliant:
 *                       type: boolean
 *                     missing:
 *                       type: array
 *                       items:
 *                         type: string
 *                 message:
 *                   type: string
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.post('/compliance/:staffId', trainingMiddleware.checkTrainingPermission, trainingValidator.assessTrainingComplianceValidation, trainingController.assessTrainingCompliance);

module.exports = router;