'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('@controllers/merchant/mtables/bookingController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const bookingValidator = require('@validators/merchant/mtables/bookingValidator');
const { restrictBookingAccess } = require('@middleware/merchant/mtables/bookingMiddleware');

router.use(authenticate);
router.use(restrictBookingAccess);

/**
 * @swagger
 * /merchant/mtables/bookings/{bookingId}/create:
 *   post:
 *     summary: Create a new table reservation
 *     tags: [MtablesBooking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerId:
 *                 type: string
 *               branchId:
 *                 type: string
 *               tableId:
 *                 type: string
 *               guestCount:
 *                 type: integer
 *               date:
 *                 type: string
 *               time:
 *                 type: string
 *               seatingPreference:
 *                 type: string
 *               dietaryFilters:
 *                 type: array
 *                 items:
 *                   type: string
 *               depositAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Reservation created successfully
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
 *                     bookingId:
 *                       type: string
 *                     reference:
 *                       type: string
 *                     guestCount:
 *                       type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Customer or table not found
 */
router.post('/bookings/:bookingId/create', restrictTo('customer'), checkPermissions('manage_bookings'), bookingValidator.validateCreateReservation, bookingController.createReservation);

/**
 * @swagger
 * /merchant/mtables/waitlist/{branchId}/{customerId}:
 *   post:
 *     summary: Manage waitlist for a branch
 *     tags: [MtablesBooking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch ID
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Waitlist managed successfully
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
 *                     waitlistId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Customer or branch not found
 */
router.post('/waitlist/:branchId/:customerId', restrictTo('customer'), checkPermissions('manage_waitlist'), bookingValidator.validateManageWaitlist, bookingController.manageWaitlist);

/**
 * @swagger
 * /merchant/mtables/merchant/{merchantId}/policies:
 *   post:
 *     summary: Set booking policies for a merchant
 *     tags: [MtablesBooking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellationWindowHours:
 *                 type: integer
 *               depositPercentage:
 *                 type: number
 *     responses:
 *       200:
 *         description: Booking policies updated successfully
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
 *                     merchantId:
 *                       type: string
 *                     policies:
 *                       type: object
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Merchant not found
 */
router.post('/merchant/:merchantId/policies', restrictTo('merchant'), checkPermissions('manage_policies'), bookingValidator.validateSetBookingPolicies, bookingController.setBookingPolicies);

/**
 * @swagger
 * /merchant/mtables/bookings/{bookingId}/update:
 *   post:
 *     summary: Update an existing reservation
 *     tags: [MtablesBooking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking DID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guestCount:
 *                 type: integer
 *               date:
 *                 type: string
 *               time:
 *                 type: string
 *               seatingPreference:
 *                 type: string
 *               dietaryFilters:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Reservation updated successfully
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
 *                     bookingId:
 *                       type: string
 *                     guestCount:
 *                       type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Booking not found
 */
router.post('/bookings/:bookingId/update', restrictTo('customer'), checkPermissions('manage_bookings'), bookingValidator.validateUpdateReservation, bookingController.updateReservation);

module.exports = router;