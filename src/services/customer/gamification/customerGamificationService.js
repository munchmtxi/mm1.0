// src/services/customer/gamificationService.js
'use strict';

/**
 * Customer Gamification Service
 * Manages customer gamification features (points, badges, leaderboard, rewards) as a dashboard.
 * Integrates with common gamificationService for point awarding.
 * Supports global leaderboard and wallet credit rewards.
 * Last Updated: May 19, 2025
 */

const { sequelize } = require('@models');
const {
  User,
  Customer,
  GamificationPoints,
  Badge,
  UserBadge,
  Reward,
  UserReward,
  Notification,
  AuditLog,
  Wallet,
} = require('@models');
const gamificationService = require('@services/common/gamificationService');
const notificationService = require('@services/common/notificationService');
const walletService = require('@services/common/walletService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization');
const gamificationConstants = require('@constants/gamificationConstants');
const customerConstants = require('@constants/customerConstants');

async function awardPoints({ customerId, action, metadata = {} }, transaction = null) {
  const localTransaction = transaction || (await sequelize.transaction());

  try {
    // Validate customer
    const user = await User.findByPk(customerId, {
      attributes: ['id', 'preferred_language'],
      include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      transaction: localTransaction,
    });
    if (!user || !user.customer_profile) {
      throw new Error(gamificationConstants.ERROR_CODES.INVALID_USER);
    }

    // Validate action
    const validActions = Object.values(gamificationConstants.CUSTOMER_ACTIONS).map(a => a.action);
    if (!validActions.includes(action)) {
      throw new Error(gamificationConstants.ERROR_CODES.INVALID_ACTION);
    }

    // Get action configuration
    const actionConfig = gamificationConstants.CUSTOMER_ACTIONS[action];
    const points = actionConfig.points;

    // Award points using common service
    const pointsRecord = await gamificationService.awardPoints({
      userId: customerId,
      role: 'customer',
      action,
      languageCode: user.preferred_language,
    });

    if (!transaction) await localTransaction.commit();
    return { pointId: pointsRecord.id, points };
  } catch (error) {
    if (!transaction) await localTransaction.rollback();
    throw error;
  }
}

