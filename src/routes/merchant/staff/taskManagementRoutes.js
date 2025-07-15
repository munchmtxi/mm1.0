// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\routes\merchant\staff\taskManagementRoutes.js
'use strict';

const express = require('express');
const router = express.Router();
const taskManagementController = require('@controllers/merchant/staff/taskManagementController');
const taskManagementValidator = require('@validators/merchant/staff/taskManagementValidator');
const taskManagementMiddleware = require('@middleware/merchant/staff/taskManagementMiddleware');

/**
 * @swagger
 * /api/merchant/staff/tasks/{staffId}/allocate:
 *   post:
 *     summary: Allocate a task to a staff member
 *     tags: [Staff Task Management]
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskType:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Task allocated successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:staffId/allocate',
  taskManagementValidator.allocateTaskValidation,
  taskManagementMiddleware.validateRequest,
  taskManagementController.allocateTask,
);

/**
 * @swagger
 * /api/merchant/staff/tasks/{taskId}/progress:
 *   get:
 *     summary: Track task progress
 *     tags: [Staff Task Management]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the task
 *     responses:
 *       200:
 *         description: Task progress retrieved successfully
 *       400:
 *         description: Invalid request
 */
router.get(
  '/:taskId/progress',
  taskManagementValidator.trackTaskProgressValidation,
  taskManagementMiddleware.validateRequest,
  taskManagementController.trackTaskProgress,
);

/**
 * @swagger
 * /api/merchant/staff/tasks/{taskId}/delay:
 *   post:
 *     summary: Notify about delayed tasks
 *     tags: [Staff Task Management]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the task
 *     responses:
 *       200:
 *         description: Delay notification sent successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:taskId/delay',
  taskManagementValidator.notifyTaskDelaysValidation,
  taskManagementMiddleware.validateRequest,
  taskManagementController.notifyTaskDelays,
);

module.exports = router;