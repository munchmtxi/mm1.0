'use strict';

/**
 * branchMenuManagementService.js
 * Manages branch-specific menu amendments and viewing for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const merchantConstants = require('@constants/merchant/merchantConstants');
const {
  MerchantBranch,
  MenuInventory,
  ProductCategory,
  Merchant,
  ProductAuditLog,
  Notification,
  Media,
  ProductModifier,
  ProductAttribute,
} = require('@models');

/**
 * Amends a branch's menu (add, update, or remove items).
 * @param {number} branchId - Branch ID.
 * @param {Object} menuData - Menu changes (addItems, updateItems, removeItemIds).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated menu details.
 */
async function amendBranchMenu(branchId, menuData, io) {
  try {
    if (!branchId || !menuData) throw new Error('Branch ID and menu data required');

    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch) throw new Error('Branch not found');

    const merchant = await Merchant.findByPk(branch.merchant_id);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const result = { added: [], updated: [], removed: [] };

    // Add new items
    if (menuData.addItems) {
      const newItems = await MenuInventory.bulkCreate(
        menuData.addItems.map((item) => ({
          merchant_id: branch.merchant_id,
          branch_id: branchId,
          category_id: item.categoryId,
          name: item.name,
          description: item.description,
          price: item.price,
          availability_status: item.availabilityStatus || 'in-stock',
          is_published: item.isPublished || false,
          created_by: merchant.user_id,
        })),
        { returning: true }
      );
      result.added = newItems;

      // Add modifiers and attributes
      for (const item of menuData.addItems) {
        const itemId = newItems.find((i) => i.name === item.name)?.id;
        if (item.modifiers) {
          await ProductModifier.bulkCreate(
            item.modifiers.map((mod) => ({
              menu_item_id: itemId,
              type: mod.type,
              name: mod.name,
              price_adjustment: mod.priceAdjustment,
              is_required: mod.isRequired,
            }))
          );
        }
        if (item.attributes) {
          await ProductAttribute.bulkCreate(
            item.attributes.map((attr) => ({
              menu_item_id: itemId,
              type: attr.type,
              value: attr.value,
            }))
          );
        }
      }
    }

    // Update existing items
    if (menuData.updateItems) {
      for (const update of menuData.updateItems) {
        const menuItem = await MenuInventory.findByPk(update.id);
        if (menuItem && menuItem.branch_id === branchId) {
          await menuItem.update({
            name: update.name || menuItem.name,
            price: update.price || menuItem.price,
            category_id: update.categoryId || menuItem.category_id,
            description: update.description || menuItem.description,
            availability_status: update.availabilityStatus || menuItem.availability_status,
            is_published: update.isPublished !== undefined ? update.isPublished : menuItem.is_published,
            updated_by: merchant.user_id,
          });
          result.updated.push(menuItem);

          // Update modifiers and attributes
          if (update.modifiers) {
            await ProductModifier.destroy({ where: { menu_item_id: update.id } });
            await ProductModifier.bulkCreate(
              update.modifiers.map((mod) => ({
                menu_item_id: update.id,
                type: mod.type,
                name: mod.name,
                price_adjustment: mod.priceAdjustment,
                is_required: mod.isRequired,
              }))
            );
          }
          if (update.attributes) {
            await ProductAttribute.destroy({ where: { menu_item_id: update.id } });
            await ProductAttribute.bulkCreate(
              update.attributes.map((attr) => ({
                menu_item_id: update.id,
                type: attr.type,
                value: attr.value,
              }))
            );
          }

          await ProductAuditLog.create({
            menu_item_id: update.id,
            user_id: merchant.user_id,
            action: 'update',
            changes: update,
          });
        }
      }
    }

    // Remove items
    if (menuData.removeItemIds) {
      const removedItems = await MenuInventory.findAll({
        where: { id: menuData.removeItemIds, branch_id: branchId },
      });
      await MenuInventory.destroy({ where: { id: menuData.removeItemIds, branch_id: branchId } });
      result.removed = removedItems;

      for (const item of removedItems) {
        await ProductAuditLog.create({
          menu_item_id: item.id,
          user_id: merchant.user_id,
          action: 'delete',
          changes: { deleted: true },
        });
      }
    }

    // Handle images
    if (menuData.images) {
      await Media.bulkCreate(
        menuData.images.map((img) => ({
          branch_id: branchId,
          merchant_id: branch.merchant_id,
          type: 'menu_photos',
          url: img.url,
          title: img.title,
        }))
      );
    }

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'amend_branch_menu',
      details: {
        branchId,
        added: result.added.length,
        updated: result.updated.length,
        removed: result.removed.length,
      },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'branchMenu:menuAmended', {
      branchId,
      merchantId: branch.merchant_id,
      changes: {
        added: result.added.length,
        updated: result.updated.length,
        removed: result.removed.length,
      },
    }, `merchant:${branch.merchant_id}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'branch_menu_amended',
      messageKey: 'branchMenu.branch_menu_amended',
      messageParams: { branchName: branch.name },
      role: 'merchant',
      module: 'branchMenu',
      languageCode: merchant.preferred_language || 'en',
    });

    return result;
  } catch (error) {
    logger.error('Error amending branch menu', { error: error.message });
    throw error;
  }
}

/**
 * Retrieves a branch's menu with categories and items.
 * @param {number} branchId - Branch ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Branch menu details.
 */
async function viewBranchMenu(branchId, io) {
  try {
    if (!branchId) throw new Error('Branch ID required');

    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch) throw new Error('Branch not found');

    const merchant = await Merchant.findByPk(branch.merchant_id);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const categories = await ProductCategory.findAll({
      where: { merchant_id: branch.merchant_id, branch_id: { [Op.or]: [branchId, null] }, is_active: true },
      include: [{ model: ProductCategory, as: 'subcategories' }],
    });

    const items = await MenuInventory.findAll({
      where: { branch_id: branchId, is_published: true },
      include: [
        { model: ProductCategory, as: 'category' },
        { model: ProductModifier, as: 'modifiers' },
        { model: ProductAttribute, as: 'attributes' },
      ],
    });

    const images = await Media.findAll({
      where: { branch_id: branchId, type: 'menu_photos' },
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'view_branch_menu',
      details: { branchId, itemCount: items.length, categoryCount: categories.length },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'branchMenu:menuViewed', {
      branchId,
      merchantId: branch.merchant_id,
      itemCount: items.length,
    }, `merchant:${branch.merchant_id}`);

    return { branch, categories, items, images };
  } catch (error) {
    logger.error('Error viewing branch menu', { error: error.message });
    throw error;
  }
}

module.exports = {
  amendBranchMenu,
  viewBranchMenu,
};