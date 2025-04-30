'use strict';

const driverTipService = require('@services/driver/mtxi/tipService');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const confirmTip = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;
  const payment = await driverTipService.confirmTip(req.user.id, parseInt(paymentId));
  logger.info('Driver confirmed tip', { paymentId, driverId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { payment },
  });
});

module.exports = { confirmTip };