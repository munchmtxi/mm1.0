'use strict';

const { sequelize, MerchantBranch, Media, Merchant } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const restaurantConstants = require('@constants/merchant/restaurantConstants');
const parkingLotConstants = require('@constants/merchant/parkingLotConstants');
const groceryConstants = require('@constants/merchant/groceryConstants');
const darkKitchenConstants = require('@constants/merchant/darkKitchenConstants');
const catererConstants = require('@constants/merchant/catererConstants');
const cafeConstants = require('@constants/merchant/cafeConstants');
const butcherConstants = require('@constants/merchant/butcherConstants');
const bakeryConstants = require('@constants/merchant/bakeryConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');

const typeConstantsMap = {
  restaurant: restaurantConstants,
  parking_lot: parkingLotConstants,
  grocery: groceryConstants,
  dark_kitchen: darkKitchenConstants,
  caterer: catererConstants,
  cafe: cafeConstants,
  butcher: butcherConstants,
  bakery: bakeryConstants,
};

async function getAllowedMediaTypes(merchantId) {
  const merchant = await Merchant.findByPk(merchantId);
  if (!merchant || !merchant.merchant_types || !merchant.merchant_types.length) {
    return merchantConstants.SOCIAL_MEDIA_CONSTANTS.ALLOWED_MEDIA_TYPES;
  }
  const allowedMediaTypes = new Set();
  merchant.merchant_types.forEach(type => {
    const typeConstants = typeConstantsMap[type] || merchantConstants;
    const mediaTypes = typeConstants.MUNCH_CONSTANTS?.MENU_SETTINGS?.ALLOWED_MEDIA_TYPES ||
                      merchantConstants.SOCIAL_MEDIA_CONSTANTS.ALLOWED_MEDIA_TYPES;
    mediaTypes.forEach(mt => allowedMediaTypes.add(mt));
  });
  return Array.from(allowedMediaTypes);
}

async function uploadMenuPhotos(restaurantId, photos) {
  const transaction = await sequelize.transaction();
  try {
    const branch = await MerchantBranch.findByPk(restaurantId, {
      include: [{ model: Merchant, as: 'merchant' }],
      transaction,
    });
    if (!branch) {
      throw new AppError('Branch not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    if (!photos || !Array.isArray(photos) || photos.some((photo) => !photo.originalname)) {
      throw new AppError('Invalid file data', 400, merchantConstants.ERROR_CODES[3]);
    }

    const allowedMediaTypes = await getAllowedMediaTypes(branch.merchant_id);
    const photoUrls = await Promise.all(
      photos.map(async (photo) => {
        const extension = photo.originalname.split('.').pop().toLowerCase();
        if (!allowedMediaTypes.includes(extension)) {
          throw new AppError('Invalid media type', 400, merchantConstants.ERROR_CODES[3]);
        }
        const mediaRecord = await Media.create(
          {
            branch_id: restaurantId,
            merchant_id: branch.merchant_id,
            type: 'menu_photos',
            url: photo.path,
            created_at: new Date(),
            updated_at: new Date(),
          },
          { transaction }
        );
        return { url: photo.path, mediaId: mediaRecord.id };
      })
    );

    await transaction.commit();
    logger.info('Menu photos uploaded', { restaurantId, photoCount: photoUrls.length });
    return photoUrls.map((p) => p.url);
  } catch (error) {
    await transaction.rollback();
    logger.error('Error uploading menu photos', { error: error.message });
    throw error;
  }
}

async function managePromotionalMedia(restaurantId, media) {
  const transaction = await sequelize.transaction();
  try {
    const branch = await MerchantBranch.findByPk(restaurantId, {
      include: [{ model: Merchant, as: 'merchant' }],
      transaction,
    });
    if (!branch) {
      throw new AppError('Branch not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    const { file, type } = media;
    const allowedMediaTypes = await getAllowedMediaTypes(branch.merchant_id);
    const validTypes = ['menu_photos', 'promotional_media', 'branch_media', 'banner', 'promo_video'];
    if (!validTypes.includes(type)) {
      throw new AppError('Invalid media type', 400, merchantConstants.ERROR_CODES[3]);
    }
    if (!file || !file.path || !allowedMediaTypes.includes(file.originalname.split('.').pop().toLowerCase())) {
      throw new AppError('Invalid file', 400, merchantConstants.ERROR_CODES[3]);
    }

    const mediaRecord = await Media.create(
      {
        branch_id: restaurantId,
        merchant_id: branch.merchant_id,
        type,
        url: file.path,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );

    await transaction.commit();
    logger.info('Promotional media uploaded', { restaurantId, mediaId: mediaRecord.id });
    return mediaRecord.url;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error uploading promotional media', { error: error.message });
    throw error;
  }
}

async function updateMediaMetadata(mediaId, metadata) {
  const transaction = await sequelize.transaction();
  try {
    const media = await Media.findByPk(mediaId, {
      include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }],
      transaction,
    });
    if (!media) {
      throw new AppError('Media not found', 404, merchantConstants.ERROR_CODES[3]);
    }

    const { title, description } = metadata;
    if (title && title.length > 100) {
      throw new AppError('Title too long', 400, merchantConstants.ERROR_CODES[3]);
    }
    if (description && description.length > 500) {
      throw new AppError('Description too long', 400, merchantConstants.ERROR_CODES[3]);
    }

    const updatedFields = {
      title: title || media.title,
      description: description || media.description,
      updated_at: new Date(),
    };

    await media.update(updatedFields, { transaction });
    await transaction.commit();
    logger.info('Media metadata updated', { mediaId });
    return updatedFields;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error updating media metadata', { error: error.message });
    throw error;
  }
}

async function deleteMedia(mediaId) {
  const transaction = await sequelize.transaction();
  try {
    const media = await Media.findByPk(mediaId, {
      include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }],
      transaction,
    });
    if (!media) {
      throw new AppError('Media not found', 404, merchantConstants.ERROR_CODES[3]);
    }

    await media.destroy({ transaction });
    await transaction.commit();
    logger.info('Media deleted', { mediaId });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error deleting media', { error: error.message });
    throw error;
  }
}

async function listBranchMedia(restaurantId) {
  try {
    const branch = await MerchantBranch.findByPk(restaurantId, {
      include: [{ model: Merchant, as: 'merchant' }],
    });
    if (!branch) {
      throw new AppError('Branch not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    const media = await Media.findAll({
      where: { branch_id: restaurantId },
      attributes: ['id', 'type', 'url', 'title', 'description', 'created_at', 'updated_at'],
    });

    logger.info('Branch media retrieved', { restaurantId, mediaCount: media.length });
    return media;
  } catch (error) {
    logger.error('Error listing branch media', { error: error.message });
    throw error;
  }
}

async function bulkDeleteMedia(mediaIds) {
  const transaction = await sequelize.transaction();
  try {
    const mediaRecords = await Media.findAll({
      where: { id: mediaIds },
      include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }],
      transaction,
    });

    if (mediaRecords.length !== mediaIds.length) {
      throw new AppError('Some media not found', 404, merchantConstants.ERROR_CODES[3]);
    }

    await Media.destroy({ where: { id: mediaIds }, transaction });
    await transaction.commit();
    logger.info('Media records deleted', { mediaIds });
    return { deletedCount: mediaIds.length };
  } catch (error) {
    await transaction.rollback();
    logger.error('Error bulk deleting media', { error: error.message });
    throw error;
  }
}

module.exports = {
  uploadMenuPhotos,
  managePromotionalMedia,
  updateMediaMetadata,
  deleteMedia,
  listBranchMedia,
  bulkDeleteMedia,
};