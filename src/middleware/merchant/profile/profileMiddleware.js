'use strict';

const { Merchant, MerchantBranch } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const profileValidator = require('@validators/merchant/profile/profileValidator');
const { authenticate, restrictTo } = require('@middleware/common/authMiddleware');
const Joi = require('joi');
const catchAsync = require('@utils/catchAsync');

module.exports = {
  protect: [authenticate, restrictTo('merchant')],

  verifyMerchantProfile: catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    logger.info('verifyMerchantProfile middleware', { userId });

    const merchant = await Merchant.findOne({ where: { user_id: userId } });
    if (!merchant) {
      logger.logWarnEvent('Merchant profile not found', { userId });
      throw new AppError('Merchant profile not found', 404, 'MERCHANT_NOT_FOUND');
    }

    req.merchant = merchant;
    next();
  }),

  verifyBranchOwnership: catchAsync(async (req, res, next) => {
    const userId = req.user.id;
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
        message: 'The branch does not belong to the merchant',
      });
      throw new AppError('You do not own this branch', 403, 'UNAUTHORIZED_BRANCH');
    }

    req.branch = branch;
    next();
  }),

  validate: (validatorName) => catchAsync(async (req, res, next) => {
    if (!profileValidator[validatorName]) {
      throw new AppError('Invalid validator', 500, 'INVALID_VALIDATOR');
    }

    logger.debug('Validating request data', {
      validatorName,
      body: req.body,
      params: req.params,
      query: req.query,
    });

    const schema = profileValidator[validatorName];

    // For array-based validators like bulkUpdateBranches, validate req.body directly
    let error;
    if (validatorName === 'bulkUpdateBranches') {
      ({ error } = schema.validate(req.body, { abortEarly: false }));
    } else {
      const data = {
        ...req.body,
        ...req.params,
        ...req.query,
      };
      ({ error } = schema.validate(data, { abortEarly: false }));
    }

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message).join(', ');
      logger.error('Validation failed', {
        userId: req.user.id,
        validatorName,
        errors: errorMessages,
      });
      throw new AppError(`Validation failed: ${errorMessages}`, 400, 'VALIDATION_FAILED');
    }

    next();
  }),

  verifyBulkBranches: catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const updateData = req.body;

    logger.debug('Verifying bulk branches', { userId, updateData });

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
          message: `Branch ${update.branchId} is either not found or does not belong to the merchant`,
        });
        throw new AppError(`Invalid or unauthorized branch ID: ${update.branchId}`, 400, 'INVALID_BRANCH');
      }
    }

    next();
  }),
};