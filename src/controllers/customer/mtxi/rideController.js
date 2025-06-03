'use strict';

const rideService = require('@services/customer/mtxi/rideService');
const walletService = require('@services/common/walletService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const customerConstants = require('@constants/customer/customerConstants');
const rideConstants = require('@constants/common/rideConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const { sequelize } = require('@models');

async function bookRide(req, res) {
  const { pickupLocation, dropoffLocation, rideType, scheduledTime, friends, billSplit, paymentMethodId } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    const driver = await rideService.findAvailableDriver(pickupLocation);
    const ride = await rideService.createRide(
      {
        customerId,
        driverId: driver.id,
        pickupLocation,
        dropoffLocation,
        rideType,
        scheduledTime,
        friends,
        billSplit,
      },
      transaction
    );

    if (friends?.length) {
      await rideService.addFriendsToRide(ride.id, friends, transaction);
      await notificationService.sendNotification({
        userId: friends,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.friend_request,
        message: formatMessage('friend_invite', { rideId: ride.id }),
      });
    }

    if (billSplit) {
      await rideService.processBillSplit(ride.id, billSplit, transaction);
      try {
        await pointService.awardPoints(customerId, 'split_payment', transaction);
      } catch (error) {
        gamificationError = error.message;
      }
    }

    if (paymentMethodId) {
      await walletService.processTransaction(
        null,
        {
          type: customerConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[1],
          amount: ride.payment?.amount || 100,
          currency: customerConstants.CUSTOMER_SETTINGS.DEFAULT_CURRENCY,
          paymentMethodId,
        },
        transaction
      );
    }

    try {
      await pointService.awardPoints(customerId, 'booking_created', transaction);
    } catch (error) {
      gamificationError = gamificationError || error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_CREATED,
      details: { rideId: ride.id, reference: ride.reference },
      ipAddress: req.ip,
    }, transaction);

    await socketService.emit('ride:booked', { userId: customerId, role: 'customer', rideId: ride.id, reference: ride.reference });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: rideConstants.SUCCESS_MESSAGES[0],
      data: { rideId: ride.id, reference: ride.reference, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || rideConstants.ERROR_CODES[4]);
  }
}

async function updateRide(req, res) {
  const { rideId } = req.params;
  const updateData = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    await rideService.updateRide(rideId, updateData, transaction);
    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { rideId },
      ipAddress: req.ip,
    }, transaction);

    await socketService.emit('ride:updated', { userId: customerId, role: 'customer', rideId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: rideConstants.SUCCESS_MESSAGES[0],
      data: { rideId },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || rideConstants.ERROR_CODES[7]);
  }
}

async function cancelRide(req, res) {
  const { rideId } = req.params;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    await rideService.cancelRide(rideId, transaction);
    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_CANCELLED,
      details: { rideId },
      ipAddress: req.ip,
    }, transaction);

    await socketService.emit('ride:cancelled', { userId: customerId, role: 'customer', rideId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: rideConstants.SUCCESS_MESSAGES[3],
      data: { rideId },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || rideConstants.ERROR_CODES[5]);
  }
}

async function checkInRide(req, res) {
  const { rideId } = req.params;
  const { coordinates } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    await rideService.checkInRide(rideId, coordinates, transaction);
    try {
      await pointService.awardPoints(customerId, 'check_in', transaction);
    } catch (error) {
      gamificationError = error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.CHECK_IN_PROCESSED,
      details: { rideId },
      ipAddress: req.ip,
    }, transaction);

    await socketService.emit('ride:check_in', { userId: customerId, role: 'customer', rideId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Ride check-in confirmed',
      data: { rideId, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || rideConstants.ERROR_CODES[7]);
  }
}

async function getRideHistory(req, res) {
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    const rides = await rideService.getRideHistory(customerId, transaction);
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Ride history retrieved',
      data: rides,
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || rideConstants.ERROR_CODES[7]);
  }
}

async function submitFeedback(req, res) {
  const { rideId } = req.params;
  const { rating, comment } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    const feedback = await rideService.submitFeedback(rideId, { rating, comment }, transaction);
    try {
      await pointService.awardPoints(customerId, 'feedback_submitted', transaction);
    } catch (error) {
      gamificationError = error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.FEEDBACK_SUBMITTED,
      details: { rideId, feedbackId: feedback.id },
    }, transaction);

    await socketService.emit('feedback:feedbackId', { userId: customerId, role: 'customer', rideId, rating });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Feedback submitted',
      data: { feedbackId: feedback.id, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || 'FEEDBACK_SUBMISSION_FAILED');
  }
}

async function addFriend(req, res) {
  const { rideId } = req.params;
  const { friendCustomerId } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    await rideService.addFriendsToRide(rideId, [friendCustomerId], transaction);
    await notificationService.sendNotification({
      userId: friendCustomerId,
      type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.friend_request,
      message: formatMessage('friend_invite', { rideId }),
    });

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PARTY_MEMBER_ADDED,
      details: { rideId, friendCustomerId },
      ipAddress: req.ip,
    }, transaction);

    await socketService.emit('friend:invited', { userId: customerId, role: 'customer', rideId, friendCustomerId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: rideConstants.SUCCESS_MESSAGES[7],
      data: { rideId, friendCustomerId },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || rideConstants.ERROR_CODES[10]);
  }
}

async function processBillSplit(req, res) {
  const { rideId } = req.params;
  const { type, participants } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    await rideService.processBillSplit(rideId, { type, participants }, transaction);
    try {
      await pointService.awardPoints(customerId, 'split_payment', transaction);
    } catch (error) {
      gamificationError = error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PAYMENT_PROCESSED,
      details: { rideId, billSplit: { type, participants } },
      ipAddress: req.ip,
    }, transaction);

    await socketService.emit('bill_split:processed', { userId: customerId, role: 'customer', rideId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: rideConstants.SUCCESS_MESSAGES[8],
      data: { rideId, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || rideConstants.ERROR_CODES[12]);
  }
}

async function getRideDetails(req, res) {
  const { rideId } = req.params;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    const ride = await rideService.getRideById(rideId, transaction);
    if (ride.customerId !== customerId) {
      throw new AppError('Permission denied', 403, rideConstants.ERROR_CODES[2]);
    }
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Ride details retrieved',
      data: ride,
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || rideConstants.ERROR_CODES[1]);
  }
}

async function updateRideStatus(req, res) {
  const { rideId } = req.params;
  const { status } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    const ride = await rideService.getRideById(rideId, transaction);
    if (ride.customerId !== customerId) {
      throw new AppError('Permission denied', 403, rideConstants.ERROR_CODES[2]);
    }
    await rideService.updateRideStatus(rideId, status, transaction);
    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { rideId, status },
      ipAddress: req.ip,
    }, transaction);

    await socketService.emit('ride:updated', { userId: customerId, role: 'customer', rideId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Ride status updated',
      data: { rideId },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || rideConstants.ERROR_CODES[0]);
  }
}

module.exports = {
  bookRide,
  updateRide,
  cancelRide,
  checkInRide,
  getRideHistory,
  submitFeedback,
  addFriend,
  processBillSplit,
  getRideDetails,
  updateRideStatus,
};