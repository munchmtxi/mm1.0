'use strict';

const express = require('express');
const router = express.Router();
const tipController = require('@controllers/driver/wallet/tipController');
const tipValidator = require('@validators/driver/wallet/tipValidator');
const tipMiddleware = require('@middleware/driver/wallet/tipMiddleware');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Driver Tip
 *   description: Driver tip management operations
 */

/**
 * @swagger
 * /driver/wallet/tip/record:
 *   post:
 *     summary: Record a tip received by a driver
 *     tags: [Driver Tip]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - amount
 *             properties:
 *               taskId:
 *                 type: integer
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 maximum: 1000.00
 *     responses:
 *       200:
 *         description: Tip recorded successfully
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
 *         description: Invalid tip amount or task ID
 *       404:
 *         description: Driver or wallet not found
 */
router.post(
  '/tip/record',
  validate(tipValidator.recordTip),
  tipMiddleware.checkDriverExists,
  tipController.recordTip
);

/**
 * @swagger
 * /driver/wallet/tip/history:
 *   get:
 *     summary: Retrieve driver's tip history
 *     tags: [Driver Tip]
 *     responses:
 *       200:
 *         description: Tip history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Driver not found
 */
router.get(
  '/tip/history',
  validate(tipValidator.getTipHistory),
  tipMiddleware.checkDriverExists,
  tipController.getTipHistory
);

/**
 * @swagger
 * /driver/wallet/tip/notify:
 *   post:
 *     summary: Notify driver of a received tip
 *     tags: [Driver Tip]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *             properties:
 *               taskId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Tip notification sent successfully
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
 *       404:
 *         description: Driver or tip not found
 */
router.post(
  '/tip/notify',
  validate(tipValidator.notifyTipReceived),
  tipMiddleware.checkDriverExists,
  tipController.notifyTipReceived
);

/**
 * @swagger
 * /driver/wallet/tip/points:
 *   post:
 *     summary: Award gamification points for receiving a tip
 *     tags: [Driver Tip]
 *     responses:
 *       200:
 *         description: Points awarded successfully
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
 *       404:
 *         description: Driver or recent tip not found
 */
router.post(
  '/tip/points',
  validate(tipValidator.awardTipPoints),
  tipMiddleware.checkDriverExists,
  tipController.awardTipPoints
);

module.exports = router;