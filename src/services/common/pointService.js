'use strict';

/**
 * Point Service
 * Manages automatic awarding of points and badges for customer, driver, staff, and merchant roles
 * when specific actions are triggered in controllers. Integrates with notifications, wallet, and socket services.
 * Last Updated: June 25, 2025
 */

const { GamificationPoints, Badge, UserBadge } = require('@models');
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
  const res = { status: () => ({ json: (data) => data }) };
  const next = (err) => { throw err; };
  return (await walletService.creditWalletForReward(req, res, next)).data;
}

const roleActionConfig = {
  customer: {
    actions: customerConstants.GAMIFICATION_ACTIONS,
    maxPointsPerDay: customerConstants.GAMIFICATION_SETTINGS.MAX_DAILY_ACTIONS * 15,
    pointExpiryDays: customerConstants.GAMIFICATION_SETTINGS.POINTS_EXPIRY_DAYS,
    badgeCriteria: customerConstants.ACHIEVEMENT_TYPES.reduce((acc, a) => ({ ...acc, [a.id]: a.criteria }), {}),
    rewardTypes: customerConstants.GAMIFICATION_SETTINGS.REWARD_CATEGORIES.reduce((acc, r) => ({ ...acc, [r.toUpperCase()]: r }), {}),
  },
  driver: {
    actions: driverConstants.GAMIFICATION_ACTIONS,
    maxPointsPerDay: driverConstants.GAMIFICATION_SETTINGS.MAX_DAILY_ACTIONS * 20,
    pointExpiryDays: driverConstants.GAMIFICATION_SETTINGS.POINTS_EXPIRY_DAYS,
    badgeCriteria: {}, // Extend if driver achievements are added
    rewardTypes: driverConstants.GAMIFICATION_SETTINGS.REWARD_CATEGORIES.reduce((acc, r) => ({ ...acc, [r.toUpperCase()]: r }), {}),
  },
  staff: {
    actions: Object.values(staffConstants.GAMIFICATION_ACTIONS).flat(),
    maxPointsPerDay: staffConstants.GAMIFICATION_SETTINGS.MAX_DAILY_ACTIONS * 15,
    pointExpiryDays: staffConstants.GAMIFICATION_SETTINGS.POINTS_EXPIRY_DAYS,
    badgeCriteria: staffConstants.ACHIEVEMENT_TYPES.reduce((acc, a) => ({ ...acc, [a.id]: a.criteria }), {}),
    rewardTypes: staffConstants.REWARD_CATEGORIES.reduce((acc, r) => ({ ...acc, [r.type.toUpperCase()]: r.type }), {}),
  },
  merchant: {
    actions: [
      ...merchantConstants.GAMIFICATION_ACTIONS.GENERAL,
      ...merchantConstants.GAMIFICATION_ACTIONS.BAKERY_SPECIFIC,
      ...merchantConstants.GAMIFICATION_ACTIONS.BUTCHER_SPECIFIC,
      ...merchantConstants.GAMIFICATION_ACTIONS.CAFE_SPECIFIC,
      ...merchantConstants.GAMIFICATION_ACTIONS.CATERER_SPECIFIC,
      ...merchantConstants.GAMIFICATION_ACTIONS.DARK_KITCHEN_SPECIFIC,
      ...merchantConstants.GAMIFICATION_ACTIONS.GROCERY_SPECIFIC,
      ...merchantConstants.GAMIFICATION_ACTIONS.PARKING_LOT_SPECIFIC,
      ...merchantConstants.GAMIFICATION_ACTIONS.RESTAURANT_SPECIFIC,
    ],
    maxPointsPerDay: merchantConstants.GAMIFICATION_SETTINGS.MAX_DAILY_ACTIONS * 20,
    pointExpiryDays: merchantConstants.GAMIFICATION_SETTINGS.POINTS_EXPIRY_DAYS,
    badgeCriteria: merchantConstants.ACHIEVEMENT_TYPES.reduce((acc, a) => ({ ...acc, [a.id]: a.criteria }), {}),
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

async function awardPoints(userId, action, points, metadata = {}) {
  const { io, role, subRole, languageCode, walletId } = metadata;
  if (!io || !userId || !role || !action || points < 0) throw new Error('Missing or invalid parameters');

  const config = roleActionConfig[role];
  if (!config) throw new Error(`Unsupported role: ${role}`);

  const actionConfig = config.actions.find(a => a.action === action);
  if (!actionConfig) throw new Error(`Invalid action for role ${role}: ${action}`);

  if (subRole && actionConfig.roles && !actionConfig.roles.includes(subRole) && actionConfig.roles[0] !== 'all') {
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

  if (actionConfig.walletCredit && walletId) {
    await creditWalletWrapper({
      userId,
      amount: actionConfig.walletCredit,
      currency: localizationConstants.DEFAULT_CURRENCY,
      description: `Credit for ${actionConfig.name}`,
      walletId,
    });
  }

  const notificationType = roleNotificationConfig[role].types.includes('points_earned') ? 'points_earned' : roleNotificationConfig[role].types[0];
  await notificationService.sendNotification({
    userId,
    notificationType,
    messageKey: 'gamification.points_earned',
    messageParams: { points, actionName: actionConfig.name, walletCredit: actionConfig.walletCredit || '' },
    priority: roleNotificationConfig[role].priority,
    languageCode: languageCode || localizationConstants.DEFAULT_LANGUAGE,
  });

  await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.GAMIFICATION_POINTS_AWARDED, {
    userId,
    role,
    subRole,
    action,
    points,
    walletCredit: actionConfig.walletCredit || null,
  }, `${role}:${userId}`, languageCode || localizationConstants.DEFAULT_LANGUAGE);

  const badgeCriteria = config.badgeCriteria[badgeId];
  if (badgeCriteria && badgeCriteria.action === action) {
    const actionCount = await GamificationPoints.count({ where: { user_id: userId, role, action } });
    if (actionCount >= badgeCriteria.count) {
      await assignBadge(userId, badgeCriteria.id, { io, role, languageCode });
    }
  }

  return pointsRecord;
}

async function assignBadge(userId, badgeId, metadata = {}) {
  const { io, role, languageCode } = metadata;
  if (!io || !userId || !badgeId) throw new Error('Missing or invalid parameters');

  const badge = await Badge.findOne({ where: { name: badgeId } });
  if (!badge) throw new Error(`Badge not found: ${badgeId}`);

  const existingBadge = await UserBadge.findOne({ where: { user_id: userId, badge_id: badge.id } });
  if (existingBadge) throw new Error('Badge already assigned');

  const userBadge = await UserBadge.create({
    user_id: userId,
    badge_id: badge.id,
    awarded_at: new Date(),
  });

  const notificationType = roleNotificationConfig[role].types.includes('achievement_unlocked') ? 'achievement_unlocked' : roleNotificationConfig[role].types[0];
  await notificationService.sendNotification({
    userId,
    notificationType,
    messageKey: 'gamification.badge_earned',
    messageParams: { badgeName: badge.name },
    priority: roleNotificationConfig[role].priority,
    languageCode: languageCode || localizationConstants.DEFAULT_LANGUAGE,
  });

  await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.GAMIFICATION_BADGE_AWARDED, {
    userId,
    badgeId: badge.id,
    badgeName: badge.name,
  }, `${role}:${userId}`, languageCode || localizationConstants.DEFAULT_LANGUAGE);

  return userBadge;
}

module.exports = { awardPoints, assignBadge };