'use strict';

const express = require('express');
const router = express.Router();
const parkingController = require('@controllers/customer/mpark/parkingController');
const parkingValidator = require('@validators/customer/mpark/parkingValidator');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Customer Mpark Parking
 *   description: Customer parking management
 */

/**
 * @swagger
 * /customer/mpark/parking/nearby:
 *   get:
 *     summary: List nearby parking spaces
 *     tags: [Customer Mpark Parking]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200: { description: Nearby spaces retrieved }
 *       400: { description: Invalid location }
 */
router.get('/nearby', validate(parkingValidator.listNearbyParking), parkingController.listNearbyParking);

/**
 * @swagger
 * /customer/mpark/parking/{lotId}:
 *   get:
 *     summary: Get parking lot details
 *     tags: [Customer Mpark Parking]
 *     parameters:
 *       - in: path
 *         name: lotId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Lot details retrieved }
 *       400: { description: Invalid lot ID }
 */
router.get('/:lotId', validate(parkingValidator.getParkingLotDetails), parkingController.getParkingLotDetails);

/**
 * @swagger
 * /customer/mpark/parking/reserve:
 *   post:
 *     summary: Reserve a parking space
 *     tags: [Customer Mpark Parking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lotId, spaceId, duration, city]
 *             properties:
 *               lotId: { type: integer }
 *               spaceId: { type: integer }
 *               duration: { type: integer }
 *               city: { type: string }
 *     responses:
 *       201: { description: Parking reserved }
 *       400: { description: Invalid input }
 */
router.post('/reserve', validate(parkingValidator.reserveParking), parkingController.reserveParking);

/**
 * @swagger
 * /customer/mpark/parking/availability:
 *   get:
 *     summary: Check parking availability
 *     tags: [Customer Mpark Parking]
 *     parameters:
 *       - in: query
 *         name: lotId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: Availability retrieved }
 *       400: { description: Invalid input }
 */
router.get('/availability', validate(parkingValidator.checkParkingAvailability), parkingController.checkParkingAvailability);

/**
 * @swagger
 * /customer/mpark/parking/subscription:
 *   put:
 *     summary: Manage parking subscription
 *     tags: [Customer Mpark Parking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, plan]
 *             properties:
 *               action: { type: string, enum: ['create', 'renew', 'cancel'] }
 *               plan: { type: string }
 *     responses:
 *       200: { description: Subscription managed }
 *       400: { description: Invalid input }
 */
router.put('/subscription', validate(parkingValidator.manageParkingSubscription), parkingController.manageParkingSubscription);

/**
 * @swagger
 * /customer/mpark/parking/subscription/status:
 *   get:
 *     summary: Get subscription status
 *     tags: [Customer Mpark Parking]
 *     responses:
 *       200: { description: Subscription status retrieved }
 *       400: { description: Failed to retrieve status }
 */
router.get('/subscription/status', validate(parkingValidator.getSubscriptionStatus), parkingController.getSubscriptionStatus);

module.exports = router;