'use strict';

/**
 * Gamification Service
 * Manages points, badges, rewards, leaderboards, and point history for all roles (admin, customer, driver, staff, merchant).
 */

const { GamificationPoints, Badge, UserBadge, Reward, UserReward } = require('@models');
const merchantConstants = require('@constants/merchantConstants');
const driverConstants = require('@constants/driverConstants');
const customerConstants = require('@constants/customerConstants');
const adminCoreConstants = require('@constants/adminCoreConstants');
const staffConstants = require('@constants/staffConstants');
const socketConstants = require('@constants/common/socketConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const walletService = require('@services/common/walletService');

/**
 * Role-specific gamification configuration.
 */
const roleActionConfig = {
  admin: {
    actions: adminCoreConstants.GAMIFICATION_CONSTANTS?.ADMIN_ACTIONS || {},
    maxPointsPerDay: adminCoreConstants.GAMIFICATION_CONSTANTS?.MAX_POINTS_PER_DAY || 500,
    pointExpiryDays: adminCoreConstants.GAMIFICATION_CONSTANTS?.POINT_EXPIRY_DAYS || 365,
    badgeCriteria: adminCoreConstants.GAMIFICATION_CONSTANTS?.BADGE_CRITERIA || {},
    rewardTypes: adminCoreConstants.GAMIFICATION_CONSTANTS?.REWARD_TYPES || { WALLET_CREDIT: 'wallet_credit' },
  },
  customer: {
    actions: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS,
    maxPointsPerDay: customerConstants.GAMIFICATION_CONSTANTS.MAX_POINTS_PER_DAY,
    pointExpiryDays: customerConstants.GAMIFICATION_CONSTANTS.POINT_EXPIRY_DAYS,
    badgeCriteria: customerConstants.GAMIFICATION_CONSTANTS.BADGE_CRITERIA,
    rewardTypes: customerConstants.GAMIFICATION_CONSTANTS.REWARD_TYPES,
  },
  driver: {
    actions: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS,
    maxPointsPerDay: driverConstants.GAMIFICATION_CONSTANTS.MAX_POINTS_PER_DAY,
    pointExpiryDays: driverConstants.GAMIFICATION_CONSTANTS.POINT_EXPIRY_DAYS,
    badgeCriteria: driverConstants.GAMIFICATION_CONSTANTS.BADGE_CRITERIA,
    rewardTypes: driverConstants.GAMIFICATION_CONSTANTS.REWARD_TYPES,
  },
  staff: {
    actions: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS,
    maxPointsPerDay: staffConstants.STAFF_GAMIFICATION_CONSTANTS.MAX_POINTS_PER_DAY,
    pointExpiryDays: staffConstants.STAFF_GAMIFICATION_CONSTANTS.POINT_EXPIRY_DAYS,
    badgeCriteria: staffConstants.STAFF_GAMIFICATION_CONSTANTS.BADGE_CRITERIA,
    rewardTypes: staffConstants.STAFF_GAMIFICATION_CONSTANTS.REWARD_TYPES,
  },
  merchant: {
    actions: merchantConstants.GAMIFICATION_CONSTANTS.STAFF_ACTIONS,
    maxPointsPerDay: merchantConstants.GAMIFICATION_CONSTANTS.MAX_POINTS_PER_DAY,
    pointExpiryDays: merchantConstants.GAMIFICATION_CONSTANTS.POINT_EXPIRY_DAYS,
    badgeCriteria: merchantConstants.GAMIFICATION_CONSTANTS.BADGE_CRITERIA,
    rewardTypes: merchantConstants.GAMIFICATION_CONSTANTS.REWARD_TYPES,
  },
};

/**
 * Role-specific notification configuration.
 */
const roleNotificationConfig = {
  admin: {
    types: adminCoreConstants.NOTIFICATION_CONSTANTS?.NOTIFICATION_TYPES || ['gamification_update'],
    priority: adminCoreConstants.NOTIFICATION_CONSTANTS?.PRIORITY_LEVELS?.LOW || 'low',
  },
  customer: {
    types: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES,
    priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
  },
  driver: {
    types: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES,
    priority: driverConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
  },
  staff: {
    types: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES,
    priority: staffConstants.STAFF_NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
  },
  merchant: {
    types: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES,
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
  },
};

/**
 * Role-specific wallet transaction types.
 */
const roleWalletConfig = {
  admin: 'gamification_reward',
  customer: customerConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.cashback,
  driver: driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.earning,
  staff: staffConstants.STAFF_WALLET_CONSTANTS.TRANSACTION_TYPES.gamification_reward,
  merchant: merchantConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.payout,
};

/**
 * Awards points to a user for a specific action.
 * @param {string} userId - User ID.
 * @param {string} action - Action performed.
 * @param {number} points - Points to award.
 * @param {Object} metadata - Contains io, role, subRole, languageCode.
 * @returns {Object} Points record.
 */
async function awardPoints(userId, action, points, metadata) {
  const { io, role, subRole, languageCode } = metadata || {};
  if (!io) throw new Error('Socket.IO instance required');
  if (!userId || !role || !action || points < 0) throw new Error('Valid userId, role, action, and points required');

  const config = roleActionConfig[role];
  if (!config) throw new Error(`Unsupported role: ${role}`);

  const actionConfig = Object.values(config.actions).find(a => a.action === action);
  if (!actionConfig) throw new Error(`Invalid action for role ${role}: ${action}`);

  if (subRole && !Object.values(config.actions).some(a => a.action === action && (!a.roles || a.roles.includes(subRole)))) {
    throw new Error(`Action ${action} not allowed for sub-role ${subRole}`);
  }

  if (points > config.maxPointsPerDay) throw new Error(`Points exceed daily limit: ${config.maxPointsPerDay}`);

  const pointsRecord = await GamificationPoints.create({
    user_id: userId,
    role,
    sub_role: subRole || null,
    action,
    points,
    created_at: new Date(),
    updated_at: new Date(),
    expires_at: new Date(Date.now() + config.pointExpiryDays * 24 * 60 * 60 * 1000),
  });

  if (actionConfig.walletCredit) {
    await walletService.creditWallet({
      userId,
      role,
      amount: actionConfig.walletCredit,
      currency: customerConstants.CUSTOMER_SETTINGS.DEFAULT_CURRENCY,
      transactionType: roleWalletConfig[role],
      description: `Credit for ${actionConfig.name}`,
    });
  }

  await notificationService.sendNotification({
    userId,
    type: roleNotificationConfig[role].types.includes('gamification_update') ? 'gamification_update' : roleNotificationConfig[role].types[0],
    message: `Earned ${points} points for ${actionConfig.name}${actionConfig.walletCredit ? ` and $${actionConfig.walletCredit} credit` : ''}!`,
    priority: roleNotificationConfig[role].priority,
    languageCode: languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
  });

  await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.GAMIFICATION_POINTS_AWARDED, {
    userId,
    role,
    subRole,
    action,
    points,
    walletCredit: actionConfig.walletCredit || null,
  }, `${role}:${userId}`);

  // Check badge eligibility
  const badgeCriteria = Object.values(config.badgeCriteria).find(c => c.action === action);
  if (badgeCriteria) {
    const actionCount = await GamificationPoints.count({ where: { user_id: userId, role, action } });
    if (actionCount >= badgeCriteria.count) {
      await assignBadge(userId, badgeCriteria.badgeId, { io, role, languageCode });
    }
  }

  return pointsRecord;
}

