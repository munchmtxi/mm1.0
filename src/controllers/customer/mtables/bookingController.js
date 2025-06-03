'use strict';

const { sequelize } = require('@models');
const {
  createReservation,
  updateReservation,
  cancelBooking,
  processCheckIn,
  getBookingHistory,
  submitBookingFeedback,
  addPartyMember,
  searchAvailableTables,
} = require('@services/customer/mtables/bookingService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const paymentService = require('@services/customer/mtables/paymentService');
const { formatMessage } = require('@utils/localization/localization');
const mtablesConstants = require('@constants/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const { Customer } = require('@models');

const createReservation = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { tableId, branchId, date, time, partySize, dietaryPreferences, specialRequests, seatingPreference, paymentMethodId, depositAmount } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Creating reservation', { customerId, tableId, branchId });

  const transaction = await sequelize.transaction();
  try {
    const { booking } = await createReservation({
      customerId,
      tableId,
      branchId,
      date,
      time,
      partySize,
      dietaryPreferences,
      specialRequests,
      seatingPreference,
      transaction,
    });

    if (depositAmount && paymentMethodId) {
      const customer = await Customer.findByPk(customerId, { transaction });
      const wallet = await sequelize.models.Wallet.findOne({ where: { user_id: customer.user_id }, transaction });
      if (!wallet) throw new Error('Wallet not found');
      const paymentResult = await paymentService.processPayment({
        id: booking.id,
        amount: depositAmount,
        walletId: wallet.id,
        paymentMethodId,
        type: 'booking',
        transaction,
      });
      await booking.update({ details: { ...booking.details, depositTransactionId: paymentResult.payment.transaction_id } }, { transaction });
    }

    const customer = await Customer.findByPk(customerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'booking.created',
      params: { tableId, branchId, date, time },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.booking_confirmation,
        message,
        priority: 'HIGH',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_CREATED,
        details: { bookingId: booking.id, tableId, branchId, depositAmount },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'booking:created', {
      userId: customer.user_id,
      role: 'customer',
      bookingId: booking.id,
      reference: booking.reference,
    });

    try {
      const action = customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(a => a.action === 'booking_created');
      await gamificationService.awardPoints(
        {
          userId: customer.user_id,
          action: action.action,
          points: action.points,
          metadata: { io, role: 'customer', bookingId: booking.id },
        },
        transaction
      );
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES[0],
      data: { bookingId: booking.id, reference: booking.reference, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Reservation creation failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.BOOKING_CREATION_FAILED));
  }
});

const updateReservation = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { bookingId } = req.params;
  const { date, time, partySize, dietaryPreferences, specialRequests, seatingPreference } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');

  logger.info('Updating reservation', { customerId, bookingId });

  const transaction = await sequelize.transaction();
  try {
    const booking = await updateReservation({
      bookingId,
      date,
      time,
      partySize,
      dietaryPreferences,
      specialRequests,
      seatingPreference,
      transaction,
    });

    const customer = await Customer.findByPk(customerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'booking.updated',
      params: { tableId: booking.table_id, branchId: booking.branch_id, date: booking.booking_date, time: booking.booking_time },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.booking_confirmation,
        message,
        priority: 'MEDIUM',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
        details: { bookingId, partySize, date, time },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'booking:updated', {
      userId: customer.user_id,
      role: 'customer',
      bookingId,
    });

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES[1],
      data: { bookingId: booking.id },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Reservation update failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.BOOKING_UPDATE_FAILED));
  }
});

const cancelBooking = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { bookingId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('io');

  logger.info('Cancelling booking', { customerId, bookingId });

  const transaction = await sequelize.transaction();
  try {
    const { booking } = await cancelBooking({ bookingId, transaction });

    if (booking.details?.depositTransactionId) {
      const customer = await Customer.findByPk(customerId, { transaction });
      const wallet = await sequelize.models.Wallet.findOne({ where: { user_id: customer.user_id }, transaction });
      if (wallet) {
        await paymentService.issueRefund({
          id: booking.id,
          walletId: wallet.id,
          transactionId: booking.details.depositTransactionId,
          type: 'booking',
          transaction,
        });
      }
    }

    const customer = await Customer.findByPk(customerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'booking.cancelled',
      params: { tableId: booking.table_id, branchId: booking.branch_id },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.booking_confirmation,
        message,
        priority: 'MEDIUM',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_CANCELLED,
        details: { bookingId },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'booking:cancelled', {
      userId: customer.user_id,
      role: 'customer',
      bookingId,
    });

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES[2],
      data: { bookingId: booking.id },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Booking cancellation failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.BOOKING_CANCELLATION_FAILED));
  }
});

