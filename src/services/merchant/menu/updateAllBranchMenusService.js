'use strict';

const { MenuInventory, ProductModifier, ProductAttribute, ProductAuditLog, MenuVersion, Merchant, MerchantBranch, InventoryAdjustmentLog, InventoryAlert } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const restaurantConstants = require('@constants/merchant/restaurantConstants');
const parkingLotConstants = require('@constants/merchant/parkingLotConstants');
const groceryConstants = require('@constants/merchant/groceryConstants');
const darkKitchenConstants = require('@constants/merchant/darkKitchenConstants');
const catererConstants = require('@constants/merchant/catererConstants');
const cafeConstants = require('@constants/merchant/cafeConstants');
const butcherConstants = require('@constants/merchant/butcherConstants');
const bakeryConstants = require('@constants/merchant/bakeryConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

// Map merchant types to their respective constants
const MERCHANT_TYPE_CONSTANTS = {
  restaurant: restaurantConstants,
  parking_lot: parkingLotConstants,
  grocery: groceryConstants,
  dark_kitchen: darkKitchenConstants,
  caterer: catererConstants,
  cafe: cafeConstants,
  butcher: butcherConstants,
  bakery: bakeryConstants,
};

async function updateAllBranchMenus(merchantId, updates, ipAddress, transaction = null) {
  try {
    if (!merchantId || !updates) {
      throw new AppError('Invalid input', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    const merchant = await Merchant.findByPk(merchantId, {
      attributes: ['id', 'user_id', 'preferred_language', 'type'],
      transaction,
    });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    // Parse merchant types
    const merchantTypes = Array.isArray(merchant.type) ? merchant.type : [merchant.type];

    // Fetch all branches for the merchant
    const branches = await MerchantBranch.findAll({
      where: { merchant_id: merchantId },
      attributes: ['id'],
      transaction,
    });
    if (!branches.length) {
      throw new AppError('No branches found', 404, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Validate dietary attributes
    const allowedDietaryFilters = new Set();
    for (const type of merchantTypes) {
      const constants = MERCHANT_TYPE_CONSTANTS[type] || merchantConstants;
      const filters =
        constants.MUNCH_CONSTANTS?.ORDER_SETTINGS?.ALLOWED_DIETARY_FILTERS ||
        constants.BUTCHER_CONFIG?.DIETARY_SPECIALTIES ||
        constants.BAKERY_CONFIG?.DIETARY_SPECIALTIES ||
        constants.RESTAURANT_CONFIG?.DIETARY_SPECIALTIES ||
        constants.CAFE_CONFIG?.DIETARY_SPECIALTIES ||
        constants.CATERER_CONFIG?.DIETARY_SPECIALTIES ||
        constants.DARK_KITCHEN_CONFIG?.DIETARY_SPECIALTIES ||
        mtablesConstants.ORDER_SETTINGS?.ALLOWED_DIETARY_FILTERS ||
        munchConstants.ORDER_CONSTANTS?.ORDER_SETTINGS?.ALLOWED_DIETARY_FILTERS ||
        [];
      filters.forEach((f) => allowedDietaryFilters.add(f));
    }
    if (updates.attributes?.some((attr) => attr.type && !allowedDietaryFilters.has(attr.type))) {
      throw new AppError('Invalid dietary filter', 400, merchantConstants.ERROR_CODES.INVALID_DIETARY_FILTER);
    }

    // Validate preparation time
    if (
      updates.preparationTimeMinutes &&
      merchantTypes.some((type) => ['restaurant', 'cafe', 'caterer', 'dark_kitchen', 'bakery', 'butcher', 'grocery'].includes(type))
    ) {
      let maxPrepTime = Infinity;
      for (const type of merchantTypes) {
        const constants = MERCHANT_TYPE_CONSTANTS[type] || merchantConstants;
        maxPrepTime = Math.min(
          maxPrepTime,
          constants.BUSINESS_SETTINGS?.prepTimeMinutes ||
            constants.CATERER_CONFIG?.prepTimeMinutes ||
            constants.CAFE_CONFIG?.QUICK_SERVICE_SETTINGS?.MAX_ORDER_PREP_MINUTES ||
            15
        );
      }
      if (updates.preparationTimeMinutes > maxPrepTime) {
        throw new AppError('Invalid prep time', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
      }
    }

    // Validate parking-specific fields
    if (merchantTypes.includes('parking_lot') && updates.spaceType) {
      const spaceConfig = mparkConstants.SPACE_CONFIG;
      if (
        !spaceConfig.SPACE_TYPES.includes(updates.spaceType) ||
        (updates.securityFeatures && !updates.securityFeatures.every((f) => spaceConfig.SECURITY_FEATURES.includes(f))) ||
        (updates.accessType && !spaceConfig.ACCESS_TYPES.includes(updates.accessType)) ||
        (updates.egressType && !spaceConfig.EGRESS_TYPES.includes(updates.egressType))
      ) {
        throw new AppError('Invalid parking config', 400, mparkConstants.ERROR_TYPES.INVALID_PARKING_SPOT);
      }
    }

    // Validate modifier types
    const allowedModifierTypes = new Set(mtablesConstants.MODIFIER_TYPES);
    for (const type of merchantTypes) {
      const constants = MERCHANT_TYPE_CONSTANTS[type] || merchantConstants;
      (constants.MUNCH_CONSTANTS?.ORDER_SETTINGS?.ALLOWED_MODIFIER_TYPES || []).forEach((m) => allowedModifierTypes.add(m));
    }
    if (updates.modifiers?.some((mod) => mod.type && !allowedModifierTypes.has(mod.type))) {
      throw new AppError('Invalid modifier type', 400, mtablesConstants.ERROR_TYPES.INVALID_MODIFIER);
    }

    const updatedItems = [];
    const lowStockItems = [];

    // Update menu items for each branch
    for (const branch of branches) {
      const menuItems = await MenuInventory.findAll({
        where: { merchant_id: merchantId, branch_id: branch.id },
        include: [
          { model: ProductModifier, as: 'modifiers' },
          { model: ProductAttribute, as: 'attributes' },
        ],
        transaction,
      });

      for (const menuItem of menuItems) {
        const previousState = {
          name: menuItem.name,
          price: menuItem.price,
          quantity: menuItem.quantity,
          minimum_stock_level: menuItem.minimum_stock_level,
          availability_status: menuItem.availability_status,
          is_published: menuItem.is_published,
          category_id: menuItem.category_id,
          branch_id: menuItem.branch_id,
          modifiers: menuItem.modifiers,
          attributes: menuItem.attributes,
          space_type: menuItem.space_type,
          security_features: menuItem.security_features,
          access_type: menuItem.access_type,
          egress_type: menuItem.egress_type,
        };

        const previousQuantity = menuItem.quantity;
        await menuItem.update(
          {
            name: updates.name || menuItem.name,
            price: updates.price || menuItem.price,
            category_id: updates.categoryId || menuItem.category_id,
            branch_id: branch.id,
            description: updates.description || menuItem.description,
            availability_status:
              updates.availabilityStatus || (merchantTypes.includes('parking_lot') ? 'available' : menuItem.availability_status),
            is_published: updates.isPublished !== undefined ? updates.isPublished : menuItem.is_published,
            quantity: updates.quantity !== undefined ? updates.quantity : merchantTypes.includes('parking_lot') ? 1 : menuItem.quantity,
            minimum_stock_level: updates.minimumStockLevel !== undefined ? updates.minimumStockLevel : menuItem.minimum_stock_level,
            cost_price: updates.costPrice || menuItem.costPrice,
            measurement_unit: updates.measurementUnit || (merchantTypes.includes('parking_lot') ? 'space' : menuItem.measurement_unit),
            is_featured: updates.isFeatured !== undefined ? updates.isFeatured : menuItem.is_featured,
            preparation_time_minutes: updates.preparationTimeMinutes || menuItem.preparation_time_minutes,
            nutritional_info: updates.nutritionalInfo || menuItem.nutritional_info,
            tags: updates.tags || menuItem.tags,
            display_order: updates.displayOrder !== undefined ? updates.displayOrder : menuItem.display_order,
            is_taxable: updates.isTaxable !== undefined ? updates.isTaxable : menuItem.is_taxable,
            tax_rate: updates.taxRate || menuItem.tax_rate,
            space_type: merchantTypes.includes('parking_lot') ? updates.spaceType || menuItem.space_type : null,
            security_features: merchantTypes.includes('parking_lot') ? updates.securityFeatures || menuItem.security_features : null,
            access_type: merchantTypes.includes('parking_lot') ? updates.accessType || menuItem.access_type : null,
            egress_type: merchantTypes.includes('parking_lot') ? updates.egressType || menuItem.egress_type : null,
            updated_by: merchant.user_id,
          },
          { transaction }
        );

        if (updates.modifiers) {
          await ProductModifier.destroy({ where: { menu_item_id: menuItem.id }, transaction });
          await ProductModifier.bulkCreate(
            updates.modifiers.map((mod) => ({
              menu_item_id: menuItem.id,
              type: mod.type,
              name: mod.name,
              price_adjustment: mod.priceAdjustment || 0.00,
              is_required: mod.isRequired || false,
            })),
            { transaction }
          );
        }

        if (updates.attributes) {
          await ProductAttribute.destroy({ where: { menu_item_id: menuItem.id }, transaction });
          await ProductAttribute.bulkCreate(
            updates.attributes.map((attr) => ({
              menu_item_id: menuItem.id,
              type: attr.type,
              value: attr.value !== undefined ? attr.value : true,
            })),
            { transaction }
          );
        }

        // Log inventory adjustments
        if (
          updates.quantity !== undefined &&
          updates.quantity !== previousQuantity &&
          (!merchantTypes.includes('parking_lot') || merchantTypes.length > 1)
        ) {
          await InventoryAdjustmentLog.create(
            {
              menu_item_id: menuItem.id,
              merchant_id: merchantId,
              branch_id: branch.id,
              adjustment_type: updates.quantity > previousQuantity ? 'add' : 'subtract',
              previous_quantity: previousQuantity,
              new_quantity: updates.quantity,
              adjustment_amount: Math.abs(updates.quantity - previousQuantity),
              performed_by: merchant.user_id,
              reference_type: 'manual',
              reason: 'Bulk menu update',
            },
            { transaction }
          );

          let lowStockThreshold = Infinity;
          for (const type of merchantTypes) {
            const constants = MERCHANT_TYPE_CONSTANTS[type] || merchantConstants;
            lowStockThreshold = Math.min(
              lowStockThreshold,
              constants.MUNCH_CONSTANTS?.INVENTORY_SETTINGS?.LOW_STOCK_THRESHOLD_PERCENTAGE || 15
            );
          }
          if (updates.quantity <= menuItem.minimum_stock_level * (lowStockThreshold / 100)) {
            lowStockItems.push({
              menu_item_id: menuItem.id,
              merchant_id: merchantId,
              branch_id: branch.id,
              current_quantity: updates.quantity,
              minimum_stock_level: menuItem.minimum_stock_level,
            });
          }
        }

        // Create menu version snapshot
        const latestVersion = await MenuVersion.findOne({
          where: { merchant_id: merchantId, branch_id: branch.id || null },
          order: [['version_number', 'DESC']],
          transaction,
        });

        await MenuVersion.create(
          {
            merchant_id: merchantId,
            branch_id: branch.id,
            version_number: latestVersion ? latestVersion.version_number + 1 : 1,
            menu_data: {
              item: {
                id: menuItem.id,
                name: menuItem.name,
                price: menuItem.price,
                category_id: menuItem.category_id,
                branch_id: branch.id,
                availability_status: menuItem.availability_status,
                is_published: menuItem.is_published,
                quantity: menuItem.quantity,
                minimum_stock_level: menuItem.minimum_stock_level,
                modifiers: updates.modifiers || menuItem.modifiers,
                attributes: updates.attributes || menuItem.attributes,
                space_type: menuItem.space_type,
                security_features: menuItem.security_features,
                access_type: menuItem.access_type,
                egress_type: menuItem.egress_type,
              },
            },
            description: `Bulk menu item update for ${merchantTypes.join(', ')}`,
            created_by: merchant.user_id,
          },
          { transaction }
        );

        await ProductAuditLog.create(
          {
            menu_item_id: menuItem.id,
            user_id: merchant.user_id,
            action: 'bulk_update',
            changes: {
              ...updates,
              previousState,
            },
          },
          { transaction }
        );

        updatedItems.push({ menuId: menuItem.id, branchId: branch.id, itemName: menuItem.name });
      }
    }

    // Create inventory alerts for low stock items
    if (lowStockItems.length > 0) {
      await InventoryAlert.bulkCreate(
        lowStockItems.map((item) => ({
          menu_item_id: item.menu_item_id,
          merchant_id: item.merchant_id,
          branch_id: item.branch_id,
          type: 'low_stock',
          details: {
            current_quantity: item.current_quantity,
            minimum_stock_level: item.minimum_stock_level,
          },
        })),
        { transaction }
      );
    }

    logger.info(`Menus updated for ${merchantTypes.join(', ')} across ${branches.length} branches: merchant ${merchantId}`);
    return {
      merchantId,
      updatedItems,
      branchCount: branches.length,
      language: merchant.preferred_language || 'en',
      action: 'allBranchMenusUpdated',
    };
  } catch (error) {
    throw handleServiceError('updateAllBranchMenus', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

module.exports = { updateAllBranchMenus };