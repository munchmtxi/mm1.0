'use strict';

/**
 * Gamification Service
 * Manages point redemption, leaderboards, point history for customer, driver, staff, merchant roles.
 * Last Updated: June 25, 2025
 */

const { sequelize } = require('@models');
const { GamificationPoints, Reward, UserReward } = require('@models');
const merchantConstants = require('@constants/merchant/merchantGamificationConstants');
const driverConstants = require('@constants/driver/driverGamificationConstants');
const customerConstants = require('@constants/customer/customerGamificationConstants');
const staffConstants = require('@constants/staff/staffGamificationConstants');
const socketConstants = require('@constants/common/socketConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const walletService = require('@services/common/walletService');

// Wrapper for walletService.creditWalletForReward
async function creditWalletWrapper({ userId, amount, currency, description, walletId }) {
  const req = {
    body: {
      walletId,
      amount,
      rewardId: `gamification-${userId}-${Date.now()}`,
      description,
      languageCode: localizationConstants.DEFAULT_LANGUAGE,
    },
  };
  const res = {
    status: () => ({ json: (data) => data }),
  };
  const next = (err) => { throw err; };
  return (await walletService.creditWalletForReward(req, res, next)).data;
}

const roleActionConfig = {
  customer: {
    actions: customerConstants.GAMIFICATION_ACTIONS.map(a => a.action),
    maxPointsPerDay: customerConstants.GAMIFICATION_SETTINGS.MAX_DAILY_ACTIONS * 15,
    pointExpiryDays: customerConstants.GAMIFICATION_SETTINGS.POINTS_EXPIRY_DAYS,
    rewardTypes: customerConstants.GAMIFICATION_SETTINGS.REWARD_CATEGORIES.reduce((acc, r) => ({ ...acc, [r.toUpperCase()]: r }), {}),
  },
  driver: {
    actions: driverConstants.GAMIFICATION_ACTIONS.map(a => a.action),
    maxPointsPerDay: driverConstants.GAMIFICATION_SETTINGS.MAX_DAILY_ACTIONS * 20,
    pointExpiryDays: driverConstants.GAMIFICATION_SETTINGS.POINTS_EXPIRY_DAYS,
    rewardTypes: driverConstants.GAMIFICATION_SETTINGS.REWARD_CATEGORIES.reduce((acc, r) => ({ ...acc, [r.toUpperCase()]: r }), {}),
  },
  staff: {
    actions: Object.values(staffConstants.GAMIFICATION_ACTIONS).flat().map(a => a.action),
    maxPointsPerDay: staffConstants.GAMIFICATION_SETTINGS.MAX_DAILY_ACTIONS * 15,
    pointExpiryDays: staffConstants.GAMIFICATION_SETTINGS.POINTS_EXPIRY_DAYS,
    rewardTypes: staffConstants.REWARD_CATEGORIES.reduce((acc, r) => ({ ...acc, [r.type.toUpperCase()]: r.type }), {}),
  },
  merchant: {
    actions: Object.values(merchantConstants.GAMIFICATION_ACTIONS).flat().map(a => a.action),
    maxPointsPerDay: merchantConstants.GAMIFICATION_SETTINGS.MAX_DAILY_ACTIONS * 20,
    pointExpiryDays: merchantConstants.GAMIFICATION_SETTINGS.POINTS_EXPIRY_DAYS,
    rewardTypes: merchantConstants.REWARD_CATEGORIES.reduce((acc, r) => ({ ...acc, [r.type.toUpperCase()]: r.type }), {}),
  },
};

const roleNotificationConfig = {
  customer: {
    types: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES,
    priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
  },
  driver: {
    types: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES,
    priority: driverConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
  },
  staff: {
    types: staffConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES,
    priority: staffConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
  },
  merchant: {
    types: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES,
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
  },
};

async function redeemPoints(userId, rewardId, walletId, metadata = {}) {
  const { io, role, languageCode } = metadata;
  if (!io || !role || !userId || !rewardId || !walletId) throw new Error('Missing required parameters');

  const config = roleActionConfig[role];
  if (!config) throw new Error(`Unsupported role: ${role}`);

  const reward = await Reward.findByPk(rewardId);
  if (!reward || !reward.is_active) throw new Error('Reward not found or inactive');
  if (!config.rewardTypes[reward.type.toUpperCase()]) throw new Error(`Invalid reward type: ${reward.type}`);

  const totalPoints = await GamificationPoints.sum('points', {
    where: { user_id: userId, role, expires_at: { [sequelize.Op.gte]: new Date() } },
  });
  if (totalPoints < reward.points_required) throw new Error(`Insufficient points: ${totalPoints}/${reward.points_required}`);

  let pointsToDeduct = reward.points_required;
  const pointRecords = await GamificationPoints.findAll({
    where: { user_id: userId, role, expires_at: { [sequelize.Op.gte]: new Date() } },
    order: [['created_at', 'ASC']],
  });

  for (const record of pointRecords) {
    if (pointsToDeduct <= 0) break;
    const deduct = Math.min(record.points, pointsToDeduct);
    record.points -= deduct;
    pointsToDeduct -= deduct;
    if (record.points === 0) record.expires_at = new Date();
    await record.save();
  }

  const userReward = await UserReward.create({
    user_id: userId,
    reward_id: rewardId,
    redeemed_at: new Date(),
    status: 'completed',
  });

  await creditWalletWrapper({
    userId,
    amount: reward.value.amount,
    currency: reward.value.currency || localizationConstants.DEFAULT_CURRENCY,
    description: `Reward: ${reward.name}`,
    walletId,
  });

  const notificationType = roleNotificationConfig[role].types.includes('reward_redeemed') ? 'reward_redeemed' : roleNotificationConfig[role].types[0];
  await notificationService.sendNotification({
    userId,
    notificationType,
    messageKey: 'gamification.reward_redeemed',
    messageParams: { rewardName: reward.name, amount: reward.value.amount, currency: reward.value.currency },
    priority: roleNotificationConfig[role].priority,
    languageCode: languageCode || localizationConstants.DEFAULT_LANGUAGE,
  });

  await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.GAMIFICATION_REWARD_REDEEMED, {
    userId,
    rewardId,
    rewardName: reward.name,
    amount: reward.value.amount,
    currency: reward.value.currency,
    role,
  }, `${role}:${userId}`, languageCode || localizationConstants.DEFAULT_LANGUAGE);

  return userReward;
}

async function getLeaderboard(userId, metadata = {}) {
  const { role } = metadata;
  if (!userId || !role) throw new Error('Missing userId or role');
  if (!roleActionConfig[role]) throw new Error(`Unsupported role: ${role}`);

  const leaderboard = await GamificationPoints.findAll({
    attributes: [
      'user_id',
      [sequelize.fn('SUM', sequelize.col('points')), 'total_points'],
    ],
    where: { role, expires_at: { [sequelize.Op.gte]: new Date() } },
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

async function trackPointHistory(userId, metadata = {}) {
  const { role } = metadata;
  if (!userId || !role) throw new Error('Missing userId or role');
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

module.exports = { redeemPoints, getLeaderboard, trackPointHistory };