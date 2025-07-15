'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('@controllers/customer/mtables/bookingController');
const bookingValidator = require('@validators/customer/mtables/bookingValidator');
const bookingsMiddleware = require('@middleware/customer/mtables/bookingsMiddleware');
const { validate } = require('@middleware/common/validationMiddleware');

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Customer table booking management
 */

/**
 * @swagger
 * /customer/mtables/bookings:
 *   post:
 *     summary: Create a new table reservation
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - tableId
 *               - branchId
 *               - date
 *               - time
 *               - partySize
 *             properties:
 *               customerId: { type: integer, example: 1 }
 *               tableId: { type: integer, example: 101 }
 *               branchId: { type: integer, example: 201 }
 *               date: { type: string, format: date, example: "2025-07-01" }
 *               time: { type: string, example: "18:00" }
 *               partySize: { type: integer, example: 4 }
 *               dietaryPreferences: { type: array, items: { type: string, enum: ['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'NUT_FREE', 'DAIRY_FREE', 'HALAL', 'KOSHER', 'LOW_CARB', 'ORGANIC'] }, example: ['VEGETARIAN', 'GLUTEN_FREE'] }
 *               specialRequests: { type: string, example: "Window seat preferred" }
 *               seatingPreference: { type: string, enum: ['NO_PREFERENCE', 'INDOOR', 'OUTDOOR', 'ROOFTOP', 'BALCONY', 'WINDOW', 'BOOTH', 'HIGH_TOP', 'BAR', 'LOUNGE', 'PRIVATE', 'COMMUNAL'], example: "WINDOW" }
 *     responses:
 *       201:
 *         description: Reservation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: object }
 *       400:
 *         description: Invalid input
 */
router.post(
  '/',
  bookingsMiddleware.authenticateCustomer,
  validate(bookingValidator.createReservation),
  bookingController.createReservation
);

/**
 * @swagger
 * /customer/mtables/bookings:
 *   put:
 *     summary: Update an existing reservation
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *             properties:
 *               bookingId: { type: integer, example: 301 }
 *               date: { type: string, format: date, example: "2025-07-01" }
 *               time: { type: string, example: "19:00" }
 *               partySize: { type: integer, example: 5 }
 *               dietaryPreferences: { type: array, items: { type: string, enum: ['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'NUT_FREE', 'DAIRY_FREE', 'HALAL', 'KOSHER', 'LOW_CARB', 'ORGANIC'] }, example: ['VEGAN'] }
 *               specialRequests: { type: string, example: "Allergy information updated" }
 *               seatingPreference: { type: string, enum: ['NO_PREFERENCE', 'INDOOR', 'OUTDOOR', 'ROOFTOP', 'BALCONY', 'WINDOW', 'BOOTH', 'HIGH_TOP', 'BAR', 'LOUNGE', 'PRIVATE', 'COMMUNAL'], example: "BOOTH" }
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 *       400:
 *         description: Invalid input or booking not found
 */
router.put(
  '/',
  bookingsMiddleware.authenticateCustomer,
  validate(bookingValidator.updateReservation),
  bookingController.updateReservation
);

/**
 * @swagger
 * /customer/mtables/bookings/{bookingId}:
 *   delete:
 *     summary: Cancel a reservation
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 301
 *     responses:
 *       200:
 *         description: Reservation cancelled successfully
 *       400:
 *         description: Booking not found or cancellation window expired
 */
router.delete(
  '/:bookingId',
  bookingsMiddleware.authenticateCustomer,
  validate(bookingValidator.cancelBooking),
  bookingController.cancelBooking
);

/**
 * @swagger
 * /customer/mtables/bookings/check-in:
 *   post:
 *     summary: Process check-in for a reservation
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - method
 *             properties:
 *               bookingId: { type: integer, example: 301 }
 *               qrCode: { type: string, example: "ABC123" }
 *               method: { type: string, enum: ['QR_CODE', 'MANUAL', 'NFC'], example: "QR_CODE" }
 *               coordinates: { type: object, properties: { latitude: { type: number }, longitude: { type: number } }, example: { latitude: 40.7128, longitude: -74.0060 } }
 *     responses:
 *       200:
 *         description: Check-in processed successfully
 *       400:
 *         description: Invalid input or check-in failed
 */
router.post(
  '/check-in',
  bookingsMiddleware.authenticateCustomer,
  validate(bookingValidator.processCheckIn),
  bookingController.processCheckIn
);

/**
 * @swagger
 * /customer/mtables/bookings/history:
 *   get:
 *     summary: Retrieve booking history for a customer
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Booking history retrieved successfully
 *       400:
 *         description: Invalid customer ID
 */
router.get(
  '/history',
  bookingsMiddleware.authenticateCustomer,
  validate(bookingValidator.getBookingHistory),
  bookingController.getBookingHistory
);

/**
 * @swagger
 * /customer/mtables/bookings/feedback:
 *   post:
 *     summary: Submit feedback for a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - rating
 *             properties:
 *               bookingId: { type: integer, example: 301 }
 *               rating: { type: integer, minimum: 1, maximum: 5, example: 4 }
 *               comment: { type: string, example: "Great experience!" }
 *     responses:
 *       201:
 *         description: Feedback submitted successfully
 *       400:
 *         description: Invalid input or booking not found
 */
router.post(
  '/feedback',
  bookingsMiddleware.authenticateCustomer,
  validate(bookingValidator.submitBookingFeedback),
  bookingController.submitBookingFeedback
);

module.exports = router;