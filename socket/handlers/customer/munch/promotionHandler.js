'use strict';

const socketService = require('@services/common/socketService');
const promotionEvents = require('@socket/events/customer/munch/promotionEvents');
const logger = require('@utils/logger');

const handlePromotionRedeemed = async (io, data) => {
  const { promotionId, discountAmount, redemptionId, customerId } = data;
  await socketService.emit(io, promotionEvents.PROMOTION_REDEEMED, { promotionId, discountAmount, redemptionId, customerId }, `customer:${customerId}`);
  logger.info('Promotion redeemed event emitted', { promotionId, customerId });
};

module.exports = { handlePromotionRedeemed };