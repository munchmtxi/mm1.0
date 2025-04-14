'use strict';

const { Merchant, MerchantBranch } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const profileValidator = require('@validators/merchant/profile/profileValidator');
const { authenticate, restrictTo } = require('@middleware/common/authMiddleware');
const Joi = require('joi');
const catchAsync = require('@utils/catchAsync');

module.exports = {
  /**
   * Apply authentication and restrict to merchant role
   */
  protect: [authenticate, restrictTo('merchant')],

  /**
   * Validate merchant profile exists
   */
  verifyMerchantProfile: catchAsync(async (req, res, next) => {
    const userId = req.user.id; // Changed from req.user.userId
    logger.info('verifyMerchantProfile middleware', { userId });

    const merchant = await Merchant.findOne({ where: { user_id: userId } });
    if (!merchant) {
      logger.logWarnEvent('Merchant profile not found', { userId });
      throw new AppError('Merchant profile not found', 404, 'MERCHANT_NOT_FOUND');
    }

    req.merchant = merchant; // Attach merchant to request
    next();
  }),

  /**
   * Validate branch ownership for branch-specific routes
   */
  verifyBranchOwnership: catchAsync(async (req, res, next) => {
    const userId = req.user.id; // Changed from req.user.userId
    const branchId = parseInt(req.params.branchId, 10);

    if (isNaN(branchId)) {
      throw new AppError('Invalid branch ID', 400, 'INVALID_BRANCH_ID');
    }

    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch) {
      logger.logWarnEvent('Branch not found', { branchId, userId });
      throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
    }

    const merchant = await Merchant.findOne({ where: { user_id: userId } });
    if (branch.merchant_id !== merchant.id) {
      logger.logWarnEvent('Unauthorized branch access', {
        userId,
        branchId,
        merchantId: branch.merchant_id,
        message: 'The branch does not belong to the merchant'
      });
      throw new AppError('You do not own this branch', 403, 'UNAUTHORIZED_BRANCH');
    }

    req.branch = branch; // Attach branch to request
    next();
  }),

  /**
   * Validate request data using Joi schemas
   * @param {string} validatorName
   */
  validate: (validatorName) => catchAsync(async (req, res, next) => {
    if (!profileValidator[validatorName]) {
      throw new AppError('Invalid validator', 500, 'INVALID_VALIDATOR');
    }

    const schema = profileValidator[validatorName];
    const data = {
      ...req.body,
      ...req.params,
      ...req.query,
    };

    const { error } = schema.validate(data, { abortEarly: false });
    if (error) {
      const errorMessages = error.details.map((detail) => detail.message).join(', ');
      logger.logValidationError('Validation failed', {
        userId: req.user.id, // Changed from req.user.userId
        errors: error.details.map(detail => detail.message).join(', '),
      });      
      throw new AppError(`Validation failed: ${errorMessages}`, 400, 'VALIDATION_FAILED');
    }

    next();
  }),

  /**
   * Validate multiple branches for bulk update
   */
  verifyBulkBranches: catchAsync(async (req, res, next) => {
    const userId = req.user.id; // Changed from req.user.userId
    const updateData = req.body;

    const merchant = await Merchant.findOne({ where: { user_id: userId } });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    for (const update of updateData) {
      const branch = await MerchantBranch.findByPk(update.branchId);
      if (!branch || branch.merchant_id !== merchant.id) {
        logger.logWarnEvent('Invalid or unauthorized branch in bulk update', {
          branchId: update.branchId,
          userId,
          status: 'unauthorized',
          message: `Branch ${update.branchId} is either not found or does not belong to the merchant`
        });
        throw new AppError(`Invalid or unauthorized branch ID: ${update.branchId}`, 400, 'INVALID_BRANCH');
      }
    }

    next();
  }),
};