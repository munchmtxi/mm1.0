'use strict';

/**
 * Customer Profile Controller
 * Handles HTTP requests for admin customer profile operations, interfacing with the customer profile service
 * and returning formatted responses.
 */

const customerProfileService = require('@services/admin/profile/customerProfileService');
const { SUCCESS_MESSAGES } = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const createCustomer = catchAsync(async (req, res) => {
  const customer = await customerProfileService.createCustomer(req.body, req.io);
  logger.info('Customer created', { customerId: customer.id });
  res.status(201).json({
    status: 'success',
    message: SUCCESS_MESSAGES.CUSTOMER_REGISTERED,
    data: customer,
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const customer = await customerProfileService.updateProfile(req.params.userId, req.body, req.io);
  logger.info('Customer profile updated', { userId: req.params.userId });
  res.status(200).json({
    status: 'success',
    message: 'Customer profile updated successfully',
    data: customer,
  });
});

const setCountry = catchAsync(async (req, res) => {
  const customer = await customerProfileService.setCountry(req.params.userId, req.body.country, req.io);
  logger.info('Customer country set', { userId: req.params.userId, country: req.body.country });
  res.status(200).json({
    status: 'success',
    message: 'Customer country updated successfully',
    data: customer,
  });
});

const setLanguage = catchAsync(async (req, res) => {
  const customer = await customerProfileService.setLanguage(req.params.userId, req.body.language, req.io);
  logger.info('Customer language set', { userId: req.params.userId, language: req.body.language });
  res.status(200).json({
    status: 'success',
    message: 'Customer language updated successfully',
    data: customer,
  });
});

const setDietaryPreferences = catchAsync(async (req, res) => {
  const customer = await customerProfileService.setDietaryPreferences(req.params.userId, req.body.preferences, req.io);
  logger.info('Customer dietary preferences set', { userId: req.params.userId });
  res.status(200).json({
    status: 'success',
    message: 'Customer dietary preferences updated successfully',
    data: customer,
  });
});

const awardProfilePoints = catchAsync(async (req, res) => {
  const points = await customerProfileService.awardProfilePoints(req.params.userId, req.io);
  logger.info('Profile points awarded', { userId: req.params.userId });
  res.status(200).json({
    status: 'success',
    message: SUCCESS_MESSAGES.GAMIFICATION_POINTS_AWARDED,
    data: points,
  });
});

const manageWalletSettings = catchAsync(async (req, res) => {
  const customer = await customerProfileService.manageWalletSettings(req.params.userId, req.params.walletId, req.body, req.io);
  logger.info('Customer wallet settings updated', { userId: req.params.userId, walletId: req.params.walletId });
  res.status(200).json({
    status: 'success',
    message: 'Customer wallet settings updated successfully',
    data: customer,
  });
});

module.exports = {
  createCustomer,
  updateProfile,
  setCountry,
  setLanguage,
  setDietaryPreferences,
  awardProfilePoints,
  manageWalletSettings,
};