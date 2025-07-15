'use strict';

const gamificationRewardService = require('@services/staff/wallet/gamificationRewardService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function convertPointsToCredits(req, res, next) {
  try {
    const { staffId, points } = req.body;
    const ipAddress = req.ip;
    const transaction = await gamificationRewardService.convertPointsToCredits(staffId, points, ipAddress, securityService, notificationService, auditService, socketService);
    return res.status(201).json({
      success: true,
      data: transaction,
      message: 'Points converted to credits successfully'
    });
  } catch (error) {
    logger.error('Points conversion failed', { error: error.message });
    next(error);
  }
}

async function trackRewardEarnings(req, res, next) {
  try {
    const { staffId } = req.params;
    const rewards = await gamificationRewardService.trackRewardEarnings(staffId, socketService);
    return res.status(200).json({
      success: true,
      data: rewards,
      message: 'Reward earnings tracked successfully'
    });
  } catch (error) {
    logger.error('Reward tracking failed', { error: error.message });
    next(error);
  }
}

async function redeemRewards(req, res, next) {
  try {
    const { staffId, rewardId } = req.body;
    const ipAddress = req.ip;
    const userReward = await gamificationRewardService.redeemRewards(staffId, rewardId, ipAddress, securityService, notificationService, auditService, socketService);
    return res.status(201).json({
      success: true,
      data: userReward,
      message: 'Reward redeemed successfully'
    });
  } catch (error) {
    logger.error('Reward redemption failed', { error: error.message });
    next(error);
  }
}

async function syncRewardsWithAnalytics(req, res, next) {
  try {
    const { staffId } = req.params;
    const result = await gamificationRewardService.syncRewardsWithAnalytics(staffId, socketService);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Rewards synced with analytics successfully'
    });
  } catch (error) {
    logger.error('Reward analytics sync failed', { error: error.message });
    next(error);
  }
}

async function notifyRewardCredit(req, res, next) {
  try {
    const { staffId, amount } = req.body;
    const result = await gamificationRewardService.notifyRewardCredit(staffId, amount, notificationService, socketService);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Reward credit notification sent successfully'
    });
  } catch (error) {
    logger.error('Reward credit notification failed', { error: error.message });
    next(error);
  }
}

module.exports = {
  convertPointsToCredits,
  trackRewardEarnings,
  redeemRewards,
  syncRewardsWithAnalytics,
  notifyRewardCredit
};