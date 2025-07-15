'use strict';

const { GamificationPoints, Wallet, UserReward, WalletTransaction, BranchMetrics, Notification, Staff, Reward } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');
const { Op, fn, col } = require('sequelize');

const POINTS_TO_CREDIT_RATIO = 0.1; // 10 points = 1 credit
const POINTS_EXPIRY_DAYS = 30;

async function convertPointsToCredits(staffId, points, ipAddress, securityService, notificationService, auditService, socketService) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const availablePoints = await GamificationPoints.sum('points', {
      where: { user_id: staff.user_id, expires_at: { [Op.gt]: new Date() } },
    });
    if (points > availablePoints) {
      throw new AppError('Insufficient points', 400, staffConstants.STAFF_ERROR_CODES.INSUFFICIENT_POINTS);
    }

    await securityService.verifyMFA(staff.user_id);

    const amount = points * POINTS_TO_CREDIT_RATIO;
    await Wallet.update(
      { balance: fn('balance +', amount) },
      { where: { id: staff.wallet.id } }
    );

    const transaction = await WalletTransaction.create({
      wallet_id: staff.wallet.id,
      type: paymentConstants.TRANSACTION_TYPES.includes('gamification_reward') ? 'gamification_reward' : 'reward',
      amount,
      currency: staff.wallet.currency,
      status: paymentConstants.TRANSACTION_STATUSES[1], // 'completed'
      description: `Converted ${points} points to credits`,
    });

    await GamificationPoints.create({
      user_id: staff.user_id,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: 'points_redeemed',
      points: -points,
      expires_at: new Date(Date.now() + POINTS_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    await auditService.logAction({
      userId: staffId,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, points, amount, transactionId: transaction.id, action: 'convert_points' },
      ipAddress,
    });

    const message = formatMessage('gamification.points_converted', { amount });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:reward:${staffId}`, 'reward:points_converted', { staffId, points, amount });

    return transaction;
  } catch (error) {
    logger.error('Points conversion failed', { error: error.message, staffId, points });
    throw new AppError(`Points conversion failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'INVALID_BALANCE');
  }
}

async function trackRewardEarnings(staffId, socketService) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const rewards = await GamificationPoints.findAll({
      where: { user_id: staff.user_id, role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff' },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    socketService.emit(`munch:reward:${staffId}`, 'reward:earnings_tracked', { staffId, rewards });

    return rewards;
  } catch (error) {
    logger.error('Reward tracking failed', { error: error.message, staffId });
    throw new AppError(`Reward tracking failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'INVALID_BALANCE');
  }
}

async function redeemRewards(staffId, rewardId, ipAddress, securityService, notificationService, auditService, socketService) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    const reward = await Reward.findByPk(rewardId);
    if (!staff || !staff.wallet || !reward) {
      throw new AppError('Staff or reward not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const availablePoints = await GamificationPoints.sum('points', {
      where: { user_id: staff.user_id, expires_at: { [Op.gt]: new Date() } },
    });
    if (reward.points_required > availablePoints) {
      throw new AppError('Insufficient points', 400, staffConstants.STAFF_ERROR_CODES.INSUFFICIENT_POINTS);
    }

    await securityService.verifyMFA(staff.user_id);

    const userReward = await UserReward.create({
      user_id: staff.user_id,
      reward_id: rewardId,
    });

    if (reward.type === 'wallet_credit') {
      const amount = reward.value.amount;
      await Wallet.update(
        { balance: fn('balance +', amount) },
        { where: { id: staff.wallet.id } }
      );

      await WalletTransaction.create({
        wallet_id: staff.wallet.id,
        type: paymentConstants.TRANSACTION_TYPES.includes('gamification_reward') ? 'gamification_reward' : 'reward',
        amount,
        currency: staff.wallet.currency,
        status: paymentConstants.TRANSACTION_STATUSES[1], // 'completed'
        description: `Redeemed reward: ${reward.name}`,
      });
    }

    await GamificationPoints.create({
      user_id: staff.user_id,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: 'points_redeemed',
      points: -reward.points_required,
      expires_at: new Date(Date.now() + POINTS_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    await auditService.logAction({
      userId: staffId,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, rewardId, userRewardId: userReward.id, action: 'redeem_reward' },
      ipAddress,
    });

    const message = formatMessage('gamification.reward_redeemed', { rewardName: reward.name });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:reward:${staffId}`, 'reward:redeemed', { staffId, rewardId });

    return userReward;
  } catch (error) {
    logger.error('Reward redemption failed', { error: error.message, staffId, rewardId });
    throw new AppError(`Reward redemption failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'INVALID_BALANCE');
  }
}

async function syncRewardsWithAnalytics(staffId, socketService) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const rewards = await GamificationPoints.findAll({
      where: { user_id: staff.user_id, role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff' },
    });

    await BranchMetrics.update(
      { gamification_metrics: { total_points: rewards.reduce((sum, r) => sum + r.points, 0) } },
      { where: { staff_id: staffId } }
    );

    socketService.emit(`munch:reward:${staffId}`, 'reward:analytics_synced', { staffId });

    return { message: 'Rewards synced with analytics' };
  } catch (error) {
    logger.error('Reward analytics sync failed', { error: error.message, staffId });
    throw new AppError(`Analytics sync failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'INVALID_BALANCE');
  }
}

async function notifyRewardCredit(staffId, amount, notificationService, socketService) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const message = formatMessage('gamification.reward_credited', { amount });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:reward:${staffId}`, 'reward:credited', { staffId, amount });

    return { message: 'Reward credit notification sent' };
  } catch (error) {
    logger.error('Reward credit notification failed', { error: error.message, staffId, amount });
    throw new AppError(`Notification failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'INVALID_BALANCE');
  }
}

module.exports = {
  convertPointsToCredits,
  trackRewardEarnings,
  redeemRewards,
  syncRewardsWithAnalytics,
  notifyRewardCredit,
};