'use strict';

/**
 * socket/rooms/merchantRooms.js
 *
 * Manages merchant and branch room joining for munch, mtickets, mtables, mstays, mpark, and mevents.
 *
 * Dependencies:
 * - utils/logger.js
 * - utils/AppError.js
 * - models/Merchant.js
 * - models/MerchantBranch.js
 *
 * Last Updated: July 19, 2025
 */

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const Merchant = require('@models/Merchant');
const MerchantBranch = require('@models/MerchantBranch');

const getMerchantRoom = (merchantId, service) => `mm:merchant-${merchantId}:${service}`;
const getBranchRoom = (branchId, service) => `mm:branch-${branchId}:${service}`;

const joinMerchantRoom = async (io, socket, user) => {
  try {
    if (user.role !== 'merchant' || !user.merchant_id || !user.service) {
      logger.warn('Merchant room join failed: Invalid user or service', { userId: user.id, service: user.service });
      throw new AppError('Invalid user or service', 400, 'INVALID_MERCHANT_DATA');
    }
    const validServices = ['munch', 'mtxi', 'mtickets', 'mtables', 'mstays', 'mpark', 'mevents'];
    if (!validServices.includes(user.service)) {
      logger.warn('Invalid service for merchant room', { userId: user.id, service: user.service });
      throw new AppError('Invalid service', 400, 'INVALID_SERVICE');
    }
    const merchant = await Merchant.findById(user.merchant_id);
    if (!merchant) {
      logger.warn('Merchant not found', { userId: user.id, merchantId: user.merchant_id });
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }
    const room = getMerchantRoom(user.merchant_id, user.service);
    await socket.join(room);
    logger.info('Merchant joined room', { userId: user.id, room, service: user.service });

    // Join branch rooms
    const branches = await MerchantBranch.findAll({ where: { merchantId: user.merchant_id } });
    for (const branch of branches) {
      const branchRoom = getBranchRoom(branch.id, user.service);
      await socket.join(branchRoom);
      logger.info('Merchant joined branch room', { userId: user.id, branchRoom, service: user.service });
    }
    return { merchantRoom: room, branchRooms: branches.map(b => getBranchRoom(b.id, user.service)) };
  } catch (error) {
    logger.error('Failed to join merchant room', { userId: user.id, error: error.message, service: user.service });
    throw error;
  }
};

module.exports = { joinMerchantRoom, getMerchantRoom, getBranchRoom };