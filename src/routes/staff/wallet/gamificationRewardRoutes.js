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