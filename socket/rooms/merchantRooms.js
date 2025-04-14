'use strict';

const { Merchant, MerchantBranch, branchStaffRole } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

module.exports = {
  // Room names
  getMerchantRoom: (merchantId) => `merchant-${merchantId}`,
  getBranchRoom: (branchId) => `branch-${branchId}`,
  ADMIN_ROOM: 'role-admin',
  getStaffRoom: (branchId) => `staff-${branchId}`,

  /**
   * Join merchant-specific rooms on connection
   * @param {Socket} socket
   */
  async joinMerchantRooms(socket) {
    try {
      const { id: userId, role } = socket.user;

      if (role !== 'merchant') {
        throw new AppError('Unauthorized role for merchant rooms', 403, 'UNAUTHORIZED_ROLE');
      }

      const merchant = await Merchant.findOne({ where: { user_id: userId } });
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      // Join merchant room
      const merchantRoom = this.getMerchantRoom(merchant.id);
      await socket.join(merchantRoom);
      logger.info('Socket joined merchant room', { userId, merchantId: merchant.id, socketId: socket.id });

      // Join branch rooms
      const branches = await MerchantBranch.findAll({ where: { merchant_id: merchant.id } });
      for (const branch of branches) {
        const branchRoom = this.getBranchRoom(branch.id);
        await socket.join(branchRoom);
        logger.info('Socket joined branch room', { userId, branchId: branch.id, socketId: socket.id });
      }
    } catch (error) {
      logger.logErrorEvent('Failed to join merchant rooms', {
        userId: socket.user.id,
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Leave merchant-specific rooms on disconnect
   * @param {Socket} socket
   */
  async leaveMerchantRooms(socket) {
    try {
      const { id: userId } = socket.user;

      const merchant = await Merchant.findOne({ where: { user_id: userId } });
      if (merchant) {
        const merchantRoom = this.getMerchantRoom(merchant.id);
        await socket.leave(merchantRoom);
        logger.info('Socket left merchant room', { userId, merchantId: merchant.id, socketId: socket.id });

        const branches = await MerchantBranch.findAll({ where: { merchant_id: merchant.id } });
        for (const branch of branches) {
          const branchRoom = this.getBranchRoom(branch.id);
          await socket.leave(branchRoom);
          logger.info('Socket left branch room', { userId, branchId: branch.id, socketId: socket.id });
        }
      }
    } catch (error) {
      logger.logErrorEvent('Failed to leave merchant rooms', {
        userId: socket.user.id,
        error: error.message,
      });
    }
  },

  /**
   * Join staff to branch rooms based on roles
   * @param {Socket} socket
   */
  async joinStaffRooms(socket) {
    try {
      const { id: userId, role } = socket.user;

      if (role !== 'staff') return;

      const staffRoles = await branchStaffRole.findAll({ where: { user_id: userId } });
      for (const staffRole of staffRoles) {
        const branchRoom = this.getBranchRoom(staffRole.branch_id);
        const staffRoom = this.getStaffRoom(staffRole.branch_id);
        await socket.join([branchRoom, staffRoom]);
        logger.info('Socket joined staff/branch rooms', {
          userId,
          branchId: staffRole.branch_id,
          socketId: socket.id,
        });
      }
    } catch (error) {
      logger.logErrorEvent('Failed to join staff rooms', {
        userId: socket.user.id,
        error: error.message,
      });
    }
  },
};