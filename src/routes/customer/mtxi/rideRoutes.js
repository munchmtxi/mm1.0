'use strict';

const express = require('express');
const router = express.Router();
const rideController = require('@controllers/customer/mtxi/rideController');
const authMiddleware = require('@middleware/common/authMiddleware');
const customerRideMiddleware = require('@middleware/customer/mtxi/customerRideMiddleware');

// Protect all routes and restrict to customer role
router.use(authMiddleware.authenticate, authMiddleware.restrictTo('customer'));

router.post('/', customerRideMiddleware.validateRideRequest, rideController.requestRide);
router.put('/:rideId/cancel', customerRideMiddleware.validateRideCancellation, rideController.cancelRide);
router.post('/:rideId/participants', customerRideMiddleware.validateParticipantInvitation, rideController.inviteParticipant);
router.post('/:rideId/stops', customerRideMiddleware.validateRideStop, rideController.addRideStop);
router.post('/:rideId/reviews', customerRideMiddleware.validateRideReview, rideController.submitRideReview);
router.post('/:rideId/support-tickets', customerRideMiddleware.validateSupportTicket, rideController.createSupportTicket);
router.post('/:rideId/messages', customerRideMiddleware.validateRideMessage, rideController.sendRideMessage);
router.get('/:rideId/driver', customerRideMiddleware.validateDriverInfo, rideController.getDriverInfo);
router.put('/:rideId/status', customerRideMiddleware.validateRideStatusUpdate, rideController.updateRideStatus);
router.get('/:rideId', customerRideMiddleware.validateDriverInfo, rideController.getRideDetails);
router.get('/history', rideController.getCustomerHistory);
router.get('/faqs', rideController.getFAQs);

module.exports = router;