'use strict';

const AppError = require('@utils/AppError');
const catchAsync = require('@utils/catchAsync');
const partyManagementService = require('@services/partyManagementService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');
const socialConstants = require('@constants/common/socialConstants');
const customerConstants = require('@constants/customer/customerGamificationConstants');
const logger = require('@utils/logger');

module.exports = {
  invitePartyMember: catchAsync(async (req, res, next) => {
    const { bookingId, customerId, inviteMethod } = req.body;
    const inviterId = req.user.id;
    const languageCode = req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    const transaction = await req.db.transaction();
    try {
      const { partyMember, booking, message } = await partyManagementService.invitePartyMember({
        bookingId,
        customerId,
        inviterId,
        inviteMethod,
        transaction,
      });

      await pointService.awardPoints(inviterId, 'party_member_invited', 5, {
        io: req.io,
        role: 'customer',
        languageCode,
        walletId: req.user.walletId,
      });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: 'party_invite',
        messageKey: 'party.invite_received',
        messageParams: { bookingId, inviterName: req.user.first_name },
        deliveryMethod: inviteMethod,
        priority: 'medium',
        bookingId,
        role: 'customer',
        module: 'party',
      });

      await socketService.emit(req.io, 'PARTY_INVITE_SENT', {
        userId: customerId,
        role: 'customer',
        auditAction: 'PARTY_INVITE_SENT',
        details: { bookingId, partyMemberId: partyMember.id },
      }, `customer:${customerId}`, languageCode);

      await auditService.logAction({
        userId: inviterId,
        role: 'customer',
        action: 'PARTY_INVITE_SENT',
        details: { bookingId, customerId, inviteMethod },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: formatMessage('customer', 'party', languageCode, message),
        data: { partyMember, booking },
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to invite party member', { error: error.message, bookingId, customerId });
      return next(new AppError(formatMessage('customer', 'party', languageCode, error.message), 400, error.message));
    }
  }),

  updatePartyMemberStatus: catchAsync(async (req, res, next) => {
    const { bookingId, status } = req.body;
    const customerId = req.user.id;
    const languageCode = req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    const transaction = await req.db.transaction();
    try {
      const { partyMember } = await partyManagementService.updatePartyMemberStatus({
        bookingId,
        customerId,
        status,
        transaction,
      });

      await pointService.awardPoints(customerId, 'party_member_status_updated', 3, {
        io: req.io,
        role: 'customer',
        languageCode,
        walletId: req.user.walletId,
      });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: 'party_status_updated',
        messageKey: 'party.status_updated',
        messageParams: { bookingId, status },
        deliveryMethod: 'push',
        priority: 'medium',
        bookingId,
        role: 'customer',
        module: 'party',
      });

      await socketService.emit(req.io, 'PARTY_STATUS_UPDATED', {
        userId: customerId,
        role: 'customer',
        auditAction: 'PARTY_STATUS_UPDATED',
        details: { bookingId, status },
      }, `customer:${customerId}`, languageCode);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: 'PARTY_STATUS_UPDATED',
        details: { bookingId, status },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: formatMessage('customer', 'party', languageCode, socialConstants.SUCCESS_MESSAGES[1]),
        data: { partyMember },
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to update party member status', { error: error.message, bookingId, customerId });
      return next(new AppError(formatMessage('customer', 'party', languageCode, error.message), 400, error.message));
    }
  }),

  removePartyMember: catchAsync(async (req, res, next) => {
    const { bookingId, customerId } = req.body;
    const inviterId = req.user.id;
    const languageCode = req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    const transaction = await req.db.transaction();
    try {
      const { booking } = await partyManagementService.removePartyMember({
        bookingId,
        customerId,
        inviterId,
        transaction,
      });

      await pointService.awardPoints(inviterId, 'party_member_removed', 2, {
        io: req.io,
        role: 'customer',
        languageCode,
        walletId: req.user.walletId,
      });

      await notificationService.sendNotification({
 transformação
        userId: customerId,
        notificationType: 'party_member_removed',
        messageKey: 'party.member_removed',
        messageParams: { bookingId, inviterName: req.user.first_name },
        deliveryMethod: 'push',
        priority: 'medium',
        bookingId,
        role: 'customer',
        module: 'party',
      });

      await socketService.emit(req.io, 'PARTY_MEMBER_REMOVED', {
        userId: customerId,
        role: 'customer',
        auditAction: 'PARTY_MEMBER_REMOVED',
        details: { bookingId, customerId },
      }, `customer:${customerId}`, languageCode);

      await auditService.logAction({
        userId: inviterId,
        role: 'customer',
        action: 'PARTY_MEMBER_REMOVED',
        details: { bookingId, customerId },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: formatMessage('customer', 'party', languageCode, socialConstants.SUCCESS_MESSAGES[2]),
        data: { booking },
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to remove party member', { error: error.message, bookingId, customerId });
      return next(new AppError(formatMessage('customer', 'party', languageCode, error.message), 400, error.message));
    }
  }),

  splitBill: catchAsync(async (req, res, next) => {
    const { bookingId, customerIds, amount, currency, billSplitType } = req.body;
    const inviterId = req.user.id;
    const languageCode = req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    const transaction = await req.db.transaction();
    try {
      const { paymentRequests, booking, message } = await partyManagementService.splitBill({
        bookingId,
        customerIds,
        inviterId,
        amount,
        currency,
        billSplitType,
        transaction,
      });

      await pointService.awardPoints(inviterId, 'bill_split_initiated', 10, {
        io: req.io,
        role: 'customer',
        languageCode,
        walletId: req.user.walletId,
      });

      for (const customerId of customerIds) {
        await notificationService.sendNotification({
          userId: customerId,
          notificationType: 'bill_split_request',
          messageKey: 'party.bill_split_request',
          messageParams: { bookingId, amount, inviterName: req.user.first_name },
          deliveryMethod: 'push',
          priority: 'high',
          bookingId,
          role: 'customer',
          module: 'party',
        });

        await socketService.emit(req.io, 'BILL_SPLIT_REQUESTED', {
          userId: customerId,
          role: 'customer',
          auditAction: 'BILL_SPLIT_REQUESTED',
          details: { bookingId, amount, billSplitType },
        }, `customer:${customerId}`, languageCode);
      }

      await auditService.logAction({
        userId: inviterId,
        role: 'customer',
        action: 'BILL_SPLIT_REQUESTED',
        details: { bookingId, customerIds, amount, billSplitType },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: formatMessage('customer', 'party', languageCode, message),
        data: { paymentRequests, booking },
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to split bill', { error: error.message, bookingId, customerIds });
      return next(new AppError(formatMessage('customer', 'party', languageCode, error.message), 400, error.message));
    }
  }),
};