'use strict';

const express = require('express');
const router = express.Router();
const { searchTables } = require('@controllers/customer/mtables/tableSearchController');
const { tableSearchSchema } = require('@validators/customer/mtables/tableSearchValidator');
const validate = require('@middleware/validate');

/** Routes for table search */
router.post(
  '/search',
  validate(tableSearchSchema),
  searchTables
  /**
   * @swagger
   * /customer/mtables/search:
   *   post:
   *     summary: Search for available tables
   *     tags: [Customer, MTables]
   *     description: Searches for available tables based on location, date, time, party size, and seating preference.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - coordinates
   *               - radius
   *               - date
   *               - time
   *               - partySize
   *             properties:
   *               coordinates:
   *                 type: object
   *                 properties:
   *                   lat:
   *                     type: number
   *                     example: 40.7128
   *                   lng:
   *                     type: number
   *                     example: -74.0060
   *               radius:
   *                 type: number
   *                 example: 5000
   *               date:
   *                 type: string
   *                 format: date
   *                 example: "2025-07-10"
   *               time:
   *                 type: string
   *                 pattern: ^([0-1][0-9]|2[0-3]):[0-5][0-9]$
   *                 example: "18:30"
   *               partySize:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 20
   *                 example: 4
   *               seatingPreference:
   *                 type: string
   *                 enum: [indoor, outdoor, bar, private, no_preference]
   *                 example: indoor
   *     responses:
   *       200:
   *         description: Successfully retrieved available tables
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       branch:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *                       capacity:
   *                         type: integer
   *                       section:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *       400:
   *         description: Invalid input
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 error:
   *                   type: string
   */
);

module.exports = router;