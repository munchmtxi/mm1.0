'use strict';

/**
 * gamificationRewardService.js
 * Manages gamification rewards for munch staff. Handles point conversion, reward tracking,
 * redemption, analytics sync, and notifications.
 * Last Updated: May 26, 2025
 */

const { GamificationPoints, Wallet, UserReward, WalletTransaction, BranchMetrics, Notification, Staff, Reward, Badge, UserBadge } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Converts points to wallet credits.
 * @param {number} staffId - Staff ID.
 * @param {number} points - Points to convert.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Transaction record.
 */
async function convertPointsToCredits(staffId, points, ipAddress) {
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

    const amount = points * merchantConstants.GAMIFICATION_CONSTANTS.POINTS_TO_CREDIT_RATIO;
    await Wallet.update(
      { balance: sequelize.literal(`balance + ${amount}`) },
      { where: { id: staff.wallet.id } }
    );

    const transaction = await WalletTransaction.create({
      wallet_id: staff.wallet.id,
      type: merchantConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.REWARD,
      amount,
      currency: staff.wallet.currency,
      status: 'completed',
      description: `Converted ${points} points to credits`,
    });

    await GamificationPoints.create({
      user_id: staff.user_id,
      role: 'staff',
      action: 'points_redeemed',
      points: -points,
      expires_at: new Date(Date.now() + merchantConstants.GAMIFICATION_CONSTANTS.POINTS_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, points, amount, transactionId: transaction.id, action: 'convert_points' },
      ipAddress,
    });

    const message = localization.formatMessage('gamification.points_converted', { amount });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:reward:${staffId}`, 'reward:points_converted', { staffId, points, amount });

    return transaction;
  } catch (error) {
    logger.error('Points conversion failed', { error: error.message, staffId, points });
    throw new AppError(`Points conversion failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Monitors rewards from tasks.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Array>} Reward records.
 */
async function trackRewardEarnings(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const rewards = await GamificationPoints.findAll({
      where: { user_id: staff.user_id, role: 'staff' },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    socketService.emit(`munch:reward:${staffId}`, 'reward:earnings_tracked', { staffId, rewards });

    return rewards;
  } catch (error) {
    logger.error('Reward tracking failed', { error: error.message, staffId });
    throw new AppError(`Reward tracking failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Processes reward redemptions.
 * @param {number} staffId - Staff ID.
 * @param {number} rewardId - Reward ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} UserReward record.
 */
async function redeemRewards(staffId, rewardId, ipAddress) {
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
        { balance: sequelize.literal(`balance + ${amount}`) },
        { where: { id: staff.wallet.id } }
      );

      await WalletTransaction.create({
        wallet_id: staff.wallet.id,
        type: merchantConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.REWARD,
        amount,
        currency: staff.wallet.currency,
        status: 'completed',
        description: `Redeemed reward: ${reward.name}`,
      });
    }

    await GamificationPoints.create({
      user_id: staff.user_id,
      role: 'staff',
      action: 'points_redeemed',
      points: -reward.points_required,
      expires_at: new Date(Date.now() + merchantConstants.GAMIFICATION_CONSTANTS.POINTS_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, rewardId, userRewardId: userReward.id, action: 'redeem_reward' },
      ipAddress,
    });

    const message = localization.formatMessage('gamification.reward_redeemed', { rewardName: reward.name });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:reward:${staffId}`, 'reward:redeemed', { staffId, rewardId });

    return userReward;
  } catch (error) {
    logger.error('Reward redemption failed', { error: error.message, staffId, rewardId });
    throw new AppError(`Reward redemption failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Synchronizes reward data with branch analytics.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function syncRewardsWithAnalytics(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const rewards = await GamificationPoints.findAll({
      where: { user_id: staff.user_id, role: 'staff' },
    });

    await BranchMetrics.update(
      { gamification_metrics: { total_points: rewards.reduce((sum, r) => sum + r.points, 0) } },
      { where: { branch_id: staff.branch_id } }
    );

    socketService.emit(`munch:reward:${staffId}`, 'reward:analytics_synced', { staffId });

  } catch (error) {
    logger.error('Reward analytics sync failed', { error: error.message, staffId });
    throw new AppError(`Analytics sync failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Notifies staff of reward credits.
 * @param {number} staffId - Staff ID.
 * @param {number} amount - Credit amount.
 * @returns {Promise<void>}
 */
async function notifyRewardCredit(staffId, amount) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const message = localization.formatMessage('gamification.reward_credited', { amount });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:reward:${staffId}`, 'reward:credited', { staffId, amount });

  } catch (error) {
    logger.error('Reward credit notification failed', { error: error.message, staffId, amount });
    throw new AppError(`Notification failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  convertPointsToCredits,
  trackRewardEarnings,
  redeemRewards,
  syncRewardsWithAnalytics,
  notifyRewardCredit,
};