/**
 * Assigns a badge to a user.
 * @param {string} userId - User ID.
 * @param {number} badgeId - Badge ID.
 * @param {Object} metadata - Contains io, role, languageCode.
 * @returns {Object} UserBadge record.
 */
async function assignBadge(userId, badgeId, metadata) {
  const { io, role, languageCode } = metadata || {};
  if (!io) throw new Error('Socket.IO instance required');
  if (!userId || !badgeId) throw new Error('Valid userId and badgeId required');

  const badge = await Badge.findByPk(badgeId);
  if (!badge) throw new Error(`Badge not found: ${badgeId}`);

  const existingBadge = await UserBadge.findOne({ where: { user_id: userId, badge_id: badgeId } });
  if (existingBadge) throw new Error('Badge already assigned');

  const userBadge = await UserBadge.create({
    user_id: userId,
    badge_id: badgeId,
    awarded_at: new Date(),
  });

  await notificationService.sendNotification({
    userId,
    type: roleNotificationConfig[role].types.includes('badge_earned') ? 'badge_earned' : roleNotificationConfig[role].types[0],
    message: `You earned the ${badge.name} badge!`,
    priority: roleNotificationConfig[role].priority,
    languageCode: languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
  });

  await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.GAMIFICATION_BADGE_AWARDED, {
    userId,
    badgeId,
    badgeName: badge.name,
  }, `${role}:${userId}`);

  return userBadge;
}

/**
 * Redeems points for a reward and credits the user's wallet.
 * @param {string} userId - User ID.
 * @param {number} rewardId - Reward ID.
 * @param {string} walletId - Wallet ID.
 * @param {Object} metadata - Contains io, role, languageCode.
 * @returns {Object} UserReward record.
 */