const processCheckIn = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { bookingId } = req.params;
  const { qrCode, method, coordinates } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Processing check-in', { customerId, bookingId });

  const transaction = await sequelize.transaction();
  try {
    const { booking } = await processCheckIn({ bookingId, qrCode, method, coordinates, transaction });

    const customer = await Customer.findByPk(customerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'check_in.confirmed',
      params: { bookingId },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.check_in_confirmation,
        message,
        priority: 'HIGH',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.CHECK_IN_PROCESSED,
        details: { bookingId, method },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'check_in:processed', {
      userId: customer.user_id,
      role: 'customer',
      bookingId,
    });

    try {
      const action = customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(a => a.action === 'check_in');
      await gamificationService.awardPoints(
        {
          userId: customer.user_id,
          action: action.action,
          points: action.points,
          metadata: { io, role: 'customer', bookingId },
        },
        transaction
      );
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES[3],
      data: { bookingId: booking.id, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Check-in processing failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.CHECK_IN_FAILED));
  }
});

const getBookingHistory = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;

  logger.info('Retrieving booking history', { customerId });

  try {
    const bookings = await getBookingHistory({ customerId });

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES[4],
      data: bookings,
    });
  } catch (error) {
    logger.error('Booking history retrieval failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND));
  }
});

const submitBookingFeedback = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { bookingId } = req.params;
  const { rating, comment } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Submitting booking feedback', { customerId, bookingId });

  const transaction = await sequelize.transaction();
  try {
    const { feedback } = await submitBookingFeedback({ bookingId, rating, comment, transaction });

    const customer = await Customer.findByPk(customerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'feedback.submitted',
      params: { bookingId, rating },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.feedback_confirmation,
        message,
        priority: 'LOW',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.FEEDBACK_SUBMITTED,
        details: { bookingId, rating },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'feedback:submitted', {
      userId: customer.user_id,
      role: 'customer',
      bookingId,
      rating,
    });

    try {
      const action = customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(a => a.action === 'feedback_submitted');
      await gamificationService.awardPoints(
        {
          userId: customer.user_id,
          action: action.action,
          points: action.points,
          metadata: { io, role: 'customer', bookingId },
        },
        transaction
      );
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES[5],
      data: { feedbackId: feedback.id, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Feedback submission failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.FEEDBACK_SUBMISSION_FAILED));
  }
});

const addPartyMember = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { bookingId } = req.params;
  const { friendCustomerId, inviteMethod } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');

  logger.info('Adding party member', { customerId, bookingId, friendCustomerId });

  const transaction = await sequelize.transaction();
  try {
    const member = await addPartyMember({ bookingId, friendCustomerId, inviteMethod, transaction });

    const customer = await Customer.findByPk(customerId, { transaction });
    const friend = await Customer.findByPk(friendCustomerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: friend.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'booking.party_member_invited',
      params: { bookingId, inviterName: customer.name },
    });
    await notificationService.createNotification(
      {
        userId: friend.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.booking_invitation,
        message,
        priority: 'MEDIUM',
        languageCode: friend.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PARTY_MEMBER_ADDED,
        details: { bookingId, friendCustomerId },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'party_member:added', {
      userId: friend.user_id,
      role: 'customer',
      bookingId,
      friendCustomerId,
    });

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES[6],
      data: { bookingId, friendCustomerId: member.customer_id },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Party member addition failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.PARTY_MEMBER_ADDITION_FAILED));
  }
});

const searchAvailableTables = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { coordinates, radius, date, time, partySize, seatingPreference } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Searching available tables', { customerId });

  const transaction = await sequelize.transaction();
  try {
    const tables = await searchAvailableTables({
      coordinates,
      radius,
      date,
      time,
      partySize,
      seatingPreference,
      transaction,
    });

    const customer = await Customer.findByPk(customerId, { transaction });

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.TABLE_SEARCHED,
        details: { coordinates, radius, date, time, partySize, seatingPreference },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'table:searched', {
      userId: customer.user_id,
      role: 'customer',
      coordinates,
      radius,
    });

    try {
      const action = customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(a => a.action === 'table_searched');
      await gamificationService.awardPoints(
        {
          userId: customer.user_id,
          action: action.action,
          points: action.points,
          metadata: { io, role: 'customer' },
        },
        transaction
      );
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES[7],
      data: { tables, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Table search failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.TABLE_SEARCH_FAILED));
  }
});

module.exports = {
  createReservation,
  updateReservation,
  cancelBooking,
  processCheckIn,
  getBookingHistory,
  submitBookingFeedback,
  addPartyMember,
  searchAvailableTables,
};