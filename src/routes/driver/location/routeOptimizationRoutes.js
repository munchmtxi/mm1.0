'use strict';

const express = require('express');
const router = express.Router();
const routeOptimizationController = require('@controllers/driver/location/routeOptimizationController');
const routeOptimizationValidator = require('@validators/driver/location/routeOptimizationValidator');
const routeOptimizationMiddleware = require('@middleware/driver/location/routeOptimizationMiddleware');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Route Optimization
 *   description: Driver route optimization operations
 */

/**
 * @swagger
 * /driver/location/routes/calculate:
 *   post:
 *     summary: Calculate optimal route
 *     tags: [Route Optimization]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *             properties:
 *               origin:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *               destination:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *     responses:
 *       200:
 *         description: Route calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid coordinates
 */
router.post(
  '/calculate',
  validate(routeOptimizationValidator.calculateRoute),
  routeOptimizationController.calculateRoute
);

/**
 * @swagger
 * /driver/location/routes/{driverId}/{routeId}:
 *   put:
 *     summary: Update route waypoints
 *     tags: [Route Optimization]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               waypoints:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     lat:
 *                       type: number
 *                     lng:
 *                       type: number
 *     responses:
 *       200:
 *         description: Route updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       403:
 *         description: Route not assigned to driver
 */
router.put(
  '/:driverId/:routeId',
  validate(routeOptimizationValidator.updateRoute),
  routeOptimizationMiddleware.checkDriverStatus,
  routeOptimizationController.updateRoute
);

/**
 * @swagger
 * /driver/location/routes/{routeId}:
 *   get:
 *     summary: Get route details
 *     tags: [Route Optimization]
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Route details retrieved successfully
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
 *         description: Route not found
 */
router.get(
  '/:routeId',
  validate(routeOptimizationValidator.getRouteDetails),
  routeOptimizationController.getRouteDetails
);

module.exports = router;