async function redeemPoints(userId, rewardId, walletId, metadata) {
  const { io, role, languageCode } = metadata || {};
  if (!io) throw new Error('Socket.IO instance required');
  if (!userId || !rewardId || !walletId) throw new Error('Valid userId, rewardId, and walletId required');

  const config = roleActionConfig[role];
  if (!config) throw new Error(`Unsupported role: ${role}`);

  const reward = await Reward.findByPk(rewardId);
  if (!reward || !reward.is_active) throw new Error(`Reward not found or inactive: ${rewardId}`);
  if (reward.type !== config.rewardTypes.WALLET_CREDIT) throw new Error(`Invalid reward type: ${reward.type}`);

  const totalPoints = await GamificationPoints.sum('points', {
    where: {
      user_id: userId,
      role,
      expires_at: { $gte: new Date() },
    },
  });
  if (totalPoints < reward.points_required) throw new Error(`Insufficient points: ${totalPoints}/${reward.points_required}`);

  // Mark points as spent by updating expires_at
  let pointsToDeduct = reward.points_required;
  const pointRecords = await GamificationPoints.findAll({
    where: {
      user_id: userId,
      role,
      expires_at: { $gte: new Date() },
    },
    order: [['created_at', 'ASC']],
  });

  for (const record of pointRecords) {
    if (pointsToDeduct <= 0) break;
    const deduct = Math.min(record.points, pointsToDeduct);
    record.points -= deduct;
    pointsToDeduct -= deduct;
    if (record.points === 0) {
      record.expires_at = new Date();
    }
    await record.save();
  }

  const userReward = await UserReward.create({
    user_id: userId,
    reward_id: rewardId,
    redeemed_at: new Date(),
    status: 'completed',
  });

  await walletService.creditWallet({
    userId,
    role,
    amount: reward.value.amount,
    currency: reward.value.currency || customerConstants.CUSTOMER_SETTINGS.DEFAULT_CURRENCY,
    transactionType: roleWalletConfig[role],
    description: `Reward: ${reward.name}`,
    walletId,
  });

  await notificationService.sendNotification({
    userId,
    type: roleNotificationConfig[role].types.includes('reward_redeemed') ? 'reward_redeemed' : roleNotificationConfig[role].types[0],
    message: `Redeemed ${reward.name} for ${reward.value.amount} ${reward.value.currency}!`,
    priority: roleNotificationConfig[role].priority,
    languageCode: languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
  });

  await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.GAMIFICATION_REWARD_REDEEMED, {
    userId,
    rewardId,
    rewardName: reward.name,
    amount: reward.value.amount,
    currency: reward.value.currency,
  }, `${role}:${userId}`);

  return userReward;
}

/**
 * Retrieves the leaderboard for a user's role.
 * @param {string} userId - User ID.
 * @param {Object} metadata - Contains role.
 * @returns {Array} Leaderboard entries.
 */
async function getLeaderboard(userId, metadata) {
  const { role } = metadata || {};
  if (!userId || !role) throw new Error('Valid userId and role required');
  if (!roleActionConfig[role]) throw new Error(`Unsupported role: ${role}`);

  const leaderboard = await GamificationPoints.findAll({
    attributes: [
      'user_id',
      [sequelize.fn('SUM', sequelize.col('points')), 'total_points'],
    ],
    where: {
      role,
      expires_at: { $gte: new Date() },
    },
    group: ['user_id'],
    order: [[sequelize.literal('total_points'), 'DESC']],
    limit: 10,
    raw: true,
  });

  return leaderboard.map((entry, index) => ({
    rank: index + 1,
    userId: entry.user_id,
    totalPoints: parseInt(entry.total_points, 10),
  }));
}

/**
 * Tracks a user's point history.
 * @param {string} userId - User ID.
 * @param {Object} metadata - Contains role.
 * @returns {Array} Point history records.
 */
async function trackPointHistory(userId, metadata) {
  const { role } = metadata || {};
  if (!userId || !role) throw new Error('Valid userId and role required');
  if (!roleActionConfig[role]) throw new Error(`Unsupported role: ${role}`);

  const history = await GamificationPoints.findAll({
    where: { user_id: userId, role },
    attributes: ['action', 'points', 'created_at', 'expires_at'],
    order: [['created_at', 'DESC']],
    limit: 50,
  });

  return history.map(record => ({
    action: record.action,
    points: record.points,
    createdAt: record.created_at,
    expiresAt: record.expires_at,
  }));
}

module.exports = {
  awardPoints,
  assignBadge,
  redeemPoints,
  getLeaderboard,
  trackPointHistory,
};