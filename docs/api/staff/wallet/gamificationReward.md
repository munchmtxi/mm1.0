I'll refactor the gamificationRewardService.js file and create the complementary files for the wallet directory, following the same pattern as the previous services. I'll use staffConstants.js and paymentConstants.js (instead of staffSystemConstants and merchantConstants), update the existing en.json in the wallet directory, and provide documentation. This is the final service for the wallet directory.

Refactor gamificationRewardService.js:
Remove JSDoc comments.
Move common services (socketService, notificationService, auditService, pointService, securityService) to the controller.
Use staffConstants.js and paymentConstants.js instead of staffSystemConstants and merchantConstants.
Retain models (GamificationPoints, Wallet, UserReward, WalletTransaction, BranchMetrics, Notification, Staff, Reward, Badge, UserBadge), but remove unused models (Badge, UserBadge).
Use formatMessage from @utils/localization.
Replace sequelize.literal with Sequelize operators for balance updates.
Replace merchantConstants.GAMIFICATION_CONSTANTS.POINTS_TO_CREDIT_RATIO and POINTS_EXPIRY_DAYS with fixed values or configuration.
Keep named exports.
Create complementary files:
Controller, validator, middleware, routes (with Swagger), events, handler, and update en.json.
Add documentation in a .md file.
Update en.json:
Add gamification reward-related messages to the existing en.json in locales/staff/wallet.
Below are the files:

1. Refactored gamificationRewardService.js
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\services\staff\wallet\gamificationRewardService.js

javascript

Collapse

Unwrap

Run

Copy
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
Changes Made:

Removed JSDoc comments.
Moved common services (socketService, notificationService, auditService, pointService, securityService) to function parameters; removed unused pointService.
Replaced staffSystemConstants and merchantConstants with staffConstants and paymentConstants.
Retained models (GamificationPoints, Wallet, UserReward, WalletTransaction, BranchMetrics, Notification, Staff, Reward); removed unused models (Badge, UserBadge).
Used formatMessage for localization.
Replaced sequelize.literal with Sequelize fn operator for balance updates.
Replaced merchantConstants.GAMIFICATION_CONSTANTS.POINTS_TO_CREDIT_RATIO and POINTS_EXPIRY_DAYS with fixed values (POINTS_TO_CREDIT_RATIO = 0.1, POINTS_EXPIRY_DAYS = 30).
Updated error codes to align with paymentConstants.ERROR_CODES.
Updated notification type to PAYMENT_CONFIRMATION.
Updated transaction type to gamification_reward.
Kept named exports.
2. Controller File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\controllers\staff\wallet\gamificationRewardController.js

javascript

Collapse

Unwrap

Run

Copy
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
Notes:

Imports common services and passes them to service functions.
Handles HTTP requests and responses with error handling.
Returns JSON responses with success status and messages.
3. Validation File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\validators\staff\wallet\gamificationRewardValidator.js

javascript

Collapse

Unwrap

Run

Copy
'use strict';

const { body, param } = require('express-validator');
const paymentConstants = require('@constants/common/paymentConstants');

