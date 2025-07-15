'use strict';

const { sequelize } = require('@models');
const bookingService = require('@services/merchant/mtables/bookingService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const mtablesConstants = require('@constants/merchant/mtablesConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const calculatePoints = (action, metadata, role) => {
  const actionConfig = role === 'merchant'
    ? gamificationConstants.MERCHANT_ACTIONS.find(a => a.action === action)
    : gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === action);
  if (!actionConfig) return 0;

  let points = actionConfig.basePoints;
  let multipliers = 1;

  if (action === 'bookingCreated' && metadata.guestCount) {
    multipliers *= actionConfig.multipliers.guestCount * metadata.guestCount || 1;
  }
  if (action === 'bookingPoliciesUpdated') {
    multipliers *= 1; // No metadata multiplier
  }
  if (action === 'waitlistAdded') {
    multipliers *= 1; // No metadata multiplier
  }
  if (action === 'bookingUpdated' && metadata.guestCount) {
    multipliers *= 1; // No metadata multiplier
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const createReservation = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const details = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await bookingService.createReservation(bookingId, req.user.customerId, details, ipAddress, transaction);
    const points = calculatePoints(result.action, { guestCount: result.guestCount }, 'customer');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_CREATED,
        messageKey: 'mtables.bookingCreated',
        messageParams: { bookingId, reference: result.reference },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[1],
        role: 'customer',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(req.user.id, result.action, points, {
        io,
        role: 'customer',
        languageCode: result.language,
        metadata: { guestCount: result.guestCount },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_CREATED,
          messageKey: 'mtables.pointsReceived',
          messageParams: { points, action: result.action },
          priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
          role: 'customer',
          module: 'mtables',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: req.user.id,
        role: 'customer',
        action: mtablesConstants.AUDIT_TYPES.BOOKING_CREATED,
        details: { bookingId, reference: result.reference, guestCount: result.guestCount, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:bookingCreated', {
      bookingId,
      customerId: req.user.customerId,
      points,
    }, `merchant:${details.branchId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const manageWaitlist = catchAsync(async (req, res) => {
  const { branchId, customerId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await bookingService.logAction(branchId, customerId, ipAddress, transaction);
    const points = calculatePoints(result.action, {}, 'customer');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.WAITLIST_ADDED,
        messageKey: 'mtables.waitlistAdded',
        messageParams: { waitlistId: result.waitlistId },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
        role: 'customer',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(req.user.id, result.action, points, {
        io,
        role: 'customer',
        languageCode: result.language,
        metadata: {},
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.WAITLIST_ADDED,
          messageKey: 'mtables.pointsReceived',
          messageParams: { points, action: result.action },
          priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
          role: 'customer',
          module: 'mtables',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: req.user.id,
        role: 'customer',
        action: mtablesConstants.AUDIT_TYPES.WAITLIST_ADDED,
        details: { waitlistId: result.waitlistId, branchId, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:waitlistAdded', {
      waitlistId: result.waitlistId,
      customerId,
      points,
    }, `merchant:${branchId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const setBookingPolicies = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const policies = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await bookingService.setBookingPolicies(merchantId, policies, ipAddress, transaction);
    const points = calculatePoints(result.action, {}, 'merchant');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_POLICIES_UPDATED,
        messageKey: 'mtables.policiesUpdated',
        messageParams: { merchantId },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[2],
        role: 'merchant',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(req.user.id, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: {},
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_POLICIES_UPDATED,
          messageKey: 'mtables.pointsReceived',
          messageParams: { points, action: result.action },
          priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
          role: 'merchant',
          module: 'mtables',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: req.user.id,
        role: 'merchant',
        action: mtablesConstants.AUDIT_TYPES.BOOKING_POLICIES_UPDATED,
        details: { merchantId, policies: result.policies, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:policiesUpdated', {
      merchantId,
      points,
    }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateReservation = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const updates = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await bookingService.updateReservation(bookingId, updates, ipAddress, transaction);
    const points = calculatePoints(result.action, { guestCount: result.guestCount }, 'customer');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
        messageKey: 'mtables.bookingUpdated',
        messageParams: { bookingId },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[1],
        role: 'customer',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(req.user.id, result.action, points, {
        io,
        role: 'customer',
        languageCode: result.language,
        metadata: { guestCount: result.guestCount },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
          messageKey: 'mtables.pointsReceived',
          messageParams: { points, action: result.action },
          priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
          role: 'customer',
          module: 'mtables',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: req.user.id,
        role: 'customer',
        action: mtablesConstants.AUDIT_TYPES.BOOKING_UPDATED,
        details: { bookingId, guestCount: result.guestCount, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:bookingUpdated', {
      bookingId,
      customerId: req.user.customerId,
      points,
    }, `merchant:${(await Booking.findByPk(bookingId, { attributes: ['branch_id'], transaction })).branch_id}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { createReservation, manageWaitlist, setBookingPolicies, updateReservation };