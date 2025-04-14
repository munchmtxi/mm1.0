'use strict';

const { MerchantBranch, Merchant, Address } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const mapService = require('@services/common/mapService');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  /**
   * Create a new branch profile.
   * @param {number} merchantId
   * @param {object} branchData
   * @param {object} files
   * @returns {object}
   */
  async createBranchProfile(merchantId, branchData, files = {}) {
    try {
      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      // Resolve location
      const resolvedLocation = await mapService.resolveLocation({
        placeId: branchData.placeId,
        address: branchData.address,
        coordinates: branchData.coordinates,
      });

      // Validate operating hours
      const operatingHours = branchData.operating_hours || {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const timeFormat = /^([01]\d|2[0-3]):([0-5]\d)$/;
      for (const day of days) {
        if (operatingHours[day]) {
          if (!timeFormat.test(operatingHours[day].open) || !timeFormat.test(operatingHours[day].close)) {
            throw new AppError(`Invalid time format for ${day}`, 400, 'INVALID_OPERATING_HOURS');
          }
        }
      }

      // Handle media uploads
      const media = { logo: null, banner: null, gallery: [] };
      if (files.logo) {
        media.logo = await imageService.uploadImage(merchantId, files.logo, 'logo');
      }
      if (files.banner) {
        media.banner = await imageService.uploadBannerImage(merchantId, files.banner, 'banner');
      }

      const branch = await MerchantBranch.create({
        merchant_id: merchantId,
        name: branchData.name,
        branch_code: `BR-${uuidv4().slice(0, 8)}`,
        contact_email: branchData.contact_email,
        contact_phone: branchData.contact_phone,
        address: resolvedLocation.formattedAddress,
        location: { type: 'Point', coordinates: [resolvedLocation.longitude, resolvedLocation.latitude] },
        operating_hours: operatingHours,
        delivery_radius: branchData.delivery_radius,
        payment_methods: branchData.payment_methods || [],
        media,
      });

      // Save address record
      await Address.create({
        formattedAddress: resolvedLocation.formattedAddress,
        placeId: resolvedLocation.placeId,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
        components: resolvedLocation.components,
        countryCode: resolvedLocation.countryCode,
        validationStatus: 'VALID',
        validatedAt: new Date(),
      });

      logger.logApiEvent('Branch profile created', { merchantId, branchId: branch.id });
      return branch;
    } catch (error) {
      logger.logErrorEvent('Failed to create branch profile', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to create branch', 500, 'BRANCH_CREATION_FAILED');
    }
  },

  /**
   * Retrieve a branch profile.
   * @param {number} branchId
   * @returns {object}
   */
  async getBranchProfile(branchId) {
    try {
      const branch = await MerchantBranch.findByPk(branchId, {
        include: [{ model: Merchant, as: 'merchant', attributes: ['id', 'business_name'] }],
      });
      if (!branch) {
        throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
      }

      logger.logApiEvent('Branch profile retrieved', { branchId });
      return branch;
    } catch (error) {
      logger.logErrorEvent('Failed to retrieve branch profile', { error: error.message, branchId });
      throw error instanceof AppError ? error : new AppError('Failed to retrieve branch', 500, 'BRANCH_RETRIEVAL_FAILED');
    }
  },

  /**
   * Update branch profile details.
   * @param {number} branchId
   * @param {object} branchData
   * @param {object} files
   * @returns {object}
   */
  async updateBranchProfile(branchId, branchData, files = {}) {
    try {
      const branch = await MerchantBranch.findByPk(branchId);
      if (!branch) {
        throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
      }

      // Resolve location if provided
      let resolvedLocation;
      if (branchData.address || branchData.placeId || branchData.coordinates) {
        resolvedLocation = await mapService.resolveLocation({
          placeId: branchData.placeId,
          address: branchData.address,
          coordinates: branchData.coordinates,
        });
        branchData.address = resolvedLocation.formattedAddress;
        branchData.location = { type: 'Point', coordinates: [resolvedLocation.longitude, resolvedLocation.latitude] };
      }

      // Validate operating hours
      if (branchData.operating_hours) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const timeFormat = /^([01]\d|2[0-3]):([0-5]\d)$/;
        for (const day of days) {
          if (branchData.operating_hours[day]) {
            if (!timeFormat.test(branchData.operating_hours[day].open) || !timeFormat.test(branchData.operating_hours[day].close)) {
              throw new AppError(`Invalid time format for ${day}`, 400, 'INVALID_OPERATING_HOURS');
            }
          }
        }
      }

      // Handle media updates
      const media = branch.media;
      if (files.logo) {
        if (media.logo) await imageService.deleteImage(branch.merchant_id, 'logo');
        media.logo = await imageService.uploadImage(branch.merchant_id, files.logo, 'logo');
      }
      if (files.banner) {
        if (media.banner) await imageService.deleteBannerImage(media.banner);
        media.banner = await imageService.uploadBannerImage(branch.merchant_id, files.banner, 'banner');
      }
      branchData.media = media;

      await branch.update(branchData);
      logger.logApiEvent('Branch profile updated', { branchId, updatedFields: Object.keys(branchData) });
      return branch;
    } catch (error) {
      logger.logErrorEvent('Failed to update branch profile', { error: error.message, branchId });
      throw error instanceof AppError ? error : new AppError('Failed to update branch', 500, 'BRANCH_UPDATE_FAILED');
    }
  },

  /**
   * Delete a branch profile.
   * @param {number} branchId
   * @returns {boolean}
   */
  async deleteBranchProfile(branchId) {
    try {
      const branch = await MerchantBranch.findByPk(branchId);
      if (!branch) {
        throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
      }

      // Delete associated media
      if (branch.media.logo) await imageService.deleteImage(branch.merchant_id, 'logo');
      if (branch.media.banner) await imageService.deleteBannerImage(branch.media.banner);

      await branch.destroy();
      logger.logApiEvent('Branch profile deleted', { branchId });
      return true;
    } catch (error) {
      logger.logErrorEvent('Failed to delete branch profile', { error: error.message, branchId });
      throw error instanceof AppError ? error : new AppError('Failed to delete branch', 500, 'BRANCH_DELETION_FAILED');
    }
  },

  /**
   * List all branches for a merchant.
   * @param {number} merchantId
   * @returns {array}
   */
  async listBranchProfiles(merchantId) {
    try {
      const branches = await MerchantBranch.findAll({
        where: { merchant_id: merchantId },
        attributes: ['id', 'name', 'address', 'contact_email', 'contact_phone', 'is_active'],
      });

      logger.logApiEvent('Branch profiles listed', { merchantId, count: branches.length });
      return branches;
    } catch (error) {
      logger.logErrorEvent('Failed to list branch profiles', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to list branches', 500, 'BRANCH_LIST_FAILED');
    }
  },

  /**
   * Bulk update multiple branch profiles.
   * @param {number} merchantId
   * @param {array} updateData
   * @returns {array}
   */
  async bulkUpdateBranches(merchantId, updateData) {
    const transaction = await sequelize.transaction();
    try {
      const merchant = await Merchant.findByPk(merchantId, { transaction });
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      const allowedFields = ['operating_hours', 'payment_methods', 'delivery_radius', 'is_active'];
      const updatedBranches = [];

      for (const update of updateData) {
        const { branchId, ...data } = update;
        const branch = await MerchantBranch.findByPk(branchId, { transaction });
        if (!branch || branch.merchant_id !== merchantId) {
          throw new AppError(`Invalid branch ID: ${branchId}`, 400, 'INVALID_BRANCH');
        }

        // Filter allowed fields
        const filteredData = {};
        for (const [key, value] of Object.entries(data)) {
          if (allowedFields.includes(key)) {
            filteredData[key] = value;
          }
        }

        // Validate operating hours if provided
        if (filteredData.operating_hours) {
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const timeFormat = /^([01]\d|2[0-3]):([0-5]\d)$/;
          for (const day of days) {
            if (filteredData.operating_hours[day]) {
              if (!timeFormat.test(filteredData.operating_hours[day].open) || !timeFormat.test(filteredData.operating_hours[day].close)) {
                throw new AppError(`Invalid time format for ${day} in branch ${branchId}`, 400, 'INVALID_OPERATING_HOURS');
              }
            }
          }
        }

        await branch.update(filteredData, { transaction });
        updatedBranches.push(branch);
      }

      await transaction.commit();
      logger.logApiEvent('Branches bulk updated', { merchantId, count: updatedBranches.length });
      return updatedBranches;
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to bulk update branches', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to bulk update branches', 500, 'BRANCH_BULK_UPDATE_FAILED');
    }
  },
};