async function assignBadge(customerId, badgeId, ipAddress) {
  const transaction = await sequelize.transaction();

  try {
    // Validate customer
    const user = await User.findByPk(customerId, {
      attributes: ['id', 'preferred_language'],
      include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      transaction,
    });
    if (!user || !user.customer_profile) {
      throw new Error(gamificationConstants.ERROR_CODES.INVALID_USER);
    }

    // Validate badge
    const badge = await Badge.findByPk(badgeId, { transaction });
    if (!badge) throw new Error(gamificationConstants.ERROR_CODES.INVALID_BADGE);

    // Check if badge already assigned
    const existingBadge = await UserBadge.findOne({
      where: { user_id: customerId, badge_id: badgeId },
      transaction,
    });
    if (existingBadge) throw new Error(gamificationConstants.ERROR_CODES.INVALID_BADGE);

    // Assign badge
    const userBadge = await UserBadge.create(
      { user_id: customerId, badge_id: badgeId },
      { transaction }
    );

    // Send notification
    const message = formatMessage(user.preferred_language, 'gamification.badge_awarded', { badgeName: badge.name });
    await notificationService.createNotification(
      {
        userId: customerId,
        type: gamificationConstants.NOTIFICATION_TYPES.BADGE_AWARDED,
        message,
        priority: 'MEDIUM',
        languageCode: user.preferred_language,
      },
      transaction
    );

    // Log audit
    await auditService.logAction(
      {
        userId: customerId,
        logType: gamificationConstants.AUDIT_TYPES.BADGE_AWARDED,
        details: { badgeId, badgeName: badge.name },
        ipAddress,
      },
      transaction
    );

    // Emit socket event
    socketService.emit(`gamification:badge:${customerId}`, { badgeId, badgeName: badge.name });

    await transaction.commit();
    return { userBadgeId: userBadge.id };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function getLeaderboard(customerId) {
  // Validate customer
  const user = await User.findByPk(customerId, {
    attributes: ['id', 'preferred_language'],
    include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
  });
  if (!user || !user.customer_profile) {
    throw new Error(gamificationConstants.ERROR_CODES.INVALID_USER);
  }

  // Get global leaderboard
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - gamificationConstants.POINT_EXPIRY_DAYS);

  const leaderboard = await User.findAll({
    attributes: [
      'id',
      'first_name',
      'last_name',
      [sequelize.fn('SUM', sequelize.col('gamificationPoints.points')), 'total_points'],
    ],
    include: [
      {
        model: GamificationPoints,
        as: 'gamificationPoints',
        attributes: [],
        where: {
          role: 'customer',
          expires_at: { [sequelize.Op.gte]: expiryDate },
        },
      },
      { model: Customer, as: 'customer_profile', attributes: ['id'] },
    ],
    where: sequelize.where(
      sequelize.fn('EXISTS', sequelize.literal(`(
        SELECT 1 FROM customers WHERE customers.user_id = users.id
      )`)),
      true
    ),
    group: ['users.id', 'users.first_name', 'users.last_name', 'customer_profile.id'],
    order: [[sequelize.literal('total_points'), 'DESC']],
    limit: gamificationConstants.LEADERBOARD_SETTINGS.TOP_RANK_LIMIT,
  });

  // Find user's rank
  let userRank = null;
  const userPoints = await GamificationPoints.sum('points', {
    where: {
      user_id: customerId,
      role: 'customer',
      expires_at: { [sequelize.Op.gte]: expiryDate },
    },
  });
  if (userPoints) {
    const rankQuery = await sequelize.query(
      `
      SELECT rank FROM (
        SELECT users.id, RANK() OVER (ORDER BY SUM(gamification_points.points) DESC) as rank
        FROM users
        JOIN customers ON customers.user_id = users.id
        LEFT JOIN gamification_points ON gamification_points.user_id = users.id
        WHERE gamification_points.role = 'customer'
        AND (gamification_points.expires_at >= :expiryDate OR gamification_points.expires_at IS NULL)
        GROUP BY users.id
      ) ranked
      WHERE id = :customerId
      `,
      {
        replacements: { customerId, expiryDate },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    userRank = rankQuery[0]?.rank || null;
  }

  // Log audit
  await auditService.logAction({
    userId: customerId,
    logType: gamificationConstants.AUDIT_TYPES.LEADERBOARD_ACCESSED,
    details: { userRank, leaderboardCount: leaderboard.length },
  });

  // Notify if user is in top ranks
  if (userRank && userRank <= gamificationConstants.LEADERBOARD_SETTINGS.TOP_RANK_LIMIT) {
    const message = formatMessage(user.preferred_language, 'gamification.leaderboard_updated', { rank: userRank });
    await notificationService.createNotification({
      userId: customerId,
      type: gamificationConstants.NOTIFICATION_TYPES.LEADERBOARD_UPDATED,
      message,
      priority: 'MEDIUM',
      languageCode: user.preferred_language,
    });
  }

  return {
    leaderboard: leaderboard.map((entry, index) => ({
      rank: index + 1,
      userId: entry.id,
      name: `${entry.first_name} ${entry.last_name}`,
      totalPoints: parseInt(entry.dataValues.total_points || 0),
    })),
    userRank,
    userPoints: userPoints || 0,
  };
}

async function redeemPoints(customerId, rewardId, ipAddress) {
  const transaction = await sequelize.transaction();

  try {
    // Validate customer
    const user = await User.findByPk(customerId, {
      attributes: ['id', 'preferred_language'],
      include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      transaction,
    });
    if (!user || !user.customer_profile) {
      throw new Error(gamificationConstants.ERROR_CODES.INVALID_USER);
    }

    // Validate reward
    const reward = await Reward.findByPk(rewardId, { transaction });
    if (!reward || !reward.is_active || reward.type !== 'wallet_credit') {
      throw new Error(gamificationConstants.ERROR_CODES.INVALID_REWARD);
    }

    // Check user's points
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - gamificationConstants.POINT_EXPIRY_DAYS);
    const userPoints = await GamificationPoints.sum('points', {
      where: {
        user_id: customerId,
        role: 'customer',
        expires_at: { [sequelize.Op.gte]: expiryDate },
      },
      transaction,
    });
    if (!userPoints || userPoints < reward.points_required) {
      throw new Error(gamificationConstants.ERROR_CODES.INSUFFICIENT_POINTS);
    }

    // Deduct points
    await GamificationPoints.create(
      {
        user_id: customerId,
        role: 'customer',
        action: 'points_redeemed',
        points: -reward.points_required,
        metadata: { rewardId, rewardName: reward.name },
        expires_at: new Date(Date.now() + gamificationConstants.POINT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
      { transaction }
    );

    // Create user reward record
    const userReward = await UserReward.create(
      { user_id: customerId, reward_id: rewardId, status: 'pending' },
      { transaction }
    );

    // Process wallet credit
    const wallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
    if (!wallet) throw new Error('Wallet not found');
    await walletService.processTransaction(
      {
        walletId: wallet.id,
        amount: reward.value.amount,
        type: customerConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.CASHBACK,
        currency: reward.value.currency,
        description: `Reward: ${reward.name}`,
      },
      transaction
    );
    await userReward.update({ status: 'completed' }, { transaction });

    // Send notification
    const message = formatMessage(user.preferred_language, 'gamification.reward_redeemed', { rewardName: reward.name });
    await notificationService.createNotification(
      {
        userId: customerId,
        type: gamificationConstants.NOTIFICATION_TYPES.REWARD_REDEEMED,
        message,
        priority: 'HIGH',
        languageCode: user.preferred_language,
      },
      transaction
    );

    // Log audit
    await auditService.logAction(
      {
        userId: customerId,
        logType: gamificationConstants.AUDIT_TYPES.REWARD_REDEEMED,
        details: { rewardId, rewardName: reward.name, points: reward.points_required },
        ipAddress,
      },
      transaction
    );

    // Emit socket event
    socketService.emit(`gamification:reward:${customerId}`, { rewardId, rewardName: reward.name });

    await transaction.commit();
    return { userRewardId: userReward.id };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  awardPoints,
  assignBadge,
  getLeaderboard,
  redeemPoints,
};