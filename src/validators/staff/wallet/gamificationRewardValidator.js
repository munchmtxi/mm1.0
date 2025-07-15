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