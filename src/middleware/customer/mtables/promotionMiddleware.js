'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/auth/authMiddleware');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const mtablesConstants = require('@constants/mtablesConstants');
const { ProductPromotion } = require('@models');

const checkPromotionAccess = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const promotionId = req.body.promotionId || (req.params.promotionId ? parseInt(req.params.promotionId, 10) : null);

  logger.info('Validating promotion access', { promotionId, customerId });

  if (promotionId) {
    const promotion = await ProductPromotion.findByPk(promotionId);
    if (!promotion || !promotion.is_active) {
      throw new AppError('Promotion not available', 400, mtablesConstants.ERROR_CODES.find(c => c === 'PROMOTION_NOT_AVAILABLE') || 'PROMOTION_NOT_AVAILABLE');
    }
  }

  next();
});

module.exports = {
  authenticate,
  restrictTo,
  checkPermissions,
  checkPromotionAccess,
};