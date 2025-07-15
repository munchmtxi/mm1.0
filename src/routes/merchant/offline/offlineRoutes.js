'use strict';

const express = require('express');
const router = express.Router();
const {
  cacheOrdersAuth,
  cacheBookingsAuth,
  syncOfflineDataAuth,
} = require('@middleware/merchant/offline/offlineMiddleware');
const {
  validateCacheOrders,
  validateCacheBookings,
  validateSyncOfflineData,
} = require('@validators/merchant/offline/offlineValidator');
const {
  cacheOrdersController,
  cacheBookingsController,
  syncOfflineDataController,
} = require('@controllers/merchant/offline/offlineController');

/**
 * @swagger
 * /merchant/offline/cache-orders:
 *   post:
 *     summary: Cache orders for offline processing
 *     description: Stores orders in offline cache for later synchronization.
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - orders
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: Merchant ID
 *                 example: 123
 *               orders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - items
 *                     - total_amount
 *                     - customer_id
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                       minItems: 1
 *                     total_amount:
 *                       type: number
 *                       example: 50.00
 *                     customer_id:
 *                       type: integer
 *                       example: 456
 *                     currency:
 *                       type: string
 *                       example: USD
 *     responses:
 *       200:
 *         description: Orders cached
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
 *                   example: 5 orders cached for merchant 123.
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchantId:
 *                       type: integer
 *                       example: 123
 *                     orderCount:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: Invalid order data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Merchant or branch not found
 */
router.post('/cache-orders', cacheOrdersAuth, validateCacheOrders, cacheOrdersController);

/**
 * @swagger
 * /merchant/offline/cache-bookings:
 *   post:
 *     summary: Cache bookings for offline processing
 *     description: Stores bookings in offline cache for later synchronization.
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - bookings
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: Merchant ID
 *                 example: 123
 *               bookings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - booking_date
 *                     - booking_time
 *                     - customer_id
 *                   properties:
 *                     booking_date:
 *                       type: string
 *                       format: date
 *                       example: 2025-06-10
 *                     booking_time:
 *                       type: string
 *                       example: 18:00
 *                     customer_id:
 *                       type: integer
 *                       example: 456
 *     responses:
 *       200:
 *         description: Bookings cached
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
 *                   example: 3 bookings cached for merchant 123.
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchantId:
 *                       type: integer
 *                       example: 123
 *                     bookingCount:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Invalid booking data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Merchant or branch not found
 */
router.post('/cache-bookings', cacheBookingsAuth, validateCacheBookings, cacheBookingsController);

/**
 * @swagger
 * /merchant/offline/sync:
 *   post:
 *     summary: Sync offline data
 *     description: Synchronizes cached orders and bookings to the database.
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: Merchant ID
 *                 example: 123
 *     responses:
 *       200:
 *         description: Data synced
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
 *                   example: Synced 5 orders and 3 bookings for merchant 123.
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchantId:
 *                       type: integer
 *                       example: 123
 *                     orderCount:
 *                       type: integer
 *                       example: 5
 *                     bookingCount:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Merchant not found
 */
router.post('/sync', syncOfflineDataAuth, validateSyncOfflineData, syncOfflineDataController);

module.exports = router;