'use strict';

const express = require('express');
const router = express.Router();
const rideController = require('@controllers/driver/mtxi/rideController');
const { authenticate, restrictTo } = require('@middleware/common/authMiddleware');
const { restrictRideDriver } = require('@middleware/driver/mtxi/rideMiddleware');
const { validateRideId, validateRideStatus, validateDeclineRide, validateDriverReport } = require('@validators/driver/mtxi/rideValidator');

router.use(authenticate, restrictTo('driver'));

router.post('/:rideId/accept', restrictRideDriver, validateRideId, rideController.acceptRide);
router.post('/:rideId/decline', restrictRideDriver, validateDeclineRide, rideController.declineRide);
router.patch('/:rideId/status', restrictRideDriver, validateRideStatus, rideController.updateRideStatus);
router.get('/report', validateDriverReport, rideController.getDriverReport);
router.get('/:rideId/payment', restrictRideDriver, validateRideId, rideController.getRidePayment); // Added

module.exports = router;