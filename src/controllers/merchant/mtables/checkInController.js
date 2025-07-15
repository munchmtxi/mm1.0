'use strict';

const { sequelize } = require('@models');
const checkInService = require('@services/merchant/mtables/checkInService');
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

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const processCheckIn = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const checkInDetails = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await checkInService.processCheckIn(bookingId, checkInDetails, ipAddress, transaction);
    const points = calculatePoints(result.action, {}, 'customer');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.CHECK_IN_PROCESSED,
        messageKey: 'mtables.checkInProcessed',
        messageParams: { bookingId, tableId: result.tableId },
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
        metadata: {},
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.CHECK_IN_PROCESSED,
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
        action: mtablesConstants.AUDIT_TYPES.CHECK_IN_PROCESSED,
        details: { bookingId, tableId: result.tableId, branchId: result.branchId, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:checkInProcessed', {
      bookingId,
      tableId: result.tableId,
      points,
    }, `merchant:${result.branchId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateTableStatus = catchAsync(async (req, res) => {
  const { tableId } = req.params;
  const { status } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await checkInService.updateTableStatus(tableId, status, ipAddress, transaction);
    const points = calculatePoints(result.action, {}, 'merchant');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.TABLE_STATUS_UPDATED,
        messageKey: 'mtables.tableStatusUpdated',
        messageParams: { tableId, status },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[1],
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
          notificationType: mtablesConstants.NOTIFICATION_TYPES.TABLE_STATUS_UPDATED,
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
        action: mtablesConstants.AUDIT_TYPES.TABLE_STATUS_UPDATED,
        details: { tableId, status, branchId: result.branchId, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:tableStatusUpdated', {
      tableId,
      status,
      points,
    }, `merchant:${result.branchId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const logCheckInTime = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await checkInService.logCheckInTime(bookingId, ipAddress, transaction);
    const points = calculatePoints(result.action, {}, 'customer');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.CHECK_IN_LOGGED,
        messageKey: 'mtables.checkInLogged',
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
        metadata: {},
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.CHECK_IN_LOGGED,
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
        action: mtablesConstants.AUDIT_TYPES.CHECK_IN_LOGGED,
        details: { bookingId, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:checkInLogged', {
      bookingId,
      points,
    }, `merchant:${(await Booking.findByPk(bookingId, { attributes: ['branch_id'], transaction })).branch_id}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const handleSupportRequest = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const request = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await checkInService.handleSupportRequest(bookingId, request, ipAddress, transaction);
    const points = calculatePoints(result.action, {}, 'customer');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.SUPPORT_REQUEST_HANDLED,
        messageKey: 'mtables.supportRequestHandled',
        messageParams: { bookingId, type: result.type },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[2],
        role: 'customer',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    const merchant = await Merchant.findOne({
      include: [{ model: MerchantBranch, where: { id: (await Booking.findByPk(bookingId, { attributes: ['branch_id'], transaction })).branch_id } }],
      transaction,
    });

    await notificationService.sendNotification(
      {
        userId: merchant.user_id,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.SUPPORT_REQUEST_HANDLED,
        messageKey: 'mtables.supportRequestReceived',
        messageParams: { bookingId, type: result.type },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[2],
        role: 'merchant',
        module: 'mtables',
        languageCode: merchant.preferred_language || 'en',
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
          notificationType: mtablesConstants.NOTIFICATION_TYPES.SUPPORT_REQUEST_HANDLED,
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
        action: mtablesConstants.AUDIT_TYPES.SUPPORT_REQUEST_HANDLED,
        details: { bookingId, type: result.type, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:supportRequestHandled', {
      bookingId,
      type: result.type,
      points,
    }, `merchant:${(await Booking.findByPk(bookingId, { attributes: ['branch_id'], transaction })).branch_id}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { processCheckIn, updateTableStatus, logCheckInTime, handleSupportRequest };