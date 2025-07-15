'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('@controllers/customer/mpark/bookingController');
const bookingValidator = require('@validators/customer/mpark/bookingValidator');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Customer Mpark Booking
 *   description: Customer parking booking management
 */

/**
 * @swagger
 * /customer/mpark/bookings:
 *   post:
 *     summary: Create a new parking booking
 *     tags: [Customer Mpark Booking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [spaceId, bookingType, startTime, endTime, checkInMethod, vehicleDetails, city]
 *             properties:
 *               spaceId: { type: integer }
 *               bookingType: { type: string, enum: ['HOURLY', 'DAILY', 'ACCESSIBLE'] }
 *               startTime: { type: string, format: date-time }
 *               endTime: { type: string, format: date-time }
 *               checkInMethod: { type: string, enum: ['QR_CODE', 'NFC', 'MANUAL'] }
 *               vehicleDetails: { type: object }
 *               city: { type: string }
 *               merchantId: { type: integer }
 *     responses:
 *       201: { description: Booking created }
 *       400: { description: Invalid input }
 */
router.post('/', validate(bookingValidator.createBooking), bookingController.createBooking);

/**
 * @swagger
 * /customer/mpark/bookings/{bookingId}/cancel:
 *   put:
 *     summary: Cancel a booking
 *     tags: [Customer Mpark Booking]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Booking cancelled }
 *       400: { description: Cancellation not allowed }
 */
router.put('/:bookingId/cancel', validate(bookingValidator.cancelBooking), bookingController.cancelBooking);

/**
 * @swagger
 * /customer/mpark/bookings/{bookingId}/extend:
 *   put:
 *     summary: Extend a booking
 *     tags: [Customer Mpark Booking]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [duration]
 *             properties:
 *               duration: { type: integer }
 *     responses:
 *       200: { description: Booking extended }
 *       400: { description: Extension not allowed }
 */
router.put('/:bookingId/extend', validate(bookingValidator.extendBooking), bookingController.extendBooking);

/**
 * @swagger
 * /customer/mpark/bookings:
 *   get:
 *     summary: Get customer bookings
 *     tags: [Customer Mpark Booking]
 *     responses:
 *       200: { description: Bookings retrieved }
 *       400: { description: Failed to retrieve bookings }
 */
router.get('/', bookingController.getCustomerBookings);

/**
 * @swagger
 * /customer/mpark/bookings/{bookingId}/check-in:
 *   put:
 *     summary: Check in to a booking
 *     tags: [Customer Mpark Booking]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [method, location]
 *             properties:
 *               method: { type: string, enum: ['QR_CODE', 'NFC', 'MANUAL'] }
 *               location: { type: object }
 *     responses:
 *       200: { description: Checked in }
 *       400: { description: Check-in failed }
 */
router.put('/:bookingId/check-in', validate(bookingValidator.checkInBooking), bookingController.checkInBooking);

/**
 * @swagger
 * /customer/mpark/bookings/search:
 *   get:
 *     summary: Search available parking
 *     tags: [Customer Mpark Booking]
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         required: true
 *         schema: { type: string, enum: ['STANDARD', 'ACCESSIBLE', 'EV'] }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: Available spaces retrieved }
 *       400: { description: Invalid input }
 */
router.get('/search', validate(bookingValidator.searchAvailableParking), bookingController.searchAvailableParking);

/**
 * @swagger
 * /customer/mpark/bookings/subscription:
 *   post:
 *     summary: Create a subscription-based booking
 *     tags: [Customer Mpark Booking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subscriptionId, spaceId, bookingType, startTime, endTime, checkInMethod, vehicleDetails, city]
 *             properties:
 *               subscriptionId: { type: string }
 *               spaceId: { type: integer }
 *               bookingType: { type: string, enum: ['HOURLY', 'DAILY', 'ACCESSIBLE'] }
 *               startTime: { type: string, format: date-time }
 *               endTime: { type: string, format: date-time }
 *               checkInMethod: { type: string, enum: ['QR_CODE', 'NFC', 'MANUAL'] }
 *               vehicleDetails: { type: object }
 *               city: { type: string }
 *               merchantId: { type: integer }
 *     responses:
 *       201: { description: Subscription booking created }
 *       400: { description: Invalid input }
 */
router.post('/subscription', validate(bookingValidator.createSubscriptionBooking), bookingController.createSubscriptionBooking);

module.exports = router;