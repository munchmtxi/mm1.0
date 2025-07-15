'use strict';

const { Op } = require('sequelize');
const {
  MenuInventory,
  ProductCategory,
  ProductModifier,
  ProductAttribute,
  Media,
  InventoryBulkUpdate,
  InventoryAlert,
  ProductBulkUpload,
  MenuVersion,
  Merchant,
  MerchantBranch,
} = require('@models');
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

async function createMenu(merchantId, menuData, ipAddress, transaction = null) {
  try {
    // Validate input
    if (!merchantId || !menuData?.items || !menuData?.categories) {
      throw new AppError('Invalid input', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    const merchant = await Merchant.findByPk(merchantId, {
      attributes: ['id', 'user_id', 'preferred_language', 'type'],
      transaction,
    });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    // Parse merchant types (supports multiple types)
    const merchantTypes = Array.isArray(merchant.type) ? merchant.type : [merchant.type];
    if (!merchantTypes.every((type) => merchantConstants.MERCHANT_TYPES.includes(type))) {
      throw new AppError('Invalid merchant type', 400, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    // Validate branch_id if provided
    if (menuData.items.some((item) => item.branchId)) {
      const branchIds = [...new Set(menuData.items.map((item) => item.branchId).filter(Boolean))];
      const branches = await MerchantBranch.findAll({
        where: { id: { [Op.in]: branchIds }, merchant_id: merchantId },
        transaction,
      });
      if (branches.length !== branchIds.length) {
        throw new AppError('Invalid branch', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
      }
    }

    // Validate categories for all merchant types
    for (const type of merchantTypes) {
      const constants = MERCHANT_TYPE_CONSTANTS[type] || merchantConstants;
      const allowedCategoryTypes =
        constants.MUNCH_CONSTANTS?.INVENTORY_SETTINGS?.CATEGORY_TYPES ||
        constants.BUTCHER_CONFIG?.MEAT_CATEGORIES ||
        constants.BAKERY_CONFIG?.CATEGORY_TYPES ||
        ['generic'];
      if (menuData.categories.some((cat) => cat.type && !allowedCategoryTypes.includes(cat.type))) {
        throw new AppError('Invalid category type', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
      }
    }

    // Validate menu size constraints (use strictest limits)
    let maxMenuItems = Infinity, maxCategories = Infinity;
    for (const type of merchantTypes) {
      const constants = MERCHANT_TYPE_CONSTANTS[type] || merchantConstants;
      maxMenuItems = Math.min(maxMenuItems, constants.MUNCH_CONSTANTS?.MENU_SETTINGS?.MAX_MENU_ITEMS || 300);
      maxCategories = Math.min(maxCategories, constants.MUNCH_CONSTANTS?.MENU_SETTINGS?.MAX_CATEGORIES || 30);
    }
    if (menuData.items.length > maxMenuItems || menuData.categories.length > maxCategories) {
      throw new AppError('Inventory limit exceeded', 400, merchantConstants.ERROR_CODES.INVENTORY_LIMIT_EXCEEDED);
    }

    // Validate media types
    if (menuData.images) {
      for (const type of merchantTypes) {
        const constants = MERCHANT_TYPE_CONSTANTS[type] || merchantConstants;
        const allowedMediaTypes =
          constants.MUNCH_CONSTANTS?.MENU_SETTINGS?.ALLOWED_MEDIA_TYPES || ['jpg', 'png', 'jpeg'];
        const maxMediaSizeMB = constants.MUNCH_CONSTANTS?.MENU_SETTINGS?.MAX_MEDIA_SIZE_MB || 10;
        if (
          menuData.images.some(
            (img) => !allowedMediaTypes.includes(img.type) || (img.size && img.size > maxMediaSizeMB * 1024 * 1024)
          )
        ) {
          throw new AppError('Invalid media', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
        }
      }
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
    if (menuData.attributes?.some((attr) => attr.type && !allowedDietaryFilters.has(attr.type))) {
      throw new AppError('Invalid dietary filter', 400, merchantConstants.ERROR_CODES.INVALID_DIETARY_FILTER);
    }

    const categories = await ProductCategory.bulkCreate(
      menuData.categories.map((cat) => ({
        merchant_id: merchantId,
        branch_id: cat.branchId,
        name: cat.name,
        description: cat.description,
        parent_id: cat.parentId,
        is_active: true,
        created_by: merchant.user_id,
        image_url: cat.imageUrl,
        icon_url: cat.iconUrl,
        display_order: cat.displayOrder || 0,
      })),
      { returning: true, transaction }
    );

    const items = await MenuInventory.bulkCreate(
      menuData.items.map((item) => {
        // Validate preparation time for food-related merchants
        if (merchantTypes.some((type) => ['restaurant', 'cafe', 'caterer', 'dark_kitchen', 'bakery', 'butcher', 'grocery'].includes(type))) {
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
          if (item.preparationTimeMinutes && item.preparationTimeMinutes > maxPrepTime) {
            throw new AppError('Invalid prep time', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
          }
        }

        // Validate parking-specific fields
        if (merchantTypes.includes('parking_lot')) {
          const spaceConfig = mparkConstants.SPACE_CONFIG;
          if (
            !spaceConfig.SPACE_TYPES.includes(item.spaceType) ||
            (item.securityFeatures && !item.securityFeatures.every((f) => spaceConfig.SECURITY_FEATURES.includes(f))) ||
            (item.accessType && !spaceConfig.ACCESS_TYPES.includes(item.accessType)) ||
            (item.egressType && !spaceConfig.EGRESS_TYPES.includes(item.egressType))
          ) {
            throw new AppError('Invalid parking config', 400, mparkConstants.ERROR_TYPES.INVALID_PARKING_SPOT);
          }
        }

        return {
          merchant_id: merchantId,
          branch_id: item.branchId,
          category_id: categories.find((c) => c.name === item.category)?.id,
          name: item.name,
          description: item.description,
          price: item.price,
          cost_price: item.costPrice,
          availability_status: item.availabilityStatus || (merchantTypes.includes('parking_lot') ? 'available' : 'in-stock'),
          is_published: item.isPublished || false,
          created_by: merchant.user_id,
          quantity: item.quantity || (merchantTypes.includes('parking_lot') ? 1 : 0),
          minimum_stock_level: item.minimumStockLevel || 0,
          measurement_unit: item.measurementUnit || (merchantTypes.includes('parking_lot') ? 'space' : 'piece'),
          is_featured: item.isFeatured || false,
          preparation_time_minutes: item.preparationTimeMinutes,
          nutritional_info: item.nutritionalInfo,
          tags: item.tags || [],
          display_order: item.displayOrder || 0,
          is_taxable: item.isTaxable !== undefined ? item.isTaxable : true,
          tax_rate: item.taxRate,
          space_type: merchantTypes.includes('parking_lot') ? item.spaceType : null,
          security_features: merchantTypes.includes('parking_lot') ? item.securityFeatures : null,
          access_type: merchantTypes.includes('parking_lot') ? item.accessType : null,
          egress_type: merchantTypes.includes('parking_lot') ? item.egressType : null,
        };
      }),
      { returning: true, transaction }
    );

    if (menuData.images) {
      await Media.bulkCreate(
        menuData.images.map((img) => ({
          merchant_id: merchantId,
          branch_id: img.branchId,
          type: img.type || (merchantTypes.includes('parking_lot') ? 'parking_photos' : 'menu_photos'),
          url: img.url,
          title: img.title,
          description: img.description,
        })),
        { transaction }
      );
    }

    if (menuData.modifiers) {
      const allowedModifierTypes = new Set(mtablesConstants.MODIFIER_TYPES);
      for (const type of merchantTypes) {
        const constants = MERCHANT_TYPE_CONSTANTS[type] || merchantConstants;
        (constants.MUNCH_CONSTANTS?.ORDER_SETTINGS?.ALLOWED_MODIFIER_TYPES || []).forEach((m) => allowedModifierTypes.add(m));
      }
      if (menuData.modifiers.some((mod) => mod.type && !allowedModifierTypes.has(mod.type))) {
        throw new AppError('Invalid modifier type', 400, mtablesConstants.ERROR_TYPES.INVALID_MODIFIER);
      }
      await ProductModifier.bulkCreate(
        menuData.modifiers.map((mod) => ({
          menu_item_id: items.find((i) => i.name === mod.itemName)?.id,
          type: mod.type,
          name: mod.name,
          price_adjustment: mod.priceAdjustment || 0.00,
          is_required: mod.isRequired || false,
        })),
        { transaction }
      );
    }

    if (menuData.attributes) {
      await ProductAttribute.bulkCreate(
        menuData.attributes.map((attr) => ({
          menu_item_id: items.find((i) => i.name === attr.itemName)?.id,
          type: attr.type,
          value: attr.value !== undefined ? attr.value : true,
        })),
        { transaction }
      );
    }

    // Create inventory alert for low stock items (non-parking merchants)
    if (!merchantTypes.includes('parking_lot') || merchantTypes.length > 1) {
      let lowStockThreshold = Infinity;
      for (const type of merchantTypes) {
        const constants = MERCHANT_TYPE_CONSTANTS[type] || merchantConstants;
        lowStockThreshold = Math.min(
          lowStockThreshold,
          constants.MUNCH_CONSTANTS?.INVENTORY_SETTINGS?.LOW_STOCK_THRESHOLD_PERCENTAGE || 15
        );
      }
      const lowStockItems = items.filter(
        (item) => item.quantity <= item.minimum_stock_level && item.quantity <= (item.minimum_stock_level * lowStockThreshold) / 100
      );
      if (lowStockItems.length > 0) {
        await InventoryAlert.bulkCreate(
          lowStockItems.map((item) => ({
            menu_item_id: item.id,
            merchant_id: merchantId,
            branch_id: item.branch_id,
            type: 'low_stock',
            details: {
              current_quantity: item.quantity,
              minimum_stock_level: item.minimum_stock_level,
            },
          })),
          { transaction }
        );
      }
    }

    // Log bulk update
    await InventoryBulkUpdate.create(
      {
        merchant_id: merchantId,
        total_items: items.length,
        successful_items: items.length,
        performed_by: merchant.user_id,
        summary: {
          categories_created: categories.length,
          items_created: items.length,
        },
      },
      { transaction }
    );

    // Create menu version snapshot
    const latestVersion = await MenuVersion.findOne({
      where: { merchant_id: merchantId },
      order: [['version_number', 'DESC']],
      transaction,
    });

    await MenuVersion.create(
      {
        merchant_id: merchantId,
        branch_id: menuData.items[0]?.branchId,
        version_number: latestVersion ? latestVersion.version_number + 1 : 1,
        menu_data: {
          categories: categories.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            parent_id: c.parent_id,
            branch_id: c.branch_id,
            image_url: c.image_url,
            icon_url: c.icon_url,
            display_order: c.display_order,
          })),
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            category_id: i.category_id,
            branch_id: i.branch_id,
            availability_status: i.availability_status,
            is_published: i.is_published,
            quantity: i.quantity,
            minimum_stock_level: i.minimum_stock_level,
            space_type: i.space_type,
            security_features: i.security_features,
            access_type: i.access_type,
            egress_type: i.egress_type,
          })),
        },
        description: `Menu creation for ${merchantTypes.join(', ')}`,
        created_by: merchant.user_id,
      },
      { transaction }
    );

    // Log bulk upload if source is bulk upload
    if (menuData.source === 'bulk_upload' && menuData.fileDetails) {
      await ProductBulkUpload.create(
        {
          merchant_id: merchantId,
          branch_id: menuData.items[0]?.branchId,
          file_name: menuData.fileDetails.fileName,
          file_url: menuData.fileDetails.fileUrl,
          file_type: menuData.fileDetails.fileType,
          status: 'completed',
          total_items: items.length,
          successful_items: items.length,
          created_by: merchant.user_id,
        },
        { transaction }
      );
    }

    logger.info(`Menu created for ${merchantTypes.join(', ')}: merchant ${merchantId}`);
    return {
      merchantId,
      itemCount: items.length,
      categoryCount: categories.length,
      language: merchant.preferred_language || 'en',
      action: 'menuCreated',
    };
  } catch (error) {
    throw handleServiceError('createMenu', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

module.exports = { createMenu };