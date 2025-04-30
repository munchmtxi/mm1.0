'use strict';

const { Staff, Merchant, MerchantBranch } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

module.exports.joinStaffRoom = async (io, socket, user) => {
  try {
    if (!['staff', 'admin'].includes(user.role)) {
      throw new AppError('Unauthorized to join staff room', 403, 'UNAUTHORIZED');
    }

    if (user.admin_access) {
      const merchants = await Merchant.findAll({ attributes: ['id'] });
      for (const merchant of merchants) {
        const room = `merchant:${merchant.id}`;
        await socket.join(room);
        logger.info('Admin joined staff room', { userId: user.id, merchantId: merchant.id, room, socketId: socket.id });
      }

      const branches = await MerchantBranch.findAll({ attributes: ['id'] });
      for (const branch of branches) {
        const branchRoom = `branch-${branch.id}`;
        await socket.join(branchRoom);
        logger.info('Admin joined branch room', { userId: user.id, branchId: branch.id, room: branchRoom, socketId: socket.id });
      }
      return;
    }

    const staffProfile = await Staff.findOne({
      where: { user_id: user.id },
    });
    if (!staffProfile) {
      throw new AppError('Staff profile not found', 404, 'NOT_FOUND');
    }

    const merchant = await Merchant.findOne({
      where: { id: staffProfile.merchant_id },
    });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'NOT_FOUND');
    }

    const room = `merchant:${staffProfile.merchant_id}`;
    await socket.join(room);
    logger.info('Staff joined merchant room', { userId: user.id, merchantId: staffProfile.merchant_id, room, socketId: socket.id });

    if (staffProfile.branch_id) {
      const branch = await MerchantBranch.findOne({
        where: { id: staffProfile.branch_id },
      });
      if (branch) {
        const branchRoom = `branch-${staffProfile.branch_id}`;
        await socket.join(branchRoom);
        logger.info('Staff joined branch room', { userId: user.id, branchId: staffProfile.branch_id, room: branchRoom, socketId: socket.id });
      }
    }

    socket.user.merchant_id = staffProfile.merchant_id;
    socket.user.branch_id = staffProfile.branch_id;
  } catch (error) {
    logger.error('Failed to join staff room', { userId: user.id, error: error.message, socketId: socket.id });
    throw error;
  }
};

module.exports.joinStaffRoomEvent = async (socket, merchantId, callback) => {
  try {
    if (socket.user.admin_access) {
      await rooms.adminRooms.joinStaffRoom(socket, merchantId, callback);
    } else if (socket.user.role !== 'staff') {
      throw new AppError('Unauthorized to join staff room', 403, 'UNAUTHORIZED');
    } else {
      const staffProfile = await Staff.findOne({
        where: { user_id: socket.user.id },
      });
      if (!staffProfile || staffProfile.merchant_id !== parseInt(merchantId)) {
        throw new AppError('Invalid merchant ID for staff', 403, 'UNAUTHORIZED');
      }

      const room = `merchant:${merchantId}`;
      await socket.join(room);
      logger.info('Socket joined staff room', { socketId: socket.id, userId: socket.user.id, merchantId, room });

      if (callback) {
        callback({ success: true, room });
      }
    }
  } catch (error) {
    logger.error('Failed to join staff room', { socketId: socket.id, userId: socket.user.id, merchantId, error: error.message });
    if (callback) {
      callback({ success: false, error: error.message });
    }
  }
};