'use strict';

const { trackStockLevels, updateInventory, sendRestockingAlerts } = require('@services/merchant/munch/inventoryService');
const { MerchantBranch, Staff } = require('@models').sequelize.models;
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staffConstants');
const gamificationConstants = require('@constants/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const trackStockLevelsController = catchAsync(async (req, res) => {
  const { restaurantId } = req.body;
  const stockLevels = await trackStockLevels(restaurantId);

  await socketService.emit(null, 'inventory:stock_levels', { restaurantId, stockLevels }, `merchant:${restaurantId}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.TRACK_STOCK_LEVELS,
    details: { restaurantId, stockLevels },
    ipAddress: req.ip || '0.0.0.0',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'inventory.stockLevelsUpdated', { restaurantId }),
    data: stockLevels,
  });
});

const updateInventoryController = catchAsync(async (req, res) => {
  const { orderId, items } = req.body;
  const updatedItems = await updateInventory(orderId, items);

  const order = await Order.findByPk(orderId, { include: [{ model: MerchantBranch, as: 'branch' }] });

  await socketService.emit(null, 'inventory:updated', { orderId, updatedItems }, `merchant:${order.branch_id}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.UPDATE_INVENTORY,
    details: { orderId, updatedItems },
    ipAddress: req.ip || '0.0.0.0',
  });

  // Automate points for BOH staff
  const bohStaff = await Staff.findAll({
    where: {
      branch_id: order.branch_id,
      position: staffConstants.STAFF_TYPES.BOH,
      availability_status: 'available',
    },
  });

  for (const staff of bohStaff) {
    await pointService.awardPoints({
      userId: staff.user_id,
      role: 'staff',
      subRole: staff.position,
      action: gamificationConstants.STAFF_ACTIONS.find(a => a.action === 'inventory_update').action,
      languageCode: staff.user?.preferred_language || 'en',
    });
  }

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'inventory.inventoryUpdated', { orderId }),
    data: updatedItems,
  });
});

const sendRestockingAlertsController = catchAsync(async (req, res) => {
  const { restaurantId } = req.body;
  const { restaurantId: branchId, lowStockItems } = await sendRestockingAlerts(restaurantId);

  const branch = await MerchantBranch.findByPk(branchId);
  const bohStaff = await Staff.findAll({
    where: {
      branch_id: restaurantId,
      position: staff