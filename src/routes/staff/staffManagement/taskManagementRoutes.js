'use strict';

const express = require('express');
const router = express.Router();
const taskManagementController = require('@controllers/staff/staffManagement/taskManagementController');
const taskManagementValidator = require('@validators/staff/staffManagement/taskManagementValidator');
const taskManagementMiddleware = require('@middleware/staff/staffManagement/taskManagementMiddleware');

/**
 * @swagger
 * /staff/task/task:
 *   post:
 *     summary: Assign a new task to a staff member
 *     tags: [TaskManagement]
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
 *               - task
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: The ID of the staff member
 *               task:
 *                 type: object
 *                 required:
 *                   - taskType
 *                   - description
 *                   - dueDate
 *                 properties:
 *                   taskType:
 *                     type: string
 *                     description: Type of task (role-specific)
 *                   description:
 *                     type: string
 *                     description: Task description
 *                   dueDate:
 *                     type: string
 *                     format: date-time
 *                     description: Due date of the task (ISO 8601)
 *     responses:
 *       201:
 *         description: Task assigned successfully
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
 *                     branch_id:
 *                       type: integer
 *                     task_type:
 *                       type: string
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *                     due_date:
 *                       type: string
 *                       format: date-time
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
router.post('/task', taskManagementMiddleware.checkTaskPermission, taskManagementValidator.assignTaskValidation, taskManagementController.assignTask);

/**
 * @swagger
 * /staff/task/progress/{taskId}:
 *   get:
 *     summary: Track task completion progress
 *     tags: [TaskManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the task
 *     responses:
 *       200:
 *         description: Task progress retrieved successfully
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
 *                     taskId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     dueDate:
 *                       type: string
 *                       format: date-time
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                 message:
 *                   type: string
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.get('/progress/:taskId', taskManagementMiddleware.checkTaskPermission, taskManagementValidator.trackTaskProgressValidation, taskManagementController.trackTaskProgress);

/**
 * @swagger
 * /staff/task/notify-delay/{taskId}:
 *   post:
 *     summary: Notify staff of a task delay
 *     tags: [TaskManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the task
 *     responses:
 *       200:
 *         description: Task delay notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Task not eligible for delay notification
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.post('/notify-delay/:taskId', taskManagementMiddleware.checkTaskPermission, taskManagementValidator.notifyTaskDelayValidation, taskManagementController.notifyTaskDelay);

module.exports = router;