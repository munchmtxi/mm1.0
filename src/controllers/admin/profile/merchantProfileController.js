'use strict';

/**
 * Merchant Profile Controller
 * Handles HTTP requests for admin merchant profile operations, interfacing with the merchant profile service
 * and returning formatted responses.
 */

const merchantProfileService = require('@services/admin/profile/merchantProfileService');
const { SUCCESS_MESSAGES } = require('@constants/merchant/merchantConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const createMerchant = catchAsync(async (req, res) => {
  const merchant = await merchantProfileService.createMerchant(req.body, req.io);
  logger.info('Merchant created', { merchantId: merchant.id });
  res.status(201).json({
    status: 'success',
    message: SUCCESS_MESSAGES.MERCHANT_CREATED,
    data: merchant,
  });
});

const updateBusinessDetails = catchAsync(async (req, res) => {
  const merchant = await merchantProfileService.updateBusinessDetails(req.params.merchantId, req.body, req.io);
  logger.info('Merchant business details updated', { merchantId: req.params.merchantId });
  res.status(200).json({
    status: 'success',
    message: 'Merchant business details updated successfully',
    data: merchant,
  });
});

const setCountrySettings = catchAsync(async (req, res) => {
  const merchant = await merchantProfileService.setCountrySettings(req.params.merchantId, req.body.country, req.io);
  logger.info('Merchant country settings updated', { merchantId: req.params.merchantId, country: req.body.country });
  res.status(200).json({
    status: 'success',
    message: 'Merchant country settings updated successfully',
    data: merchant,
  });
});

const manageBranchSettings = catchAsync(async (req, res) => {
  const branch = await merchantProfileService.manageBranchSettings(req.params.branchId, req.body, req.io);
  logger.info('Branch settings updated', { branchId: req.params.branchId });
  res.status(200).json({
    status: 'success',
    message: 'Branch settings updated successfully',
    data: branch,
  });
});

const uploadMedia = catchAsync(async (req, res) => {
  const merchant = await merchantProfileService.uploadMedia(req.params.merchantId, req.body, req.io);
  logger.info('Merchant media uploaded', { merchantId: req.params.merchantId });
  res.status(200).json({
    status: 'success',
    message: 'Merchant media uploaded successfully',
    data: merchant,
  });
});

const manageWalletSettings = catchAsync(async (req, res) => {
  const merchant = await merchantProfileService.manageWalletSettings(req.params.merchantId, req.params.walletId, req.body, req.io);
  logger.info('Merchant wallet settings updated', { merchantId: req.params.merchantId, walletId: req.params.walletId });
  res.status(200).json({
    status: 'success',
    message: 'Merchant wallet settings updated successfully',
    data: merchant,
  });
});

module.exports = {
  createMerchant,
  updateBusinessDetails,
  setCountrySettings,
  manageBranchSettings,
  uploadMedia,
  manageWalletSettings,
};