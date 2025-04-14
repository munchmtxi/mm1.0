'use strict';

const { Merchant, MerchantBanner } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const imageService = require('@services/common/imageService');

module.exports = {
  /**
   * Update merchant media assets (logo, banner, storefront URL).
   * @param {number} merchantId
   * @param {object} mediaData
   * @param {object} files
   * @returns {object}
   */
  async updateMerchantMedia(merchantId, mediaData, files = {}) {
    try {
      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      const updates = {};
      if (files.logo) {
        if (merchant.logo_url) await imageService.deleteImage(merchantId, 'logo');
        updates.logo_url = await imageService.uploadImage(merchantId, files.logo, 'logo');
      }
      if (files.banner) {
        if (merchant.banner_url) await imageService.deleteBannerImage(merchant.banner_url);
        const bannerUrl = await imageService.uploadBannerImage(merchantId, files.banner, 'banner');
        updates.banner_url = bannerUrl;

        // Save to MerchantBanner
        await MerchantBanner.create({
          merchant_id: merchantId,
          banner_url: bannerUrl,
          title: `Banner for ${merchant.business_name}`,
          season_start: new Date(),
          season_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          created_by: merchant.user_id,
        });
      }
      if (mediaData.storefront_url) {
        updates.storefront_url = mediaData.storefront_url;
      }

      if (Object.keys(updates).length === 0) {
        throw new AppError('No valid media fields provided', 400, 'INVALID_MEDIA_FIELDS');
      }

      await merchant.update(updates);
      logger.logApiEvent('Merchant media updated', { merchantId, updatedFields: Object.keys(updates) });
      return updates;
    } catch (error) {
      logger.logErrorEvent('Failed to update merchant media', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to update media', 500, 'MEDIA_UPDATE_FAILED');
    }
  },
};