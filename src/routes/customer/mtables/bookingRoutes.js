'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('@controllers/customer/mtables/bookingController');
const bookingMiddleware = require('@middleware/customer/mtables/bookingMiddleware');
const bookingValidator = require('@validators/customer/mtables/bookingValidator');

/**
 * @swagger
 * /api/customer/mtables/bookings:
 *   post:
 *     summary: Create a reservation
 *     description: Creates a table reservation, processes deposit, sends notifications, logs audit, emits socket event, and awards points.
 *     tags:
 *       - Customer Bookings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tableId
 *               - branchId
 *               - date
 *               - time
 *               - partySize
 *             properties:
 *               tableId: { type: integer, example: 123 }
 *               branchId: { type: integer, example: 456 }
 *               date: { type: string, example: "2025-12-31" }
 *               time: { type: string, example: "18:00" }
 *               partySize: { type: integer, example: 4 }
 *               dietaryPreferences: { type: array, items: { type: string, example: vegetarian } }
 *               specialRequests: { type: string, example: "Window seat" }
 *               seatingPreference: { type: string, example: window }
 *               paymentMethodId: { type: integer, example: 789 }
 *               depositAmount: { type: number, example: 50.00 }
 *     responses:
 *       200:
 *         description: Booking created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Booking created }
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookingId: { type: integer, example: 123 }
 *                     reference: { type: string, example: BK-123456-ABCDEF }
 *                     gamificationError: { type: object, nullable: true }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.post(
  '/',
  bookingMiddleware.verifyCustomer,
  bookingValidator.validateCreateReservation,
  bookingController.createReservation
);

/**
 * @swagger
 * /api/customer/mtables/bookings/{bookingId}/update:
 *   post:
 *     summary: Update a reservation
 *     description: Updates a reservation, sends notifications, logs audit, and emits socket event.
 *     tags:
 *       - Customer Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *         description: Booking ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date: { type: string, example: "2025-12-31" }
 *               time: { type: string, example: "18:00" }
 *               partySize: { type: integer, example: 4 }
 *               dietaryPreferences: { type: array, items: { type: string, example: vegetarian } }
 *               specialRequests: { type: string, example: "Window seat" }
 *               seatingPreference: { type: string, example: window }
 *     responses:
 *       200:
 *         description: Booking updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Booking updated }
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookingId: { type: integer, example: 123 }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.post(
  '/:bookingId/update',
  bookingMiddleware.verifyCustomer,
  bookingValidator.validateUpdateReservation,
  bookingMiddleware.checkBookingAccess,
  bookingController.updateReservation
);

/**
 * @swagger
 * /api/customer/mtables/bookings/{bookingId}/cancel:
 *   post:
 *     summary: Cancel a reservation
 *     description: Cancels a reservation, processes refund if needed, sends notifications, logs audit, and emits socket event.
 *     tags:
 *       - Customer Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Booking cancelled }
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookingId: { type: integer, example: 123 }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.post(
  '/:bookingId/cancel',
  bookingMiddleware.verifyCustomer,
  bookingValidator.validateBookingId,
  bookingMiddleware.checkBookingAccess,
  bookingController.cancelBooking
);

/**
 * @swagger
 * /api/customer/mtables/bookings/{bookingId}/check-in:
 *   post:
 *     summary: Process check-in
 *     description: Processes check-in for a booking, sends notifications, logs audit, emits socket event, and awards points.
 *     tags:
 *       - Customer Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - method
 *             properties:
 *               qrCode: { type: string, example: ABC123 }
 *               method: { type: string, example: qr_code }
 *               coordinates: { type: object, properties: { lat: { type: number }, lng: { type: number } } }
 *     responses:
 *       200:
 *         description: Check-in confirmed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Check-in confirmed }
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookingId: { type: integer, example: 123 }
 *                     gamificationError: { type: object, nullable: true }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.post(
  '/:bookingId/check-in',
  bookingMiddleware.verifyCustomer,
  bookingValidator.validateCheckIn,
  bookingMiddleware.checkBookingAccess,
  bookingController.processCheckIn
);

/**
 * @swagger
 * /api/customer/mtables/bookings/history:
 *   get:
 *     summary: Get booking history
 *     description: Retrieves booking history for a customer.
 *     tags:
 *       - Customer Bookings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Booking history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Booking history retrieved }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bookingId: { type: integer, example: 123 }
 *                       reference: { type: string, example: BK-123456-ABCDEF }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get(
  '/history',
  bookingMiddleware.verifyCustomer,
  bookingController.getBookingHistory
);

/**
 * @swagger
 * /api/customer/mtables/bookings/{bookingId}/feedback:
 *   post:
 *     summary: Submit booking feedback
 *     description: Submits feedback for a booking, sends notifications, logs audit, emits socket event, and awards points.
 *     tags:
 *       - Customer Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating: { type: integer, example: 5 }
 *               comment: { type: string, example: Great experience! }
 *     responses:
 *       200:
 *         description: Feedback submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Feedback submitted }
 *                 data:
 *                   type: object
 *                   properties:
 *                     feedbackId: { type: integer, example: 456 }
 *                     gamificationError: { type: object, nullable: true }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.post(
  '/:bookingId/feedback',
  bookingMiddleware.verifyCustomer,
  bookingValidator.validateSubmitFeedback,
  bookingMiddleware.checkBookingAccess,
  bookingController.submitBookingFeedback
);

/**
 * @swagger
 * /api/customer/mtables/bookings/{bookingId}/party-members:
 *   post:
 *     summary: Add a party member to a booking
 *     description: Adds a friend to a booking, sends notifications, logs audit, and emits socket event.
 *     tags:
 *       - Customer Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - friendCustomerId
 *               - inviteMethod
 *             properties:
 *               friendCustomerId: { type: integer, example: 789 }
 *               inviteMethod: { type: string, example: app }
 *     responses:
 *       200:
 *         description: Party member added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Party member added }
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookingId: { type: integer, example: 123 }
 *                     friendCustomerId: { type: integer, example: 789 }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.post(
  '/:bookingId/party-members',
  bookingMiddleware.verifyCustomer,
  bookingValidator.validateAddPartyMember,
  bookingMiddleware.checkBookingAccess,
  bookingController.addPartyMember
);

/**
 * @swagger
 * /api/customer/mtables/bookings/search:
 *   post:
 *     summary: Search available tables
 *     description: Searches for available tables based on location, date, time, and preferences, logs audit, emits socket event, and awards points.
 *     tags:
 *       - Customer Bookings
 *     security:
 *       - bearerAuth: []
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
 *               coordinates: { type: object, properties: { lat: { type: number }, lng: { type: number } } }
 *               radius: { type: number, example: 5000 }
 *               date: { type: string, example: "2025-12-31" }
 *               time: { type: string, example: "18:00" }
 *               partySize: { type: integer, example: 4 }
 *               seatingPreference: { type: string, example: window }
 *     responses:
 *       200:
 *         description: Tables retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Tables retrieved }
 *                 data:
 *                   type: object
 *                   properties:
 *                     tables: { type: array, items: { type: object, properties: { id: { type: integer }, branchId: { type: integer } } } }
 *                     gamificationError: { type: object, nullable: true }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.post(
  '/search',
  bookingMiddleware.verifyCustomer,
  bookingValidator.validateSearchAvailableTables,
  bookingController.searchAvailableTables
);

module.exports = router;