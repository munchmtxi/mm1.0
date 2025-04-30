'use strict';

// Clear module cache to ensure fresh model loading
delete require.cache[require.resolve('@models')];

const { Merchant, MerchantBranch } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

module.exports.joinMerchantRooms = async (socket) => {
  try {
    const user = socket.user;
    if (!['merchant', 'admin'].includes(user.role)) {
      throw new AppError('Unauthorized to join merchant rooms', 403, 'UNAUTHORIZED');
    }

    if (!Merchant || typeof Merchant.findOne !== 'function') {
      throw new AppError('Merchant model is not properly initialized', 500, 'MODEL_ERROR');
    }

    let merchant;
    if (user.role === 'merchant') {
      merchant = await Merchant.findOne({ where: { user_id: user.id } });
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'NOT_FOUND');
      }
    } else if (user.admin_access) {
      // Admins can join all merchant rooms, but we’ll handle one at a time in joinMerchantRoom
      const merchants = await Merchant.findAll({ attributes: ['id'] });
      for (const m of merchants) {
        const room = `merchant-${m.id}`;
        await socket.join(room);
        logger.info('Admin joined merchant room', { userId: user.id, merchantId: m.id, room, socketId: socket.id });

        const branches = await MerchantBranch.findAll({ where: { merchant_id: m.id }, attributes: ['id'] });
        for (const branch of branches) {
          const branchRoom = `branch-${branch.id}`;
          await socket.join(branchRoom);
          logger.info('Admin joined branch room', { userId: user.id, branchId: branch.id, room: branchRoom, socketId: socket.id });
        }
      }
      return; // Admin joins all rooms during authentication
    }

    const room = `merchant-${merchant.id}`;
    await socket.join(room);
    logger.info('Socket joined merchant room', { userId: user.id, merchantId: merchant.id, room, socketId: socket.id });

    const branches = await MerchantBranch.findAll({ where: { merchant_id: merchant.id }, attributes: ['id'] });
    for (const branch of branches) {
      const branchRoom = `branch-${branch.id}`;
      await socket.join(branchRoom);
      logger.info('Socket joined branch room', { userId: user.id, branchId: branch.id, room: branchRoom, socketId: socket.id });
    }

    socket.user.merchant_id = merchant.id;
  } catch (error) {
    logger.error('Failed to join merchant rooms', { userId: socket.user.id, error: error.message, socketId: socket.id });
    throw error;
  }
};

module.exports.joinMerchantRoomEvent = async (socket, merchantId, callback) => {
  try {
    if (socket.user.admin_access) {
      await rooms.adminRooms.joinMerchantRoom(socket, merchantId, callback);
    } else if (socket.user.role !== 'merchant') {
      throw new AppError('Unauthorized to join merchant room', 403, 'UNAUTHORIZED');
    } else {
      if (!Merchant || typeof Merchant.findOne !== 'function') {
        throw new AppError('Merchant model is not properly initialized', 500, 'MODEL_ERROR');
      }

      const merchant = await Merchant.findOne({ where: { id: merchantId, user_id: socket.user.id } });
      if (!merchant) {
        throw new AppError('Merchant not found or user not associated', 404, 'NOT_FOUND');
      }

      const room = `merchant-${merchantId}`;
      await socket.join(room);
      logger.info('Socket joined merchant room', { socketId: socket.id, userId: socket.user.id, room });

      if (callback) {
        callback({ success: true, room });
      }
    }
  } catch (error) {
    logger.error('Failed to join merchant room', { socketId: socket.id, userId: socket.user.id, merchantId, error: error.message });
    if (callback) {
      callback({ success: false, error: error.message });
    }
  }
};

module.exports.leaveMerchantRooms = async (socket) => {
  try {
    const userId = socket.user.id;
    const rooms = Array.from(socket.rooms).filter(room => room.startsWith('merchant-') || room.startsWith('branch-'));
    for (const room of rooms) {
      await socket.leave(room);
      logger.info('Socket left merchant room', { userId, room, socketId: socket.id });
    }
  } catch (error) {
    logger.error('Failed to leave merchant rooms', { userId: socket.user.id, error: error.message, socketId: socket.id });
    throw error;
  }
};

module.exports.Merchant = Merchant; // For compatibility with existing code