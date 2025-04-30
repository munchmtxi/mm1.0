'use strict';

const express = require('express');
const rideController = require('@controllers/admin/mtxi/rideController');
const rideValidator = require('@validators/admin/mtxi/rideValidator');
const rideMiddleware = require('@middleware/admin/mtxi/rideMiddleware');
const authMiddleware = require('@middleware/common/authMiddleware');
const PERMISSIONS = require('@constants/admin/permissions');

const router = express.Router();

router.use(authMiddleware.authenticate);

router.get(
  '/:rideId',
  rideMiddleware.restrictToRideAdmin(PERMISSIONS.VIEW_RIDE),
  rideValidator.validateRideId,
  rideMiddleware.checkRideExists,
  rideController.getRideDetails
);

router.get(
  '/:rideId/track-driver',
  rideMiddleware.restrictToRideAdmin(PERMISSIONS.TRACK_DRIVER),
  rideValidator.validateRideId,
  rideMiddleware.checkRideExists,
  rideController.trackDriverLocation
);

router.get(
  '/:rideId/payments',
  rideMiddleware.restrictToRideAdmin(PERMISSIONS.VIEW_RIDE, PERMISSIONS.MANAGE_PAYMENTS),
  rideValidator.validateRideId,
  rideMiddleware.checkRideExists,
  rideController.getRidePayments
);

router.get(
  '/analytics',
  rideMiddleware.restrictToRideAdmin(PERMISSIONS.VIEW_RIDE),
  rideValidator.validateRideAnalytics,
  rideController.getRideAnalytics
);

router.get(
  '/live-trips',
  rideMiddleware.restrictToRideAdmin(PERMISSIONS.VIEW_RIDE),
  rideController.getLiveTripMetrics
);

router.post(
  '/:rideId/status',
  rideMiddleware.restrictToRideAdmin(PERMISSIONS.MANAGE_RIDE),
  rideValidator.validateRideId,
  rideMiddleware.checkRideExists,
  rideController.updateRideStatus
);

router.post(
  '/:rideId/dispute',
  rideMiddleware.restrictToRideAdmin(PERMISSIONS.MANAGE_RIDE),
  rideValidator.validateRideDispute,
  rideMiddleware.checkRideExists,
  rideController.handleRideDispute
);

router.post(
  '/:rideId/assign-driver',
  rideMiddleware.restrictToRideAdmin(PERMISSIONS.ASSIGN_DRIVER),
  rideValidator.validateAssignDriver,
  rideMiddleware.checkRideExists,
  rideController.assignDriverToRide
);

router.post(
  '/:rideId/alert',
  rideMiddleware.restrictToRideAdmin(PERMISSIONS.MANAGE_RIDE),
  rideValidator.validateRideAlert,
  rideMiddleware.checkRideExists,
  rideController.handleRideAlert
);

router.post(
  '/payments/:paymentId/dispute',
  rideMiddleware.restrictToRideAdmin(PERMISSIONS.MANAGE_PAYMENTS),
  rideValidator.validatePaymentDispute,
  rideMiddleware.checkPaymentExists,
  rideController.disputePayment
);

router.get(
  '/payments/analyze',
  rideMiddleware.restrictToRideAdmin(PERMISSIONS.MANAGE_PAYMENTS),
  rideValidator.validatePaymentAnalysis,
  rideController.analyzePayments
);

module.exports = router;