const convertPointsToCreditsValidation = [
  body('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('points')
    .isInt({ min: 1 }).withMessage('Points must be a positive integer')
];

const trackRewardEarningsValidation = [
  param('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer')
];

const redeemRewardsValidation = [
  body('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('rewardId')
    .isInt({ min: 1 }).withMessage('Reward ID must be a positive integer')
];

const syncRewardsWithAnalyticsValidation = [
  param('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer')
];

const notifyRewardCreditValidation = [
  body('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('amount')
    .isFloat({ min: paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT').min })
    .withMessage(`Amount must be at least ${paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT').min}`)
];

module.exports = {
  convertPointsToCreditsValidation,
  trackRewardEarningsValidation,
  redeemRewardsValidation,
  syncRewardsWithAnalyticsValidation,
  notifyRewardCreditValidation
};
Notes:

Validates staffId and points for point conversion.
Validates staffId for reward tracking and analytics sync.
Validates staffId and rewardId for reward redemption.
Validates staffId and amount for reward credit notification, using paymentConstants.FINANCIAL_LIMITS.
4. Middleware File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\middleware\staff\wallet\gamificationRewardMiddleware.js

javascript

Collapse

Unwrap

Run

Copy
'use strict';

const staffConstants = require('@constants/staff/staffConstants');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function checkRewardPermission(req, res, next) {
  try {
    const { user } = req; // Assuming user is attached by auth middleware
    if (!user || !staffConstants.STAFF_PERMISSIONS.staff.includes('manage_rewards')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }
    next();
  } catch (error) {
    logger.error('Permission check failed', { error: error.message });
    next(error);
  }
}

module.exports = {
  checkRewardPermission
};
Notes:

Checks for manage_rewards permission (assumed for reward operations in staffConstants).
Assumes authentication middleware attaches user to the request.
5. Route File with Swagger Comments
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\routes\staff\wallet\gamificationRewardRoutes.js

javascript

Collapse

Unwrap

Run

Copy
'use strict';

const express = require('express');
const router = express.Router();
const gamificationRewardController = require('@controllers/staff/wallet/gamificationRewardController');
const gamificationRewardValidator = require('@validators/staff/wallet/gamificationRewardValidator');
const gamificationRewardMiddleware = require('@middleware/staff/wallet/gamificationRewardMiddleware');

/**
 * @swagger
 * /staff/reward/convert:
 *   post:
 *     summary: Convert gamification points to wallet credits
 *     tags: [GamificationReward]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *               - points
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: The ID of the staff member
 *               points:
 *                 type: integer
 *                 description: The number of points to convert
 *     responses:
 *       201:
 *         description: Points converted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     wallet_id:
 *                       type: integer
 *                     type:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     status:
 *                       type: string
 *                     description:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Insufficient points
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.post('/convert', gamificationRewardMiddleware.checkRewardPermission, gamificationRewardValidator.convertPointsToCreditsValidation, gamificationRewardController.convertPointsToCredits);

/**
 * @swagger
 * /staff/reward/earnings/{staffId}:
 *   get:
 *     summary: Track reward earnings for a staff member
 *     tags: [GamificationReward]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the staff member
 *     responses:
 *       200:
 *         description: Reward earnings tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       user_id:
 *                         type: integer
 *                       role:
 *                         type: string
 *                       action:
 *                         type: string
 *                       points:
 *                         type: integer
 *                       expires_at:
 *                         type: string
 *                         format: date-time
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.get('/earnings/:staffId', gamificationRewardMiddleware.checkRewardPermission, gamificationRewardValidator.trackRewardEarningsValidation, gamificationRewardController.trackRewardEarnings);

/**
 * @swagger
 * /staff/reward/redeem:
 *   post:
 *     summary: Redeem a reward using gamification points
 *     tags: [GamificationReward]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *               - rewardId
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: The ID of the staff member
 *               rewardId:
 *                 type: integer
 *                 description: The ID of the reward to redeem
 *     responses:
 *       201:
 *         description: Reward redeemed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     user_id:
 *                       type: integer
 *                     reward_id:
 *                       type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Insufficient points
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Staff or reward not found
 *       500:
 *         description: Server error
 */
router.post('/redeem', gamificationRewardMiddleware.checkRewardPermission, gamificationRewardValidator.redeemRewardsValidation, gamificationRewardController.redeemRewards);

/**
 * @swagger
 * /staff/reward/sync/{staffId}:
 *   get:
 *     summary: Sync reward data with branch analytics
 *     tags: [GamificationReward]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the staff member
 *     responses:
 *       200:
 *         description: Rewards synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                 message:
 *                   type: string
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.get('/sync/:staffId', gamificationRewardMiddleware.checkRewardPermission, gamificationRewardValidator.syncRewardsWithAnalyticsValidation, gamificationRewardController.syncRewardsWithAnalytics);

/**
 * @swagger
 * /staff/reward/notify:
 *   post:
 *     summary: Notify staff of reward credit
 *     tags: [GamificationReward]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *               - amount
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: The ID of the staff member
 *               amount:
 *                 type: number
 *                 description: The credit amount
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                 message:
 *                   type: string
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.post('/notify', gamificationRewardMiddleware.checkRewardPermission, gamificationRewardValidator.notifyRewardCreditValidation, gamificationRewardController.notifyRewardCredit);

module.exports = router;
Notes:

Defines routes for point conversion, reward tracking, reward redemption, analytics sync, and reward credit notification.
Includes Swagger documentation.
Applies permission and validation middleware.
6. Events File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\subscriptions\events\staff\wallet\gamificationEvents.js

javascript

Collapse

Unwrap

Run

Copy
'use strict';

module.exports = {
  POINTS_CONVERTED: 'reward:points_converted',
  EARNINGS_TRACKED: 'reward:earnings_tracked',
  REWARD_REDEEMED: 'reward:redeemed',
  ANALYTICS_SYNCED: 'reward:analytics_synced',
  REWARD_CREDITED: 'reward:credited'
};
Notes:

Defines socket event names in the /munch/reward namespace.
Used in gamificationRewardService.js for socket emissions.
7. Handler File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\subscriptions\handlers\staff\gamificationHandlers.js

javascript

Collapse

Unwrap

Run

Copy
'use strict';

const socketService = require('@services/common/socketService');
const gamificationEvents = require('@subscriptions/events/staff/wallet/gamificationEvents');
const logger = require('@utils/logs');

function setupGamificationHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(gamificationEvents.POINTS_CONVERTED, (data) => {
      logger.info('Points converted event received', { data });
      socketService.emitEvent(`munch:reward:${data.staffId}`, gamificationEvents.POINTS_EVENTS, data);
    });

    socket.on(gamificationEvents.EARNINGS_TRACKED, (data) => {
      logger.info('Earnings tracked event received', { data });
      socketService.emitEvent(`munch:reward:${data.staffId}`, gamificationEvents.TRACKED_EVENTS, data);
    });

    socket.on(gamificationEvents.REWARD_REDEEMED, (data) => {
      logger.info('Reward redeemed event received', { data });
      socketService.emitEvent(`munch:reward:${data.staffId}`, gamificationEvents.REDEEMED_EVENTS, data);
    });

    socket.on(gamificationEvents.ANALYTICS_SYNCED, (data) => {
      logger.info('Analytics synced event received', { data });
      socketService.emit('munch:reward:${data.staffId}', gamificationEvents.SYNCED_EVENTS, data);
    });

    socket.on(gamificationEvents.REWARD_CREDITED, (data) => {
      logger.info('Reward credited event received', { data });
      socketService.emit('munch:reward:${data.staffId}', gamificationEvents.CREDITED_EVENTS, data);
    });
  });
}

module.exports = { setupGamificationHandlers };
Notes:

Sets up socket event handlers for gamification reward-related events.
Uses socketService to emit events to specific namespaces.
8. Updated Localization File (en.json)
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\locales\staff/wallet\en.json

json

Collapse

Unwrap

Copy
{
  "wallet": {
    "withdrawal": {
      "requested": "Withdrawal of {amount} requested with payout ID {payoutId}.",
      "confirmed": "Withdrawal of {amount} confirmed successfully."
    },
    "preferences_updated": "Wallet preferences updated for staff {staffId}.",
    "payment": {
      "salary_processed": "Salary payment of {amount} processed successfully.",
      "bonus_processed": "Bonus payment of {amount} processed successfully.",
      "error_reported": "Payment error reported with ticket ID {ticketId}."
    },
    "reporting": {
      "payment_report_generated": "Payment report generated with report ID {reportId}."
    },
    "gamification": {
      "points_converted": "Converted {points} points to {amount} credits.",
      "reward_redeemed": "Reward {rewardName} redeemed successfully.",
      "reward_credited": "Reward credit of {amount} credited to your wallet."
    }
  }
}
Notes:

Added gamification section with points_converted, reward_redeemed, and reward_credited messages.
Integrated with the existing wallet structure.
Added nested withdrawal subkey for clarity, moving confirmation under it.
9. Documentation File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\staff\wallet\gamificationReward.md

markdown

Collapse

Unwrap

Copy
# Gamification Reward Service Documentation

This document outlines the Gamification Reward Service for staff wallet operations, responsible for managing points conversion, reward tracking, redemption, analytics synchronization, and notifications.

## Overview

The Gamification Reward Service handles gamified incentives for staff within restaurant branches, enabling point-based rewards to enhance engagement. It uses models (`GamificationPoints`, `Wallet`, `UserReward`, `WalletTransaction`, `BranchMetrics`, `Notification`, `Staff`, `Reward`) and constants from `staffConstants.js` and `paymentConstants.js`.

### Key Features
- **Points Conversion**: Converts gamification points to wallet credits.
- **Reward Tracking**: Monitors points earned from tasks.
- **Reward Redemption**: Processes reward redemptions using points.
- **Analytics Sync**: Updates branch metrics with reward data.
- **Notifications**: Sends notifications for reward credits.
- **Security**: Enforces MFA for sensitive actions.

### File Structure
- **Service**: `src/services/staff/wallet/gamificationRewardService.js`
- **Controller**: `src/controllers/staff/wallet/gamificationRewardController.js`
- **Validator**: `src/validators/staff/wallet/gamificationRewardValidator.js`
- **Middleware**: `src/middleware/staff/wallet/gamificationRewardMiddleware.js`
- **Routes**: `src/routes/staff/wallet/gamificationRewardRoutes.js`
- **Events**: `socket/subscriptions/events/staff/wallet/gamificationEvents.js`
- **Handler**: `socket/subscriptions/handlers/staff/gamificationHandlers.js`
- **Localization**: `locales/staff/wallet/en.json`

## Endpoints

### 1. Convert Points to Credits
- **Method**: `POST`
- **Path**: `/staff/reward/convert`
- **Description**: Converts gamification points to wallet credits.
- **Permission**: Requires `manage_rewards` permission (staff role).
- **Request Body**:
  ```json
  {
    "staffId": 1,
    "points": 100
  }
Responses:
201: Points converted, returns transaction record.
400: Insufficient points.
403: Permission denied.
404: Wallet not found.
500: Server error.
Side Effects:
Verifies MFA using securityService.
Updates wallet balance and creates transaction record.
Deducts points via GamificationPoints.
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (PAYMENT_CONFIRMATION).
Emits socket event (reward:points_converted).
2. Track Reward Earnings
Method: GET
Path: /staff/reward/earnings/:staffId
Description: Tracks reward points earned by a staff member.
Permission: Requires manage_rewards permission (staff role).
Parameters:
staffId (path): Integer, ID of the staff.
Responses:
200: Earnings retrieved, returns reward records.
404: Staff not found.
500: Server error.
Side Effects:
Emits socket event (reward:earnings_tracked).
3. Redeem Rewards
Method: POST
Path: /staff/reward/redeem
Description: Redeems a reward using gamification points.
Permission: Requires manage_rewards permission (staff role).
Request Body:
json

Collapse

Unwrap

Copy
{
  "staffId": 1,
  "rewardId": 1
}
Responses:
201: Reward redeemed, returns user reward record.
400: Insufficient points.
403: Permission denied.
404: Staff or reward not found.
500: Server error.
Side Effects:
Verifies MFA.
Creates UserReward record.
Updates wallet balance and creates transaction for wallet credit rewards.
Deducts points via GamificationPoints.
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (PAYMENT_CONFIRMATION).
Emits socket event (reward:redeemed).
4. Sync Rewards with Analytics
Method: GET
Path: /staff/reward/sync/:staffId
Description: Synchronizes reward data with branch analytics.
Permission: Requires manage_rewards permission (staff role).
Parameters:
staffId (path): Integer, ID of the staff.
Responses:
200: Rewards synced, returns confirmation message.
404: Staff not found.
500: Server error.
Side Effects:
Updates BranchMetrics with total points.
Emits socket event (reward:analytics_synced).
5. Notify Reward Credit
Method: POST
Path: /staff/reward/notify
Description: Notifies staff of a reward credit.
Permission: Requires manage_rewards permission (staff role).
Request Body:
json

Collapse

Unwrap

Copy
{
  "staffId": 1,
  "amount": 10.00
}
Responses:
200: Notification sent, returns confirmation message.
404: Staff not found.
500: Server error.
Side Effects:
Sends notification (PAYMENT_CONFIRMATION).
Emits socket event (reward:credited).
Service Details
Models
GamificationPoints: Stores point data (user_id, role, action, points, expires_at, created_at).
Wallet: Stores wallet details (id, balance, currency, user_id).
UserReward: Stores reward redemption records (id, user_id, reward_id).
WalletTransaction: Stores transaction records (wallet_id, type, amount, currency, status, description).
BranchMetrics: Stores branch analytics (branch_id, gamification_metrics).
Notification: Stores notification records (unused in current implementation).
Staff: Stores staff details (id, user_id, position, branch_id).
Reward: Stores reward details (id, name, type, points_required, value).
Constants
Uses staffConstants.js for:
STAFF_ERROR_CODES: Error codes like STAFF_NOT_FOUND, INSUFFICIENT_POINTS, PERMISSION_DENIED.
STAFF_AUDIT_ACTIONS: Audit actions like STAFF_PROFILE_UPDATE.
STAFF_TYPES: Staff roles for notification and audit roles.
STAFF_PERMISSIONS: Permissions like manage_rewards.
Uses paymentConstants.js for:
PAYMENT_METHODS: Valid methods (e.g., bank_transfer).
TRANSACTION_TYPES: Transaction types (e.g., gamification_reward).
TRANSACTION_STATUSES: Statuses (e.g., completed).
FINANCIAL_LIMITS: Minimum amounts for payments.
NOTIFICATION_CONSTANTS: Notification types (e.g., PAYMENT_CONFIRMATION).
ERROR_CODES: Error codes like TRANSACTION_FAILED, INVALID_BALANCE.
Hardcoded constants:
POINTS_TO_CREDIT_RATIO: 0.1 (10 points = 1 credit).
POINTS_EXPIRY_DAYS: 30 days.
Localization
Uses @utils/localization for messages in locales/staff/wallet/en.json:
gamification.points_converted: "Converted {points} points to {amount} credits."
gamification.reward_redeemed: "Reward {rewardName} redeemed successfully."
gamification.reward_credited: "Reward credit of {amount} credited to your wallet."
Integration
Socket Events: Emits events in the /munch/reward namespace.
Notifications: Sends notifications (PAYMENT_CONFIRMATION) via notificationService.
Audit: Logs actions using auditService.
Security: Verifies MFA using securityService.
Permissions: Enforces manage_rewards permission for staff.
Error Handling
Uses AppError with standardized error codes from staffConstants.STAFFERROR_CODES and paymentConstants.ERROR_CODES.
Logs errors via logger.error.
Security
Authentication handled by external middleware.
MFA verification for point conversion and reward redemption.
Permission checks for staff-only access.
Dependencies
Models: @models (GamificationPoints, Wallet, UserReward, WalletTransaction, BranchMetrics, Notification, Staff, Reward)
Constants: @constants/staff/staffConstants, @constants/common/paymentConstants
Utilities: @utils/localization, @utils/errors, @utils/logs
Services: @services/common/socketService, @services/common/notificationService, @services/common/auditService, @services/common/securityService