'use strict';

const express = require('express');
const router = express.Router();
const rideController = require('@controllers/customer/mtxi/rideController');
const rideValidation = require('@middleware/customer/mtxi/rideValidation');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Rides
 *   description: Customer ride management for mtxi service
 */
router.use(authenticate, restrictTo('customer'));

/**
 * @swagger
 * /api/customer/mtxi/rides:
 *   post:
 *     summary: Create a new ride
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickupLocation
 *               - dropoffLocation
 *               - rideType
 *             properties:
 *               pickupLocation:
 *                 type: object
 *                 description: Pickup coordinates or address
 *               dropoffLocation:
 *                 type: object
 *                 description: Dropoff coordinates or address
 *               rideType:
 *                 type: string
 *                 enum: [standard, shared]
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *               friends:
 *                 type: array
 *                 items:
 *                   type: integer
 *               billSplit:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [equal, custom]
 *                   participants:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         customerId:
 *                           type: integer
 *                         amount:
 *                           type: number
 *               paymentMethodId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Ride booked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     rideId:
 *                       type: integer
 *                     reference:
 *                       type: string
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: Ride booking failed
 */
router
  .route('/')
  .post(
    checkPermissions('create_ride'),
    rideValidation.validateBookRide,
    rideController.bookRide
  );

/**
 * @swagger
 * /api/customer/mtxi/rides/history:
 *   get:
 *     summary: Retrieve ride history
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ride history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rideId:
 *                         type: integer
 *                       reference:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: Ride history retrieval failed
 */
router
  .route('/history')
  .get(
    checkPermissions('view_ride'),
    rideController.getRideHistory
  );

/**
 * @swagger
 * /api/customer/mtxi/rides/{rideId}/update:
 *   post:
 *     summary: Update a ride
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pickupLocation:
 *                 type: object
 *               dropoffLocation:
 *                 type: object
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *               friends:
 *                 type: array
 *                 items:
 *                   type: integer
 *               billSplit:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [equal, custom]
 *                   participants:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         customerId:
 *                           type: integer
 *                         amount:
 *                           type: number
 *     responses:
 *       200:
 *         description: Ride updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     rideId:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: Ride update failed
 */
router
  .route('/:rideId/update')
  .post(
    checkPermissions('update_ride'),
    rideValidation.validateUpdateRide,
    rideController.updateRide
  );

/**
 * @swagger
 * /api/customer/mtxi/rides/{rideId}/cancel:
 *   post:
 *     summary: Cancel a ride
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ride cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     rideId:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: Ride cancellation failed
 */
router
  .route('/:rideId/cancel')
  .post(
    checkPermissions('cancel_ride'),
    rideValidation.validateCancelRide,
    rideController.cancelRide
  );

/**
 * @swagger
 * /api/customer/mtxi/rides/{rideId}/check-in:
 *   post:
 *     summary: Check-in for a ride
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coordinates
 *             properties:
 *               coordinates:
 *                 type: object
 *                 description: Geolocation coordinates
 *     responses:
 *       200:
 *         description: Ride check-in confirmed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     rideId:
 *                       type: integer
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: Check-in failed
 */
router
  .route('/:rideId/check-in')
  .post(
    checkPermissions('check_in_ride'),
    rideValidation.validateCheckInRide,
    rideController.checkInRide
  );

/**
 * @swagger
 * /api/customer/mtxi/rides/{rideId}/feedback:
 *   post:
 *     summary: Submit feedback for a ride
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Feedback submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     feedbackId:
 *                       type: integer
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: Feedback submission failed
 */
router
  .route('/:rideId/feedback')
  .post(
    checkPermissions('submit_feedback'),
    rideValidation.validateFeedback,
    rideController.submitFeedback
  );

/**
 * @swagger
 * /api/customer/mtxi/rides/{rideId}/friends:
 *   post:
 *     summary: Add a friend to a ride
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - friendCustomerId
 *             properties:
 *               friendCustomerId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Friend invited
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     rideId:
 *                       type: integer
 *                     friendCustomerId:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: Invalid friend invite
 */
router
  .route('/:rideId/friends')
  .post(
    checkPermissions('add_friend'),
    rideValidation.validateAddFriend,
    rideController.addFriend
  );

/**
 * @swagger
 * /api/customer/mtxi/rides/{rideId}/bill-split:
 *   post:
 *     summary: Process bill split for a ride
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - participants
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [equal, custom]
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: integer
 *                     amount:
 *                       type: number
 *     responses:
 *       200:
 *         description: Bill split processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     rideId:
 *                       type: integer
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: Invalid bill split
 */
router
  .route('/:rideId/bill-split')
  .post(
    checkPermissions('split_bill'),
    rideValidation.validateBillSplit,
    rideController.processBillSplit
  );

/**
 * @swagger
 * /api/customer/mtxi/rides/{rideId}:
 *   get:
 *     summary: Get ride details
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ride details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     rideId:
 *                       type: integer
 *                     customerId:
 *                       type: integer
 *                     driverId:
 *                       type: integer
 *                     pickupLocation:
 *                       type: object
 *                     dropoffLocation:
 *                       type: object
 *                     rideType:
 *                       type: string
 *                     status:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Ride not found
 */
router
  .route('/:rideId')
  .get(
    checkPermissions('view_ride'),
    rideValidation.validateCancelRide,
    rideController.getRideDetails
  );

/**
 * @swagger
 * /api/customer/mtxi/rides/{rideId}/status:
 *   post:
 *     summary: Update ride status
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, accepted, in_progress, completed, cancelled]
 *     responses:
 *       200:
 *         description: Ride status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     rideId:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: Invalid status
 */
router
  .route('/:rideId/status')
  .post(
    checkPermissions('update_ride'),
    rideValidation.validateCancelRide,
    rideController.updateRideStatus
  );

module.exports = router;